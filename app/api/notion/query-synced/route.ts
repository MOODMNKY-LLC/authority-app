import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * Query synced Notion data from PostgreSQL
 * This provides fast access to cached Notion content
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { query, type, limit = 50 } = body

    if (!query && !type) {
      return NextResponse.json(
        {
          success: false,
          error: "query or type required",
        },
        { status: 400 },
      )
    }

    let results: any[] = []

    // If query provided, use full-text search
    if (query) {
      const { data, error } = await supabase.rpc("search_notion_content", {
        p_user_id: user.id,
        p_search_query: query,
      })

      if (error) {
        console.error("[Authority] Error searching synced content:", error)
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 500 },
        )
      }

      results = (data || []).slice(0, limit)
    } else if (type) {
      // Type-specific queries
      switch (type) {
        case "character":
          const { data: chars, error: charError } = await supabase
            .from("notion_characters_sync")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(limit)

          if (charError) throw charError
          results = chars || []
          break

        case "world":
          const { data: worlds, error: worldError } = await supabase
            .from("notion_worlds_sync")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(limit)

          if (worldError) throw worldError
          results = worlds || []
          break

        case "story":
          const { data: stories, error: storyError } = await supabase
            .from("notion_stories_sync")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(limit)

          if (storyError) throw storyError
          results = stories || []
          break

        default:
          return NextResponse.json(
            {
              success: false,
              error: `Unknown type: ${type}. Use 'character', 'world', or 'story'`,
            },
            { status: 400 },
          )
      }
    }

    // Check data freshness
    const oldestSync = results.length > 0
      ? Math.min(...results.map((r: any) => new Date(r.last_synced_at || r.updated_at).getTime()))
      : Date.now()
    const ageMinutes = (Date.now() - oldestSync) / (1000 * 60)
    const isStale = ageMinutes > 15

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      is_stale: isStale,
      age_minutes: Math.round(ageMinutes),
      message: isStale
        ? "Data may be stale. Consider triggering a sync."
        : "Data is fresh.",
    })
  } catch (error: any) {
    console.error("[Authority] Error querying synced Notion data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to query synced data",
      },
      { status: 500 },
    )
  }
}


