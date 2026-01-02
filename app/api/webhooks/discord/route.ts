import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, data, userId, webhookUrl } = body

    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL required" }, { status: 400 })
    }

    // Build Discord embed based on event type
    const embed: any = {
      color: 0x8b0000, // Dark red for Authority
      timestamp: new Date().toISOString(),
    }

    switch (event) {
      case "character_created":
        embed.title = "New Character Created"
        embed.description = `**${data.name}** has been added to your world`
        embed.fields = [
          { name: "Role", value: data.role || "Unknown", inline: true },
          { name: "Species", value: data.species || "Unknown", inline: true },
        ]
        embed.thumbnail = { url: data.portrait_url || "" }
        break

      case "world_created":
        embed.title = "New World Created"
        embed.description = `**${data.name}** - ${data.premise || "No description"}`
        embed.fields = [
          { name: "Technology Level", value: data.technology_level || "Unknown", inline: true },
          { name: "Theme", value: data.theme || "Unknown", inline: true },
        ]
        embed.image = { url: data.map_url || "" }
        break

      case "story_created":
        embed.title = "New Story Created"
        embed.description = `**${data.title}** - ${data.premise || "No premise"}`
        embed.fields = [
          { name: "Genre", value: data.genre || "Unknown", inline: true },
          { name: "Status", value: data.status || "Concept", inline: true },
        ]
        break

      case "chat_completed":
        embed.title = "Chat Session Completed"
        embed.description = `Session: ${data.session_title || "Untitled"}`
        embed.fields = [
          { name: "Messages", value: String(data.message_count || 0), inline: true },
          { name: "Model", value: data.model || "Unknown", inline: true },
        ]
        break

      default:
        embed.title = "Authority Event"
        embed.description = `Event: ${event}`
    }

    // Send to Discord
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Authority",
        avatar_url: "https://your-avatar-url.png", // Add your Authority logo
        embeds: [embed],
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send to Discord")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Discord webhook error:", error)
    return NextResponse.json({ error: "Failed to send webhook" }, { status: 500 })
  }
}
