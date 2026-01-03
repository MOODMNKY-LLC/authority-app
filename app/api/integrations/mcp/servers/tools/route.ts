import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"
import { listMCPTools } from "@/lib/mcp/generic-client"

/**
 * List tools for a specific MCP server
 * Uses generic MCP client that handles SSE parsing and proper protocol
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
    const { serverId } = body

    if (!serverId) {
      return NextResponse.json({ error: "Server ID required" }, { status: 400 })
    }

    // Get server config
    const { data: settings } = await supabase
      .from("user_settings")
      .select("mcp_config")
      .eq("user_id", user.id)
      .single()

    const config = settings?.mcp_config || {}
    const serverConfig = config[serverId]

    if (!serverConfig?.enabled) {
      return NextResponse.json({
        tools: [],
        error: "Server not enabled",
        connected: false,
        serverId,
      })
    }

    // Get server endpoint from config (stored when enabled) or use default from mcp-installation.md
    const serverEndpoints: Record<string, string> = {
      notion: process.env.MCP_NOTION_URL || "https://notion-mcp.moodmnky.com/mcp",
      firecrawl: process.env.MCP_FIRECRAWL_URL || "https://firecrawl-mcp.moodmnky.com/mcp",
      supabase: process.env.MCP_SUPABASE_URL || "https://supabase-mcp.moodmnky.com/mcp",
      fetch: process.env.MCP_FETCH_URL || "https://fetch-mcp.moodmnky.com/mcp",
      filesystem: process.env.MCP_FILESYSTEM_URL || "https://filesystem-mcp.moodmnky.com/mcp",
      memory: process.env.MCP_MEMORY_URL || "https://memory-mcp.moodmnky.com/mcp",
      n8n: process.env.MCP_N8N_URL || "https://n8n-mcp.moodmnky.com/mcp",
      magic: process.env.MCP_MAGIC_URL || "https://magic-mcp.moodmnky.com/mcp",
      magicui: process.env.MCP_MAGICUI_URL || "https://magicui-mcp.moodmnky.com/mcp",
      brave: process.env.MCP_BRAVE_URL || "https://brave-mcp.moodmnky.com/mcp",
      tavily: process.env.MCP_TAVILY_URL || "https://tavily-mcp.moodmnky.com/mcp",
      github: process.env.MCP_GITHUB_URL || "https://github-mcp.moodmnky.com/mcp",
      "sequential-thinking": process.env.MCP_SEQUENTIAL_THINKING_URL || "https://sequential-thinking-mcp.moodmnky.com/mcp",
    }

    // Prefer endpoint from config (if server was enabled and endpoint stored), otherwise use default
    const endpoint = serverConfig?.endpoint || serverEndpoints[serverId]
    if (!endpoint) {
      return NextResponse.json({
        tools: [],
        error: `Unknown server type: ${serverId}`,
        connected: false,
        serverId,
      })
    }

    // Prepare headers - Notion needs Bearer token
    const headers: Record<string, string> = {}
    if (serverId === "notion") {
      // Priority 1: Server-level auth token (if MCP server requires its own auth token)
      // This is used when server runs with --auth-token flag
      const serverAuthToken = process.env.MCP_NOTION_SERVER_AUTH_TOKEN
      
      if (serverAuthToken) {
        // Server requires its own auth token (server handles Notion API calls internally)
        headers["Authorization"] = `Bearer ${serverAuthToken}`
      } else {
        // Priority 2: User's Notion token (if server doesn't require auth token)
        // Try to get Notion token from user settings
        const { data: notionSettings } = await supabase
          .from("user_settings")
          .select("notion_access_token, notion_token")
          .eq("user_id", user.id)
          .single()

        // Self-hosted Notion MCP servers may accept integration tokens
        // Try OAuth first, then fall back to integration token
        let notionToken =
          notionSettings?.notion_access_token ||
          process.env.MCP_NOTION_TOKEN

        // If OAuth token fails, try integration token (for self-hosted servers)
        if (!notionToken && notionSettings?.notion_token) {
          try {
            notionToken = decryptApiKey(notionSettings.notion_token)
          } catch (error) {
            console.error("[Notion MCP] Failed to decrypt integration token:", error)
          }
        }

        if (notionToken) {
          headers["Authorization"] = `Bearer ${notionToken}`
        } else {
          return NextResponse.json({
            tools: [],
            error: "Notion authentication required. Please add your Notion OAuth or integration token, or configure MCP_NOTION_SERVER_AUTH_TOKEN.",
            connected: false,
            serverId,
          })
        }
      }
    }

    // Use generic MCP client to list tools (handles SSE parsing automatically)
    let tools: any[] = []
    let error: string | null = null
    let connected: boolean = false

    try {
      tools = await listMCPTools({
        url: endpoint,
        headers,
      })

      console.log(`[MCP ${serverId}] Successfully retrieved ${tools.length} tools`)
      connected = true
    } catch (err: any) {
      console.error(`[MCP ${serverId}] Error listing tools:`, err)
      error = err.message || "Failed to list tools"
      connected = false
    }

    return NextResponse.json({
      tools: tools || [],
      connected: connected && tools.length > 0 && !error,
      error: error || null,
      serverId,
    })
  } catch (error: any) {
    console.error("[Authority] Error listing MCP server tools:", error)
    return NextResponse.json(
      {
        tools: [],
        connected: false,
        error: error.message || "Failed to list tools",
        serverId: body?.serverId || "unknown",
      },
      { status: 500 }
    )
  }
}

