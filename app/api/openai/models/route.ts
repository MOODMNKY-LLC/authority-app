import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-openai-key") || process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 400 })
    }

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Filter for chat models only and sort by most recent
    const chatModels = data.data
      .filter((model: any) => model.id.includes("gpt") || model.id.includes("o1") || model.id.includes("o3"))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        created: model.created,
      }))
      .sort((a: any, b: any) => b.created - a.created)

    return NextResponse.json({ models: chatModels })
  } catch (error: any) {
    console.error("[v0] Error fetching OpenAI models:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch models" }, { status: 500 })
  }
}
