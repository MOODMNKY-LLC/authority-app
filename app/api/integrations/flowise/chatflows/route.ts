import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"

// Hardcoded Flowise host from environment
let FLOWISE_HOST = process.env.NEXT_PUBLIC_FLOWISE_HOST || process.env.FLOWISE_HOST || "https://flowise.ai"
// Ensure host has protocol
if (!FLOWISE_HOST.startsWith("http://") && !FLOWISE_HOST.startsWith("https://")) {
  FLOWISE_HOST = `https://${FLOWISE_HOST}`
}

export async function GET(request: NextRequest) {
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
      .select("flowise_api_key")
      .eq("user_id", user.id)
      .single()

    if (!settings?.flowise_api_key) {
      return NextResponse.json(
        { error: "Flowise API key not configured" },
        { status: 400 }
      )
    }

    // Decrypt API key
    const apiKey = await decryptApiKey(settings.flowise_api_key)
    if (!apiKey) {
      return NextResponse.json(
        { error: "Failed to decrypt API key" },
        { status: 500 }
      )
    }

    // Fetch chatflows from Flowise API
    const response = await fetch(`${FLOWISE_HOST}/api/v1/chatflows`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Flowise API error: ${response.status} ${response.statusText}`)
    }

    const chatflows = await response.json()

    return NextResponse.json({ chatflows })
  } catch (error: any) {
    console.error("[Authority] Error fetching Flowise chatflows:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch chatflows" },
      { status: 500 }
    )
  }
}

