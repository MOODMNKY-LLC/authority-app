import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json()
    const supabase = await createServerClient()

    const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", "default_user").single()

    const apiKey = settings?.elevenlabs_api_key || process.env.ELEVENLABS_API_KEY
    const selectedVoiceId = voiceId || settings?.selected_voice || "EXAVITQu4vr4xnSDxMaL"

    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured. Please add it in settings." },
        { status: 500 },
      )
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] ElevenLabs error:", error)
      return NextResponse.json({ error: "Failed to generate speech" }, { status: response.status })
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    })
  } catch (error) {
    console.error("[v0] TTS error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
