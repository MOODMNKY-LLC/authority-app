import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encryptApiKey, decryptApiKey } from "@/lib/encryption"

/**
 * Get all available MCP servers and their configurations
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

    // Get user's MCP config and auth status
    const { data: settings } = await supabase
      .from("user_settings")
      .select("mcp_config, notion_access_token, notion_token")
      .eq("user_id", user.id)
      .single()

    const config = settings?.mcp_config || {}
    const hasNotionToken = !!(settings?.notion_access_token || settings?.notion_token)

    // Define all available MCP servers from mcp-installation.md
    const servers = [
      {
        id: "notion",
        name: "Notion",
        description: "Notion workspace integration via MCP server",
        requiresAuth: true,
        authType: "oauth_or_token",
        enabled: config.notion?.enabled || false,
        hasAuth: hasNotionToken,
        transport: "http",
        endpoint: process.env.MCP_NOTION_URL || "https://notion-mcp.moodmnky.com/mcp",
      },
      {
        id: "firecrawl",
        name: "Firecrawl",
        description: "Web scraping and crawling service",
        requiresAuth: false,
        authType: "none",
        enabled: config.firecrawl?.enabled || false,
        hasAuth: true, // No auth required
        transport: "http",
        endpoint: process.env.MCP_FIRECRAWL_URL || "https://firecrawl-mcp.moodmnky.com/mcp",
      },
      {
        id: "supabase",
        name: "Supabase",
        description: "Supabase database operations and RLS policies",
        requiresAuth: false,
        authType: "none",
        enabled: config.supabase?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_SUPABASE_URL || "https://supabase-mcp.moodmnky.com/mcp",
      },
      {
        id: "fetch",
        name: "Fetch",
        description: "HTTP fetch and URL content retrieval",
        requiresAuth: false,
        authType: "none",
        enabled: config.fetch?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_FETCH_URL || "https://fetch-mcp.moodmnky.com/mcp",
      },
      {
        id: "filesystem",
        name: "Filesystem",
        description: "File and directory operations",
        requiresAuth: false,
        authType: "none",
        enabled: config.filesystem?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_FILESYSTEM_URL || "https://filesystem-mcp.moodmnky.com/mcp",
      },
      {
        id: "memory",
        name: "Memory",
        description: "Memory and context management",
        requiresAuth: false,
        authType: "none",
        enabled: config.memory?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_MEMORY_URL || "https://memory-mcp.moodmnky.com/mcp",
      },
      {
        id: "n8n",
        name: "N8n",
        description: "N8n workflow automation",
        requiresAuth: false,
        authType: "none",
        enabled: config.n8n?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_N8N_URL || "https://n8n-mcp.moodmnky.com/mcp",
      },
      {
        id: "magic",
        name: "Magic",
        description: "Magic UI components (@21st-dev/magic)",
        requiresAuth: false,
        authType: "none",
        enabled: config.magic?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_MAGIC_URL || "https://magic-mcp.moodmnky.com/mcp",
      },
      {
        id: "magicui",
        name: "MagicUI",
        description: "MagicUI components and utilities",
        requiresAuth: false,
        authType: "none",
        enabled: config.magicui?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_MAGICUI_URL || "https://magicui-mcp.moodmnky.com/mcp",
      },
      {
        id: "brave",
        name: "Brave Search",
        description: "Web search powered by Brave Search API",
        requiresAuth: false,
        authType: "none",
        enabled: config.brave?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_BRAVE_URL || "https://brave-mcp.moodmnky.com/mcp",
      },
      {
        id: "tavily",
        name: "Tavily",
        description: "AI-powered search and research API",
        requiresAuth: false,
        authType: "none",
        enabled: config.tavily?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_TAVILY_URL || "https://tavily-mcp.moodmnky.com/mcp",
      },
      {
        id: "github",
        name: "GitHub",
        description: "GitHub repository operations, issues, and PRs",
        requiresAuth: false,
        authType: "none",
        enabled: config.github?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_GITHUB_URL || "https://github-mcp.moodmnky.com/mcp",
      },
      {
        id: "sequential-thinking",
        name: "Sequential Thinking",
        description: "Structured problem-solving and analysis",
        requiresAuth: false,
        authType: "none",
        enabled: config["sequential-thinking"]?.enabled || false,
        hasAuth: true,
        transport: "http",
        endpoint: process.env.MCP_SEQUENTIAL_THINKING_URL || "https://sequential-thinking-mcp.moodmnky.com/mcp",
      },
    ]

    return NextResponse.json({ servers })
  } catch (error: any) {
    console.error("[Authority] Error fetching MCP servers:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch MCP servers" },
      { status: 500 }
    )
  }
}

/**
 * Update MCP server configuration
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
    const { serverId, enabled, apiKey } = body

    if (!serverId) {
      return NextResponse.json({ error: "Server ID required" }, { status: 400 })
    }

    // Get current config
    const { data: settings } = await supabase
      .from("user_settings")
      .select("mcp_config")
      .eq("user_id", user.id)
      .single()

    const currentConfig = settings?.mcp_config || {}

    // Update server config for any server
    // Get endpoint from environment or use defaults from mcp-installation.md
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

    const endpoint = serverEndpoints[serverId]
    if (!endpoint) {
      return NextResponse.json(
        { error: `Server "${serverId}" is not supported. Available servers: ${Object.keys(serverEndpoints).join(", ")}` },
        { status: 400 }
      )
    }

    // Update the server config
    const updatedConfig = {
      ...currentConfig,
      [serverId]: {
        enabled: enabled === true,
        server: serverId,
        endpoint, // Store endpoint URL for reference
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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Error updating MCP server:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update MCP server" },
      { status: 500 }
    )
  }
}

