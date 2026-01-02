import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// Notion API base URL
const NOTION_API = "https://api.notion.com/v1"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { contentType, contentId, notionToken, databaseId } = body

    if (!notionToken || !databaseId) {
      return NextResponse.json(
        {
          error: "Notion token and database ID required",
        },
        { status: 400 },
      )
    }

    // Fetch content from Supabase based on type
    let content
    let notionProperties

    switch (contentType) {
      case "character":
        const { data: character } = await supabase
          .from("characters")
          .select("*")
          .eq("id", contentId)
          .eq("user_id", user.id)
          .single()

        if (!character) {
          return NextResponse.json({ error: "Character not found" }, { status: 404 })
        }

        notionProperties = {
          "Character Name": {
            title: [{ text: { content: character.name || "Untitled" } }],
          },
          "User ID": {
            rich_text: [{ text: { content: user.id } }],
          },
          "Supabase ID": {
            rich_text: [{ text: { content: character.id } }],
          },
          Role: character.role
            ? {
                select: { name: character.role },
              }
            : undefined,
          Age: character.age ? { number: character.age } : undefined,
          "Species/Race": character.species
            ? {
                rich_text: [{ text: { content: character.species } }],
              }
            : undefined,
          Description: character.description
            ? {
                rich_text: [{ text: { content: character.description.slice(0, 2000) } }],
              }
            : undefined,
          Backstory: character.backstory
            ? {
                rich_text: [{ text: { content: character.backstory.slice(0, 2000) } }],
              }
            : undefined,
          Motivations: character.motivations
            ? {
                rich_text: [{ text: { content: character.motivations.slice(0, 2000) } }],
              }
            : undefined,
          Goals: character.goals
            ? {
                rich_text: [{ text: { content: character.goals.slice(0, 2000) } }],
              }
            : undefined,
          "Portrait URL": character.image_url
            ? {
                url: character.image_url,
              }
            : undefined,
        }
        break

      case "world":
        const { data: world } = await supabase
          .from("worlds")
          .select("*")
          .eq("id", contentId)
          .eq("user_id", user.id)
          .single()

        if (!world) {
          return NextResponse.json({ error: "World not found" }, { status: 404 })
        }

        notionProperties = {
          "World Name": {
            title: [{ text: { content: world.name || "Untitled" } }],
          },
          "User ID": {
            rich_text: [{ text: { content: user.id } }],
          },
          "Supabase ID": {
            rich_text: [{ text: { content: world.id } }],
          },
          "Concept/Premise": world.concept
            ? {
                rich_text: [{ text: { content: world.concept.slice(0, 2000) } }],
              }
            : undefined,
          Geography: world.geography
            ? {
                rich_text: [{ text: { content: world.geography.slice(0, 2000) } }],
              }
            : undefined,
          "Cultures & Civilizations": world.cultures
            ? {
                rich_text: [{ text: { content: world.cultures.slice(0, 2000) } }],
              }
            : undefined,
          "Political Systems": world.political_systems
            ? {
                rich_text: [{ text: { content: world.political_systems.slice(0, 2000) } }],
              }
            : undefined,
          "Map URL": world.map_url
            ? {
                url: world.map_url,
              }
            : undefined,
        }
        break

      case "story":
        const { data: story } = await supabase
          .from("stories")
          .select("*")
          .eq("id", contentId)
          .eq("user_id", user.id)
          .single()

        if (!story) {
          return NextResponse.json({ error: "Story not found" }, { status: 404 })
        }

        notionProperties = {
          "Story Title": {
            title: [{ text: { content: story.title || "Untitled" } }],
          },
          "User ID": {
            rich_text: [{ text: { content: user.id } }],
          },
          "Supabase ID": {
            rich_text: [{ text: { content: story.id } }],
          },
          Premise: story.premise
            ? {
                rich_text: [{ text: { content: story.premise.slice(0, 2000) } }],
              }
            : undefined,
          "Plot Structure": story.plot_structure
            ? {
                rich_text: [{ text: { content: story.plot_structure.slice(0, 2000) } }],
              }
            : undefined,
          Status: story.status
            ? {
                select: { name: story.status },
              }
            : undefined,
          "Target Word Count": story.target_word_count
            ? {
                number: story.target_word_count,
              }
            : undefined,
        }
        break

      case "chat":
        const { data: messages } = await supabase
          .from("chat_hub_messages")
          .select("*")
          .eq("session_id", contentId)
          .order("createdAt", { ascending: true })

        if (!messages || messages.length === 0) {
          return NextResponse.json({ error: "Chat session not found" }, { status: 404 })
        }

        // Build transcript
        const transcript = messages
          .map((msg) => `**${msg.role === "user" ? "You" : "Authority"}:** ${msg.content}`)
          .join("\n\n")

        notionProperties = {
          "Session Title": {
            title: [{ text: { content: `Chat Session ${new Date().toLocaleDateString()}` } }],
          },
          "User ID": {
            rich_text: [{ text: { content: user.id } }],
          },
          "Supabase Session ID": {
            rich_text: [{ text: { content: contentId } }],
          },
          "Message Count": {
            number: messages.length,
          },
          "Raw Transcript": {
            rich_text: [{ text: { content: transcript.slice(0, 2000) } }],
          },
          Status: {
            select: { name: "Active" },
          },
        }
        break

      default:
        return NextResponse.json({ error: "Invalid content type" }, { status: 400 })
    }

    // Remove undefined properties
    Object.keys(notionProperties).forEach((key) => {
      if (notionProperties[key] === undefined) {
        delete notionProperties[key]
      }
    })

    // Create page in Notion
    const notionResponse = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: notionProperties,
      }),
    })

    if (!notionResponse.ok) {
      const error = await notionResponse.json()
      console.error("[v0] Notion API error:", error)
      return NextResponse.json(
        {
          error: "Failed to create Notion page",
          details: error,
        },
        { status: notionResponse.status },
      )
    }

    const notionPage = await notionResponse.json()

    // Store the Notion page ID in Supabase for future reference
    const tableName = contentType === "chat" ? "chat_hub_sessions" : `${contentType}s`
    await supabase.from(tableName).update({ notion_page_id: notionPage.id }).eq("id", contentId)

    return NextResponse.json({
      success: true,
      notionPageId: notionPage.id,
      notionUrl: notionPage.url,
    })
  } catch (error) {
    console.error("[v0] Error syncing to Notion:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
