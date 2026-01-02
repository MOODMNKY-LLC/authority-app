import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import { Client } from "@notionhq/client"
import { getNotionToken } from "@/lib/notion/get-token"

export async function POST(request: NextRequest) {
  try {
    const { contentType, contentId, notionToken: providedToken } = await request.json()

    // Get Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use provided token OR get from settings (prioritizes integration token)
    const notionToken = providedToken || await getNotionToken(user.id)

    if (!notionToken) {
      return NextResponse.json(
        { 
          error: "Notion token required",
          message: "Please add your Notion integration token in Settings",
          suggestion: "Create integration at notion.so/my-integrations"
        },
        { status: 400 }
      )
    }

    // Initialize Notion client with token
    const notion = new Client({ auth: notionToken })

    // Fetch content from Supabase based on type
    let content, notionPage

    switch (contentType) {
      case "character":
        const { data: character } = await supabase.from("characters").select("*").eq("id", contentId).single()

        if (!character) throw new Error("Character not found")

        // Find Characters database
        const characterDbId = await findDatabase(notion, "Characters")
        if (!characterDbId) throw new Error("Characters database not found in Notion")

        // Create page in Notion
        notionPage = await notion.pages.create({
          parent: { database_id: characterDbId },
          properties: {
            "Character Name": { title: [{ text: { content: character.name || "Unnamed Character" } }] },
            "User ID": { rich_text: [{ text: { content: user.id } }] },
            "Supabase ID": { rich_text: [{ text: { content: character.id } }] },
            Age: character.age ? { number: character.age } : undefined,
            Description: character.description
              ? { rich_text: [{ text: { content: character.description } }] }
              : undefined,
            Role: character.role ? { select: { name: character.role } } : undefined,
          },
        })

        // Update Supabase with Notion page ID
        await supabase.from("characters").update({ notion_page_id: notionPage.id }).eq("id", contentId)

        break

      case "world":
        const { data: world } = await supabase.from("worlds").select("*").eq("id", contentId).single()

        if (!world) throw new Error("World not found")

        const worldDbId = await findDatabase(notion, "Worlds")
        if (!worldDbId) throw new Error("Worlds database not found in Notion")

        notionPage = await notion.pages.create({
          parent: { database_id: worldDbId },
          properties: {
            "World Name": { title: [{ text: { content: world.name || "Unnamed World" } }] },
            "User ID": { rich_text: [{ text: { content: user.id } }] },
            "Supabase ID": { rich_text: [{ text: { content: world.id } }] },
            "Concept/Premise": world.description
              ? { rich_text: [{ text: { content: world.description } }] }
              : undefined,
          },
        })

        await supabase.from("worlds").update({ notion_page_id: notionPage.id }).eq("id", contentId)

        break

      case "story":
        const { data: story } = await supabase.from("stories").select("*").eq("id", contentId).single()

        if (!story) throw new Error("Story not found")

        const storyDbId = await findDatabase(notion, "Stories")
        if (!storyDbId) throw new Error("Stories database not found in Notion")

        notionPage = await notion.pages.create({
          parent: { database_id: storyDbId },
          properties: {
            "Story Title": { title: [{ text: { content: story.title || "Untitled Story" } }] },
            "User ID": { rich_text: [{ text: { content: user.id } }] },
            "Supabase ID": { rich_text: [{ text: { content: story.id } }] },
            Premise: story.premise ? { rich_text: [{ text: { content: story.premise } }] } : undefined,
          },
        })

        await supabase.from("stories").update({ notion_page_id: notionPage.id }).eq("id", contentId)

        break

      case "chat":
        const { data: session } = await supabase
          .from("chat_hub_sessions")
          .select("*, chat_hub_messages(*)")
          .eq("id", contentId)
          .single()

        if (!session) throw new Error("Chat session not found")

        const chatDbId = await findDatabase(notion, "Chat Sessions")
        if (!chatDbId) throw new Error("Chat Sessions database not found in Notion")

        // Build transcript
        const transcript = session.chat_hub_messages.map((msg: any) => `${msg.role}: ${msg.content}`).join("\n\n")

        notionPage = await notion.pages.create({
          parent: { database_id: chatDbId },
          properties: {
            "Session Title": {
              title: [{ text: { content: `Chat ${new Date(session.createdAt).toLocaleDateString()}` } }],
            },
            "User ID": { rich_text: [{ text: { content: user.id } }] },
            "Supabase Session ID": { rich_text: [{ text: { content: session.id } }] },
            "Message Count": { number: session.chat_hub_messages.length },
            "Raw Transcript": { rich_text: [{ text: { content: transcript.substring(0, 2000) } }] },
          },
        })

        await supabase.from("chat_hub_sessions").update({ notion_page_id: notionPage.id }).eq("id", contentId)

        break

      default:
        throw new Error("Invalid content type")
    }

    return NextResponse.json({
      success: true,
      notionPageId: notionPage.id,
      message: "Content added to Notion successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error adding content to Notion:", error)
    return NextResponse.json({ error: error.message || "Failed to add content to Notion" }, { status: 500 })
  }
}

async function findDatabase(notion: Client, databaseName: string): Promise<string | null> {
  try {
    const response = await notion.search({
      filter: { property: "object", value: "database" },
      query: databaseName,
    })

    const db = response.results.find((result: any) => result.title?.[0]?.plain_text?.includes(databaseName))

    return db?.id || null
  } catch (error) {
    console.error(`[v0] Error finding ${databaseName} database:`, error)
    return null
  }
}
