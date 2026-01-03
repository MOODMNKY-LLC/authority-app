import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Toggle Notion MCP enabled/disabled state
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { enabled } = body

    // Get current MCP config
    const { data: settings } = await supabase
      .from("user_settings")
      .select("mcp_config")
      .eq("user_id", user.id)
      .single()

    const currentConfig = settings?.mcp_config || {}
    
    // Update Notion MCP config
    const updatedConfig = {
      ...currentConfig,
      notion: {
        enabled: enabled === true,
        server: "notion",
        config: {},
      },
    }

    // Save updated config
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          mcp_config: updatedConfig,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (error) throw error

    return NextResponse.json({ success: true, enabled })
  } catch (error: any) {
    console.error("[Authority] Error toggling Notion MCP:", error)
    return NextResponse.json(
      { error: error.message || "Failed to toggle Notion MCP" },
      { status: 500 }
    )
  }
}

/**
 * Get Notion MCP status
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get MCP config
    const { data: settings } = await supabase
      .from("user_settings")
      .select("mcp_config")
      .eq("user_id", user.id)
      .single()

    const config = settings?.mcp_config || {}
    const notionConfig = config.notion || {}

    // Check for Notion token
    const { data: notionSettings } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token")
      .eq("user_id", user.id)
      .single()

    const hasToken = !!(notionSettings?.notion_access_token || notionSettings?.notion_token)

    return NextResponse.json({
      enabled: notionConfig.enabled || false,
      hasToken,
      tokenType: notionSettings?.notion_access_token ? "oauth" : notionSettings?.notion_token ? "integration" : null,
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching Notion MCP status:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch Notion MCP status" },
      { status: 500 }
    )
  }
}


