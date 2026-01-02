import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

const NOTION_API = "https://api.notion.com/v1"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { query, notionToken, filter } = await request.json()

    if (!notionToken) {
      return NextResponse.json(
        {
          error: "Notion token required",
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
      results: results.results,
    })
  } catch (error) {
    console.error("[v0] Error searching Notion:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
