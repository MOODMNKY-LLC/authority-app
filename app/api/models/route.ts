import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Fetch OpenAI models via Vercel AI Gateway
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch OpenAI models")
    }

    const data = await response.json()

    // Filter and format OpenAI models
    const openaiModels = data.data
      .filter((model: { id: string }) => model.id.includes("gpt"))
      .map((model: { id: string }) => ({
        id: `openai/${model.id}`,
        name: model.id,
        provider: "OpenAI",
      }))

    // Fetch Ollama models
    let ollamaModels: { id: string; name: string; provider: string }[] = []
    try {
      const ollamaResponse = await fetch("http://10.3.0.113:11434/api/tags", {
        signal: AbortSignal.timeout(3000), // 3 second timeout
      })

      if (ollamaResponse.ok) {
        const contentType = ollamaResponse.headers.get("content-type")
        if (contentType?.includes("application/json")) {
          const ollamaData = await ollamaResponse.json()
          ollamaModels =
            ollamaData.models?.map((model: { name: string }) => ({
              id: `ollama/${model.name}`,
              name: model.name,
              provider: "Ollama (Local)",
            })) || []
        } else {
          console.log("[v0] Ollama returned non-JSON response")
        }
      }
    } catch (error) {
      console.log("[v0] Ollama not available:", error instanceof Error ? error.message : "Unknown error")
    }

    // Combine all models
    const allModels = [
      ...openaiModels,
      ...ollamaModels,
      // Add some default models in case API calls fail
      {
        id: "openai/gpt-4o",
        name: "gpt-4o",
        provider: "OpenAI",
      },
      {
        id: "openai/gpt-4o-mini",
        name: "gpt-4o-mini",
        provider: "OpenAI",
      },
      {
        id: "openai/gpt-4-turbo",
        name: "gpt-4-turbo",
        provider: "OpenAI",
      },
    ]

    // Remove duplicates
    const uniqueModels = Array.from(new Map(allModels.map((m) => [m.id, m])).values())

    return NextResponse.json({ models: uniqueModels })
  } catch (error) {
    console.error("[v0] Error fetching models:", error)
    // Return default models if API fails
    return NextResponse.json({
      models: [
        {
          id: "openai/gpt-4o",
          name: "gpt-4o",
          provider: "OpenAI",
        },
        {
          id: "openai/gpt-4o-mini",
          name: "gpt-4o-mini",
          provider: "OpenAI",
        },
        {
          id: "openai/gpt-4-turbo",
          name: "gpt-4-turbo",
          provider: "OpenAI",
        },
      ],
    })
  }
}
