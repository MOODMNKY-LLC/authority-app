import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

const FORGE_TO_DATABASE_MAP: Record<string, string> = {
  character: "Characters",
  world: "Worlds",
  storyline: "Stories",
  story: "Stories",
  magic: "Magic Systems",
  faction: "Factions & Organizations",
  lore: "Lore & History",
}

const FORGE_TO_TABLE_MAP: Record<string, string> = {
  character: "notion_characters_sync",
  world: "notion_worlds_sync",
  storyline: "notion_stories_sync",
  story: "notion_stories_sync",
  magic: "notion_pages_sync",
  faction: "notion_pages_sync",
  lore: "notion_pages_sync",
}

/**
 * Load an existing item's data for editing
 * Fetches from sync table and formats for form
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const forgeType = searchParams.get("forgeType")
    const notionPageId = searchParams.get("notionPageId")

    if (!forgeType || !notionPageId) {
      return NextResponse.json(
        {
          success: false,
          error: "forgeType and notionPageId are required",
        },
        { status: 400 },
      )
    }

    const databaseName = FORGE_TO_DATABASE_MAP[forgeType]
    const tableName = FORGE_TO_TABLE_MAP[forgeType]

    if (!databaseName || !tableName) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown forgeType: ${forgeType}`,
        },
        { status: 400 },
      )
    }

    // Get item from sync table
    let query = supabase
      .from(tableName)
      .select("*")
      .eq("user_id", user.id)
      .eq("notion_page_id", notionPageId)
      .single()

    if (tableName === "notion_pages_sync") {
      query = query.eq("database_name", databaseName)
    }

    const { data: item, error } = await query

    if (error || !item) {
      return NextResponse.json(
        {
          success: false,
          error: "Item not found",
        },
        { status: 404 },
      )
    }

    // Get database schema to properly format properties
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not connected",
        },
        { status: 200 },
      )
    }

    const notionToken = settings.notion_access_token || settings.notion_token
    const databases = settings.notion_databases || {}
    const databaseId = databases[databaseName]

    if (!notionToken || !databaseId) {
      return NextResponse.json(
        {
          success: false,
          error: "Database not found",
        },
        { status: 200 },
      )
    }

    const notion = new Client({
      auth: notionToken,
    })

    // Get database schema
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    })

    // Format properties for form
    const formData: Record<string, any> = {}
    const properties = item.properties || {}

    Object.entries(database.properties).forEach(([propertyName, property]: [string, any]) => {
      const propValue = properties[propertyName]

      if (!propValue) {
        // Set default based on type
        if (property.type === "multi_select") {
          formData[propertyName] = []
        } else if (property.type === "checkbox") {
          formData[propertyName] = false
        } else {
          formData[propertyName] = ""
        }
        return
      }

      switch (property.type) {
        case "title":
          formData[propertyName] =
            propValue.title?.map((t: any) => t.plain_text).join("") || ""
          break

        case "rich_text":
          formData[propertyName] =
            propValue.rich_text?.map((t: any) => t.plain_text).join("") || ""
          break

        case "number":
          formData[propertyName] = propValue.number || ""
          break

        case "select":
          formData[propertyName] = propValue.select?.name || ""
          break

        case "multi_select":
          formData[propertyName] =
            propValue.multi_select?.map((s: any) => s.name) || []
          break

        case "date":
          formData[propertyName] = propValue.date || null
          break

        case "checkbox":
          formData[propertyName] = propValue.checkbox || false
          break

        case "url":
          formData[propertyName] = propValue.url || ""
          break

        case "email":
          formData[propertyName] = propValue.email || ""
          break

        case "phone_number":
          formData[propertyName] = propValue.phone_number || ""
          break

        default:
          formData[propertyName] = ""
      }
    })

    return NextResponse.json({
      success: true,
      formData,
      notionPageId: item.notion_page_id,
      databaseId: item.notion_database_id,
      forgeType,
    })
  } catch (error: any) {
    console.error("[Authority] Error in load-item:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to load item",
      },
      { status: 500 },
    )
  }
}



