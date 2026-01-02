import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-elevenlabs-key") || process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 400 })
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`)
    }

    const data = await response.json()

    const voices = data.voices.map((voice: any) => ({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category || "general",
      description: voice.description || "",
      labels: voice.labels || {},
    }))

    return NextResponse.json({ voices })
  } catch (error: any) {
    console.error("[v0] Error fetching ElevenLabs voices:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch voices" }, { status: 500 })
  }
}
