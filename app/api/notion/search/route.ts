import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getNotionToken } from "@/lib/notion/get-token"

const NOTION_API = "https://api.notion.com/v1"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { query, notionToken: providedToken, filter, use_sync = true } = await request.json()

    // If use_sync is true and query provided, try synced data first
    if (use_sync && query) {
      try {
        const { data: syncedResults, error: syncError } = await supabase.rpc("search_notion_content", {
          p_user_id: user.id,
          p_search_query: query,
        })

        if (!syncError && syncedResults && syncedResults.length > 0) {
          // Check if data is fresh (< 15 minutes old)
          const oldestSync = Math.min(
            ...syncedResults.map((r: any) => new Date(r.last_synced_at || r.updated_at).getTime())
          )
          const ageMinutes = (Date.now() - oldestSync) / (1000 * 60)

          if (ageMinutes < 15) {
            // Data is fresh, return synced results
            return NextResponse.json({
              success: true,
              results: syncedResults,
              source: "synced",
              count: syncedResults.length,
            })
          }
          // Data is stale, continue to Notion API search
        }
      } catch (syncErr) {
        // If sync query fails, fall back to Notion API
        console.warn("[Authority] Sync query failed, falling back to Notion API:", syncErr)
      }
    }

    // Fall back to Notion API search
    // Use provided token OR get from settings (prioritizes integration token)
    const notionToken = providedToken || await getNotionToken(user.id)

    if (!notionToken) {
      return NextResponse.json(
        {
          error: "Notion token required",
          message: "Please add your Notion integration token in Settings",
          suggestion: "Create integration at notion.so/my-integrations"
        },
        { status: 400 },
      )
    }

    // Search Notion
    const notionResponse = await fetch(`${NOTION_API}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        query: query || "",
        filter: filter || { property: "object", value: "page" },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time",
        },
      }),
    })

    if (!notionResponse.ok) {
      const error = await notionResponse.json()
      return NextResponse.json(
        {
          error: "Failed to search Notion",
          details: error,
        },
        { status: notionResponse.status },
      )
    }

    const results = await notionResponse.json()

    return NextResponse.json({
      success: true,
      source: "notion_api",
      results: results.results,
      count: results.results?.length || 0,
    })
  } catch (error) {
    console.error("[Authority] Error searching Notion:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
