import { type NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-google-key")

    if (!apiKey) {
      return NextResponse.json({ error: "Google API key required" }, { status: 401 })
    }

    // Fetch voices from Google Cloud Text-to-Speech API
    const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`)

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform and categorize voices
    const voices =
      data.voices?.map((voice: any) => ({
        name: voice.name,
        language: voice.languageCodes?.[0] || "en-US",
        languages: voice.languageCodes || [],
        gender: voice.ssmlGender,
        type: voice.name.includes("Neural2")
          ? "Neural2"
          : voice.name.includes("Wavenet")
            ? "WaveNet"
            : voice.name.includes("Studio")
              ? "Studio"
              : voice.name.includes("Chirp")
                ? "Chirp 3"
                : "Standard",
        naturalSampleRateHertz: voice.naturalSampleRateHertz,
      })) || []

    return NextResponse.json({
      voices,
      count: voices.length,
    })
  } catch (error: any) {
    console.error("Error fetching Google voices:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
