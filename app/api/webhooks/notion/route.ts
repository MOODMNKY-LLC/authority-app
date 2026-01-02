import { type NextRequest, NextResponse } from "next/server"
import { Client } from "@notionhq/client"

export async function POST(request: NextRequest) {
  try {
    const { event, data, userId, notionApiKey, databaseId } = await request.json()

    if (!notionApiKey || !databaseId) {
      return NextResponse.json({ error: "Notion API key and database ID required" }, { status: 400 })
    }

    const notion = new Client({ auth: notionApiKey })

    let properties: any = {}

    switch (event) {
      case "character_created":
        properties = {
          "Character Name": { title: [{ text: { content: data.name } }] },
          "User ID": { rich_text: [{ text: { content: userId } }] },
          "Supabase ID": { rich_text: [{ text: { content: data.id } }] },
          Description: { rich_text: [{ text: { content: data.description || "" } }] },
          Role: { select: { name: data.role || "Supporting" } },
        }
        if (data.portrait_url) {
          properties["Portrait URL"] = { url: data.portrait_url }
        }
        break

      case "world_created":
        properties = {
          "World Name": { title: [{ text: { content: data.name } }] },
          "User ID": { rich_text: [{ text: { content: userId } }] },
          "Supabase ID": { rich_text: [{ text: { content: data.id } }] },
          "Concept/Premise": { rich_text: [{ text: { content: data.premise || "" } }] },
        }
        if (data.technology_level) {
          properties["Technology Level"] = { select: { name: data.technology_level } }
        }
        break

      case "story_created":
        properties = {
          "Story Title": { title: [{ text: { content: data.title } }] },
          "User ID": { rich_text: [{ text: { content: userId } }] },
          "Supabase ID": { rich_text: [{ text: { content: data.id } }] },
          Premise: { rich_text: [{ text: { content: data.premise || "" } }] },
          Status: { select: { name: data.status || "Concept" } },
        }
        break

      default:
        return NextResponse.json({ error: "Unknown event type" }, { status: 400 })
    }

    // Create page in Notion database
    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    })

    return NextResponse.json({ success: true, pageId: page.id })
  } catch (error) {
    console.error("Notion webhook error:", error)
    return NextResponse.json({ error: "Failed to create Notion page" }, { status: 500 })
  }
}
