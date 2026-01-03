import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"

// Hardcoded N8n host from environment
let N8N_HOST = process.env.NEXT_PUBLIC_N8N_HOST || process.env.N8N_HOST || "https://slade-n8n.moodmnky.com"
// Ensure host has protocol
if (!N8N_HOST.startsWith("http://") && !N8N_HOST.startsWith("https://")) {
  N8N_HOST = `https://${N8N_HOST}`
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
      .select("n8n_api_key")
      .eq("user_id", user.id)
      .single()

    if (!settings?.n8n_api_key) {
      return NextResponse.json(
        { error: "N8n API key must be configured" },
        { status: 400 }
      )
    }

    // Decrypt API key
    const apiKey = await decryptApiKey(settings.n8n_api_key)
    if (!apiKey) {
      return NextResponse.json(
        { error: "Failed to decrypt API key" },
        { status: 500 }
      )
    }

    // Fetch workflows from N8n API
    const response = await fetch(`${N8N_HOST}/api/v1/workflows`, {
      headers: {
        "X-N8N-API-KEY": apiKey,
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`N8n API error: ${response.status} ${response.statusText}`)
    }

    const workflows = await response.json()

    return NextResponse.json({ workflows })
  } catch (error: any) {
    console.error("[Authority] Error fetching N8n workflows:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch workflows" },
      { status: 500 }
    )
  }
}

