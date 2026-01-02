export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const baseUrl = searchParams.get("baseUrl") || "https://ollama.moodmnky.com"

    console.log("[v0] Fetching Ollama models from:", baseUrl)

    const response = await fetch(`${baseUrl}/api/tags`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] Ollama API error:", response.status, response.statusText)
      return Response.json({ error: `Ollama API returned ${response.status}` }, { status: response.status })
    }

    const text = await response.text()
    console.log("[v0] Ollama raw response:", text.substring(0, 200))

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error("[v0] Ollama returned non-JSON response:", text.substring(0, 500))
      return Response.json({ error: "Ollama returned non-JSON response", response: text }, { status: 500 })
    }

    const models =
      data.models?.map((m: any) => ({
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
        digest: m.digest,
      })) || []

    console.log("[v0] Ollama models fetched:", models.length)

    return Response.json({ models })
  } catch (error) {
    console.error("[v0] Error fetching Ollama models:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Ollama models" },
      { status: 500 },
    )
  }
}
