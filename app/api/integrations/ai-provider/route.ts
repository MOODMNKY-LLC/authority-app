import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encryptApiKey, decryptApiKey } from "@/lib/encryption"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("ai_provider, ai_api_key, ai_provider_verified, ai_provider_user_info")
      .eq("user_id", user.id)
      .single()

    // Decrypt API key if present
    let decryptedKey = null
    if (settings?.ai_api_key) {
      try {
        decryptedKey = await decryptApiKey(settings.ai_api_key)
      } catch (error) {
        console.error("[Authority] Error decrypting AI API key:", error)
      }
    }

    return NextResponse.json({
      provider: settings?.ai_provider || "openai",
      apiKey: decryptedKey ? "••••••••" : null, // Return masked key for display
      verified: settings?.ai_provider_verified || false,
      userInfo: settings?.ai_provider_user_info || null,
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching AI provider settings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch AI provider settings" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey } = body

    // Prepare update object - explicitly clear old values when saving new key
    const updateData: any = {
      user_id: user.id,
      ai_provider: provider || "openai",
      updated_at: new Date().toISOString(),
    }

    // Encrypt API key before storage
    if (apiKey && apiKey.trim() !== "") {
      // New key provided - encrypt and save, clear old verification status
      updateData.ai_api_key = await encryptApiKey(apiKey)
      updateData.ai_provider_verified = false // Clear verification until new key is verified
      updateData.ai_provider_user_info = null // Clear old user info
    } else {
      // Empty/null key - explicitly clear everything
      updateData.ai_api_key = null
      updateData.ai_provider_verified = false
      updateData.ai_provider_user_info = null
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(updateData, { onConflict: "user_id" })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Error saving AI provider settings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save AI provider settings" },
      { status: 500 }
    )
  }
}

