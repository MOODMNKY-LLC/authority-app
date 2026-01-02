import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

const NOTION_API = "https://api.notion.com/v1"

// Get user's Notion database IDs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Notion token from user settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_token, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (!settings || !settings.notion_token) {
      return NextResponse.json(
        {
          error: "Notion not configured",
          configured: false,
        },
        { status: 200 },
      )
    }

    return NextResponse.json({
      success: true,
      configured: true,
      databases: settings.notion_databases || {},
    })
  } catch (error) {
    console.error("[v0] Error fetching Notion config:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

// Save user's Notion database IDs
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

    const { notionToken, databases } = await request.json()

    // Validate token by making a test request
    if (notionToken) {
      const testResponse = await fetch(`${NOTION_API}/users/me`, {
        headers: {
          Authorization: `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
        },
      })

      if (!testResponse.ok) {
        return NextResponse.json(
          {
            error: "Invalid Notion token",
          },
          { status: 400 },
        )
      }
    }

    // Update user settings
    const { error: updateError } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      notion_token: notionToken,
      notion_databases: databases || {},
    })

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving Notion config:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
