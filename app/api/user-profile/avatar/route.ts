import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 },
      )
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    // Check if bucket exists first (with retry logic for service startup)
    // Note: We verify bucket exists in DB, but Storage API might have sync delays
    let buckets: any[] | null = null
    let listError: any = null
    let retries = 3
    
    while (retries > 0) {
      const result = await supabase.storage.listBuckets()
      listError = result.error
      buckets = result.data
      
      if (!listError && buckets) {
        break
      }
      
      // If it's a 502 error, wait and retry (service might be starting)
      if (listError?.status === 502 || listError?.statusCode === 502) {
        console.warn(`[Authority] Storage service not ready (502), retrying... (${retries} attempts left)`)
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
        retries--
        continue
      }
      
      // For other errors, break immediately
      break
    }
    
    // Even if listBuckets fails or returns empty, try to upload anyway
    // The bucket exists in the database (created via migration), so the upload should work
    // Storage API might have temporary sync issues, but the actual storage backend should work
    if (listError) {
      console.warn("[Authority] Could not list buckets via API, but proceeding with upload (bucket exists in DB):", listError.message)
      // Don't fail here - the bucket exists in the database, so upload should still work
    }
    
    const avatarsBucket = buckets?.find((b) => b.id === "avatars")
    if (!avatarsBucket && !listError) {
      // Only warn if we successfully listed buckets but avatars wasn't there
      console.warn("[Authority] Avatars bucket not found in API list, but proceeding (bucket exists in DB). Available buckets:", buckets?.map((b) => b.id) || "none")
      // Don't fail - bucket exists in DB, API might just be out of sync
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("[Authority] Avatar upload error:", uploadError)
      
      // Provide more helpful error messages based on error type
      if (uploadError.status === 502 || uploadError.statusCode === 502) {
        return NextResponse.json(
          {
            error: "Storage service unavailable. Please try again in a few seconds.",
            details: "The storage service may be starting up. If this persists, restart Supabase with: supabase stop && supabase start",
          },
          { status: 503 },
        )
      }
      
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Avatars bucket not found. Please run the database migration.",
            details: "Run: supabase migration up",
          },
          { status: 500 },
        )
      }
      
      return NextResponse.json(
        {
          error: uploadError.message || "Upload failed",
          details: "Please check your file size (max 5MB) and file type (JPEG, PNG, WebP, GIF only).",
        },
        { status: 500 },
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName)

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )

    if (updateError) {
      console.error("[Authority] Profile update error:", updateError)
      // Don't fail the request if profile update fails, avatar is still uploaded
    }

    return NextResponse.json({
      url: publicUrl,
      path: fileName,
    })
  } catch (error: any) {
    console.error("[Authority] Avatar upload error:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get current profile to find avatar path
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .single()

    if (profile?.avatar_url) {
      // Extract path from URL
      const urlParts = profile.avatar_url.split("/avatars/")
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        const { error: deleteError } = await supabase.storage.from("avatars").remove([filePath])
        if (deleteError) {
          console.error("[Authority] Avatar delete error:", deleteError)
        }
      }
    }

    // Update profile to remove avatar URL
    const { error: updateError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          avatar_url: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )

    if (updateError) {
      console.error("[Authority] Profile update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Avatar delete error:", error)
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 })
  }
}

