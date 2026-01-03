import { NextRequest, NextResponse } from "next/server"

/**
 * Test all MCP servers from mcp-installation.md
 * Verifies each server is functional and returns tool lists
 */

interface MCPServer {
  id: string
  name: string
  url: string
  requiresAuth: boolean
  authHeader?: string
}

const MCP_SERVERS: MCPServer[] = [
  {
    id: "notion",
    name: "Notion",
    url: process.env.MCP_NOTION_URL || "https://notion-mcp.moodmnky.com/mcp",
    requiresAuth: true,
    authHeader: `Bearer ${process.env.MCP_NOTION_TOKEN || "ntn_h87200563322kIxmXHtz1C2dKPwuAnsja69XIXeRGtdeTT"}`,
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    url: process.env.MCP_FIRECRAWL_URL || "https://firecrawl-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "supabase",
    name: "Supabase",
    url: process.env.MCP_SUPABASE_URL || "https://supabase-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "fetch",
    name: "Fetch",
    url: process.env.MCP_FETCH_URL || "https://fetch-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "filesystem",
    name: "Filesystem",
    url: process.env.MCP_FILESYSTEM_URL || "https://filesystem-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "memory",
    name: "Memory",
    url: process.env.MCP_MEMORY_URL || "https://memory-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "n8n",
    name: "N8n",
    url: process.env.MCP_N8N_URL || "https://n8n-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "magic",
    name: "Magic",
    url: process.env.MCP_MAGIC_URL || "https://magic-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "magicui",
    name: "MagicUI",
    url: process.env.MCP_MAGICUI_URL || "https://magicui-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "brave",
    name: "Brave Search",
    url: process.env.MCP_BRAVE_URL || "https://brave-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "tavily",
    name: "Tavily",
    url: process.env.MCP_TAVILY_URL || "https://tavily-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "github",
    name: "GitHub",
    url: process.env.MCP_GITHUB_URL || "https://github-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
  {
    id: "sequential-thinking",
    name: "Sequential Thinking",
    url: process.env.MCP_SEQUENTIAL_THINKING_URL || "https://sequential-thinking-mcp.moodmnky.com/mcp",
    requiresAuth: false,
  },
]

interface JSONRPCRequest {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: any
}

interface JSONRPCResponse {
  jsonrpc: "2.0"
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

async function testMCPServer(server: MCPServer): Promise<{
  serverId: string
  serverName: string
  success: boolean
  toolCount?: number
  tools?: any[]
  error?: string
  responseTime?: number
}> {
  const startTime = Date.now()
  
  try {
    // Step 1: Initialize
    const initRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: `init-${Date.now()}`,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: "authority-app",
          version: "1.0.0",
        },
      },
    }

    const initHeaders: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }

    if (server.authHeader) {
      initHeaders["Authorization"] = server.authHeader
    }

    const initResponse = await fetch(server.url, {
      method: "POST",
      headers: initHeaders,
      body: JSON.stringify(initRequest),
    })

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      return {
        serverId: server.id,
        serverName: server.name,
        success: false,
        error: `Initialize failed: ${initResponse.status} ${initResponse.statusText}`,
        responseTime: Date.now() - startTime,
      }
    }

    const initData: JSONRPCResponse = await initResponse.json()
    if (initData.error) {
      return {
        serverId: server.id,
        serverName: server.name,
        success: false,
        error: `Initialize error: ${initData.error.message} (code: ${initData.error.code})`,
        responseTime: Date.now() - startTime,
      }
    }

    // Step 2: List Tools
    const toolsRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: `tools-${Date.now()}`,
      method: "tools/list",
      params: {},
    }

    const toolsResponse = await fetch(server.url, {
      method: "POST",
      headers: initHeaders,
      body: JSON.stringify(toolsRequest),
    })

    if (!toolsResponse.ok) {
      const errorText = await toolsResponse.text()
      return {
        serverId: server.id,
        serverName: server.name,
        success: false,
        error: `Tools/list failed: ${toolsResponse.status} ${toolsResponse.statusText}`,
        responseTime: Date.now() - startTime,
      }
    }

    const toolsData: JSONRPCResponse = await toolsResponse.json()
    if (toolsData.error) {
      return {
        serverId: server.id,
        serverName: server.name,
        success: false,
        error: `Tools/list error: ${toolsData.error.message} (code: ${toolsData.error.code})`,
        responseTime: Date.now() - startTime,
      }
    }

    const tools = toolsData.result?.tools || []
    const responseTime = Date.now() - startTime

    return {
      serverId: server.id,
      serverName: server.name,
      success: true,
      toolCount: tools.length,
      tools: tools.map((t: any) => ({
        name: t.name,
        description: t.description,
      })),
      responseTime,
    }
  } catch (error: any) {
    return {
      serverId: server.id,
      serverName: server.name,
      success: false,
      error: `Exception: ${error.message}`,
      responseTime: Date.now() - startTime,
    }
  }
}

export async function GET() {
  try {
    console.log("[MCP Test] Testing all MCP servers...")

    const results = await Promise.all(
      MCP_SERVERS.map((server) => testMCPServer(server))
    )

    const successful = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    console.log(`[MCP Test] Results: ${successful.length}/${results.length} successful`)

    return NextResponse.json({
      success: true,
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      results: results.map((r) => ({
        serverId: r.serverId,
        serverName: r.serverName,
        success: r.success,
        toolCount: r.toolCount || 0,
        error: r.error,
        responseTime: r.responseTime,
      })),
    })
  } catch (error: any) {
    console.error("[MCP Test] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to test MCP servers",
      },
      { status: 500 }
    )
  }
}

