import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encryptApiKey, decryptApiKey } from "@/lib/encryption"

// Hardcoded Flowise host from environment
let FLOWISE_HOST = process.env.NEXT_PUBLIC_FLOWISE_HOST || process.env.FLOWISE_HOST || "https://flowise.ai"
// Ensure host has protocol
if (!FLOWISE_HOST.startsWith("http://") && !FLOWISE_HOST.startsWith("https://")) {
  FLOWISE_HOST = `https://${FLOWISE_HOST}`
}

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
      .select("flowise_api_key, flowise_verified, flowise_user_info")
      .eq("user_id", user.id)
      .single()

    // Decrypt API key if present
    let decryptedKey = null
    if (settings?.flowise_api_key) {
      try {
        decryptedKey = await decryptApiKey(settings.flowise_api_key)
      } catch (error) {
        console.error("[Authority] Error decrypting Flowise API key:", error)
      }
    }

    return NextResponse.json({
      apiKey: decryptedKey ? "••••••••" : null, // Return masked key for display
      baseUrl: FLOWISE_HOST, // Hardcoded from .env
      verified: settings?.flowise_verified || false,
      userInfo: settings?.flowise_user_info || null,
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching Flowise settings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch Flowise settings" },
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
    const { apiKey } = body

    // Prepare update object - explicitly clear old values when saving new key
    const updateData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    // Encrypt API key before storage
    if (apiKey && apiKey.trim() !== "") {
      // New key provided - encrypt and save, clear old verification status
      updateData.flowise_api_key = await encryptApiKey(apiKey)
      updateData.flowise_verified = false // Clear verification until new key is verified
      updateData.flowise_user_info = null // Clear old user info
    } else {
      // Empty/null key - explicitly clear everything
      updateData.flowise_api_key = null
      updateData.flowise_verified = false
      updateData.flowise_user_info = null
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(updateData, { onConflict: "user_id" })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Error saving Flowise settings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save Flowise settings" },
      { status: 500 }
    )
  }
}

