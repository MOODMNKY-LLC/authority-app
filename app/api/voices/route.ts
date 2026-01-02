import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", "default_user").single()

    const apiKey = settings?.elevenlabs_api_key || process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured. Please add it in settings." },
        { status: 500 },
      )
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch voices" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data.voices || [])
  } catch (error) {
    console.error("[v0] Error fetching voices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
