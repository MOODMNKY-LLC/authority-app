import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * Query existing items from Notion sync tables for a specific Forge type
 * Used to populate the "Link Existing" dropdown in Forge builders
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

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
    const databaseId = searchParams.get("databaseId")
    const search = searchParams.get("search") || ""
    const limit = parseInt(searchParams.get("limit") || "50")

    if (!forgeType) {
      return NextResponse.json(
        {
          success: false,
          error: "forgeType parameter required",
        },
        { status: 400 },
      )
    }

    let items: any[] = []
    let queryError: any = null

    // Map Forge types to sync tables
    switch (forgeType) {
      case "character": {
        let query = supabase
          .from("notion_characters_sync")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(limit)

        if (databaseId) {
          query = query.eq("notion_database_id", databaseId)
        }

        if (search) {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data, error } = await query
        queryError = error
        if (data) {
          items = data.map((item) => ({
            id: item.id,
            notion_page_id: item.notion_page_id,
            notion_database_id: item.notion_database_id,
            title: item.name || "Untitled Character",
            description: item.description || "",
            properties: item.properties || {},
            last_synced_at: item.last_synced_at,
            updated_at: item.updated_at,
          }))
        }
        break
      }

      case "world": {
        let query = supabase
          .from("notion_worlds_sync")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(limit)

        if (databaseId) {
          query = query.eq("notion_database_id", databaseId)
        }

        if (search) {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data, error } = await query
        queryError = error
        if (data) {
          items = data.map((item) => ({
            id: item.id,
            notion_page_id: item.notion_page_id,
            notion_database_id: item.notion_database_id,
            title: item.name || "Untitled World",
            description: item.description || "",
            properties: item.properties || {},
            last_synced_at: item.last_synced_at,
            updated_at: item.updated_at,
          }))
        }
        break
      }

      case "storyline":
      case "story": {
        let query = supabase
          .from("notion_stories_sync")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(limit)

        if (databaseId) {
          query = query.eq("notion_database_id", databaseId)
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data, error } = await query
        queryError = error
        if (data) {
          items = data.map((item) => ({
            id: item.id,
            notion_page_id: item.notion_page_id,
            notion_database_id: item.notion_database_id,
            title: item.title || "Untitled Story",
            description: item.description || "",
            properties: item.properties || {},
            last_synced_at: item.last_synced_at,
            updated_at: item.updated_at,
          }))
        }
        break
      }

      case "magic":
      case "faction":
      case "lore": {
        // These use the generic notion_pages_sync table
        const databaseNameMap: Record<string, string> = {
          magic: "Magic Systems",
          faction: "Factions & Organizations",
          lore: "Lore & History",
        }

        const databaseName = databaseNameMap[forgeType]
        if (!databaseName) {
          return NextResponse.json(
            {
              success: false,
              error: `Unknown forgeType: ${forgeType}`,
            },
            { status: 400 },
          )
        }

        let query = supabase
          .from("notion_pages_sync")
          .select("*")
          .eq("user_id", user.id)
          .eq("database_name", databaseName)
          .order("updated_at", { ascending: false })
          .limit(limit)

        if (databaseId) {
          query = query.eq("notion_database_id", databaseId)
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
        }

        const { data, error } = await query
        queryError = error
        if (data) {
          items = data.map((item) => {
            const props = item.properties || {}
            const name = item.title || props["Name"] || props["Title"] || "Untitled"
            return {
              id: item.id,
              notion_page_id: item.notion_page_id,
              notion_database_id: item.notion_database_id,
              title: name,
              description: item.content || props["Description"] || props["Overview"] || "",
              properties: props,
              last_synced_at: item.last_synced_at,
              updated_at: item.updated_at,
            }
          })
        }
        break
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported forgeType: ${forgeType}`,
          },
          { status: 400 },
        )
    }

    if (queryError) {
      console.error("[Authority] Error querying items:", queryError)
      return NextResponse.json(
        {
          success: false,
          error: queryError.message || "Failed to query items",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      items: items || [],
      count: items.length,
      forgeType,
    })
  } catch (error: any) {
    console.error("[Authority] Error in query-items:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to query items",
      },
      { status: 500 },
    )
  }
}



