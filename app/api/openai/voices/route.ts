import { type NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

// OpenAI Realtime API voices (as of 2025)
const OPENAI_VOICES = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced voice" },
  { id: "ash", name: "Ash", description: "Clear and articulate voice" },
  { id: "ballad", name: "Ballad", description: "Smooth and melodic voice" },
  { id: "coral", name: "Coral", description: "Warm and friendly voice" },
  { id: "echo", name: "Echo", description: "Deep resonant voice" },
  { id: "fable", name: "Fable", description: "Storytelling voice with character" },
  { id: "onyx", name: "Onyx", description: "Deep authoritative voice" },
  { id: "nova", name: "Nova", description: "Energetic youthful voice" },
  { id: "sage", name: "Sage", description: "Wise and thoughtful voice" },
  { id: "shimmer", name: "Shimmer", description: "Bright and clear voice" },
  { id: "verse", name: "Verse", description: "Expressive narrative voice" },
  { id: "marin", name: "Marin", description: "Natural conversational voice (Realtime exclusive)" },
  { id: "cedar", name: "Cedar", description: "Grounded natural voice (Realtime exclusive)" },
]

export async function GET(request: NextRequest) {
  try {
    // Return the static list of OpenAI voices
    return NextResponse.json({
      voices: OPENAI_VOICES,
      count: OPENAI_VOICES.length,
    })
  } catch (error: any) {
    console.error("Error fetching OpenAI voices:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
