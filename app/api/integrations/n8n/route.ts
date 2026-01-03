import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encryptApiKey, decryptApiKey } from "@/lib/encryption"

// Hardcoded N8n host from environment
let N8N_HOST = process.env.NEXT_PUBLIC_N8N_HOST || process.env.N8N_HOST || "https://slade-n8n.moodmnky.com"
// Ensure host has protocol
if (!N8N_HOST.startsWith("http://") && !N8N_HOST.startsWith("https://")) {
  N8N_HOST = `https://${N8N_HOST}`
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
      .select("n8n_api_key, n8n_verified, n8n_user_info")
      .eq("user_id", user.id)
      .single()

    // Decrypt API key if present
    let decryptedKey = null
    if (settings?.n8n_api_key) {
      try {
        decryptedKey = await decryptApiKey(settings.n8n_api_key)
      } catch (error) {
        console.error("[Authority] Error decrypting N8n API key:", error)
      }
    }

    return NextResponse.json({
      apiKey: decryptedKey ? "••••••••" : null, // Return masked key for display
      baseUrl: N8N_HOST, // Hardcoded from .env
      verified: settings?.n8n_verified || false,
      userInfo: settings?.n8n_user_info || null,
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching N8n settings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch N8n settings" },
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
      updateData.n8n_api_key = await encryptApiKey(apiKey)
      updateData.n8n_verified = false // Clear verification until new key is verified
      updateData.n8n_user_info = null // Clear old user info
    } else {
      // Empty/null key - explicitly clear everything
      updateData.n8n_api_key = null
      updateData.n8n_verified = false
      updateData.n8n_user_info = null
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(updateData, { onConflict: "user_id" })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Error saving N8n settings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save N8n settings" },
      { status: 500 }
    )
  }
}

