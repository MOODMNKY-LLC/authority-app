import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
 * Fetch database content for a specific Forge type
 * Returns paginated items from sync tables
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
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""

    if (!forgeType) {
      return NextResponse.json(
        {
          success: false,
          error: "forgeType parameter required",
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

    const offset = (page - 1) * limit

    // Build query based on Forge type
    let query = supabase
      .from(tableName)
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Add database name filter for generic pages table
    if (tableName === "notion_pages_sync") {
      query = query.eq("database_name", databaseName)
    }

    // Add search filter
    if (search) {
      if (tableName === "notion_characters_sync" || tableName === "notion_worlds_sync") {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      } else if (tableName === "notion_stories_sync") {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
      } else {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
      }
    }

    const { data, error, count } = await query

    if (error) {
      console.error("[Authority] Error fetching database content:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to fetch content",
        },
        { status: 500 },
      )
    }

    // Transform data to consistent format
    const items = (data || []).map((item: any) => {
      const props = item.properties || {}
      
      // Extract title based on table type
      let title = ""
      if (tableName === "notion_characters_sync" || tableName === "notion_worlds_sync") {
        title = item.name || "Untitled"
      } else if (tableName === "notion_stories_sync") {
        title = item.title || "Untitled Story"
      } else {
        title = item.title || props["Name"] || props["Title"] || "Untitled"
      }

      // Extract description
      let description = ""
      if (item.description) {
        description = item.description
      } else {
        description = props["Description"] || props["Overview"] || props["Concept"] || ""
        if (typeof description === "object" && description.rich_text) {
          description = description.rich_text.map((t: any) => t.plain_text).join("")
        }
      }

      return {
        id: item.id,
        notion_page_id: item.notion_page_id,
        notion_database_id: item.notion_database_id,
        title,
        description,
        properties: props,
        created_at: item.created_at,
        updated_at: item.updated_at,
        last_synced_at: item.last_synced_at,
      }
    })

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      forgeType,
      databaseName,
    })
  } catch (error: any) {
    console.error("[Authority] Error in database-content:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch database content",
      },
      { status: 500 },
    )
  }
}



