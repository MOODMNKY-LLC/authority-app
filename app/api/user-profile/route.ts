import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ profile: null })
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) throw error

    if (!profile) {
      // Check if this is the first user (will be auto-assigned admin by trigger)
      const { count } = await supabase.from("user_profiles").select("*", { count: "exact", head: true })
      const isFirstUser = (count || 0) === 0

      console.log("[Authority] Creating user profile:", { 
        userId: user.id, 
        email: user.email, 
        isFirstUser 
      })

      const { data: newProfile, error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: user.id,
          email: user.email || "",
          display_name: user.email?.split("@")[0] || "User",
          avatar_url: null,
          bio: null,
          role: isFirstUser ? "admin" : "pending", // First user gets admin, others get pending
        })
        .select()
        .single()

      if (insertError) {
        console.error("[Authority] Error creating default profile:", insertError)
        return NextResponse.json({ profile: null })
      }

      if (isFirstUser || newProfile.role === "admin") {
        console.log("[Authority] ✅ First user automatically assigned admin role:", {
          userId: user.id,
          role: newProfile.role
        })
      }

      return NextResponse.json({ profile: newProfile })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("[Authority] Error fetching user profile:", error)
    return NextResponse.json({ profile: null })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()

    // Build update object, only including fields that are provided
    const updateData: any = {
      user_id: user.id, // Always use authenticated user's ID
      updated_at: new Date().toISOString(),
    }

    // Only include fields that are provided in the request
    if (body.email !== undefined) updateData.email = body.email
    if (body.display_name !== undefined) updateData.display_name = body.display_name
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url
    if (body.bio !== undefined) updateData.bio = body.bio

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .upsert(updateData, {
        onConflict: "user_id",
      })
      .select()
      .single()

    if (error) {
      console.error("[Authority] Error updating user profile:", error)
      throw error
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    console.error("[Authority] Error updating user profile:", error)
    return NextResponse.json(
      { 
        error: "Failed to update user profile",
        details: error.message || "Unknown error"
      }, 
      { status: 500 }
    )
  }
}
