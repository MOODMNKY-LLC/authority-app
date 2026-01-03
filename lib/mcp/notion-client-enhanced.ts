/**
 * Enhanced Notion MCP Client
 * Properly implements Streamable HTTP transport and OAuth token handling
 * @see https://developers.notion.com/docs/get-started-with-mcp
 */

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

interface MCPTool {
  name: string
  description?: string
  inputSchema?: {
    type?: string
    properties?: Record<string, any>
    required?: string[]
  }
}

/**
 * Token management is handled by notion-token-manager.ts
 * This module provides centralized token retrieval, validation, and refresh
 */

/**
 * Connect to Notion MCP server using Streamable HTTP transport
 * Properly implements JSON-RPC 2.0 protocol with connection management
 * 
 * Streamable HTTP allows:
 * - Multiple requests over a single connection
 * - Server-sent events for streaming responses
 * - Persistent connection state
 * 
 * For now, we implement it as regular HTTP POST (works for simple request/response)
 * Full Streamable HTTP with SSE can be added later if needed
 */
export async function listNotionMCPTools(userId: string): Promise<MCPTool[]> {
  const mcpServerUrl = "https://mcp.notion.com/mcp"
  
  // Get valid token with automatic refresh
  const { getNotionTokenWithRefresh } = await import("./notion-token-manager")
  const notionToken = await getNotionTokenWithRefresh(userId)
  if (!notionToken) {
    throw new Error(
      "No valid Notion token found. " +
      "Please authenticate with Notion OAuth or add an integration token. " +
      "If you have a token, it may be expired - please re-authenticate."
    )
  }

  // Check token type - remote MCP requires OAuth tokens
  const { analyzeNotionToken, canUseWithRemoteMCP } = await import("./notion-token-detector")
  const tokenAnalysis = analyzeNotionToken(notionToken)
  
  if (tokenAnalysis.type === "integration") {
    throw new Error(
      `Integration token detected (${tokenAnalysis.length} chars, starts with "${tokenAnalysis.prefix}"). ` +
      `The remote Notion MCP server (https://mcp.notion.com/mcp) requires OAuth tokens, not integration tokens. ` +
      `Please authenticate via Notion OAuth to use the remote MCP server, or set up a local MCP server instance. ` +
      `See: https://github.com/makenotion/notion-mcp-server`
    )
  }

  // Verify token works with remote MCP
  const canUseRemote = await canUseWithRemoteMCP(notionToken)
  if (!canUseRemote) {
    throw new Error(
      `Token validation failed. Token type: ${tokenAnalysis.type}, length: ${tokenAnalysis.length}. ` +
      `The remote Notion MCP server requires valid OAuth tokens. ` +
      `Please re-authenticate with Notion OAuth.`
    )
  }

  try {
    // Step 1: Initialize MCP connection
    // For Streamable HTTP, initialization establishes the connection
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

    console.log("[Notion MCP] Initializing connection to", mcpServerUrl)
    console.log("[Notion MCP] Token present:", !!notionToken, "Length:", notionToken.length)

    const initResponse = await fetch(mcpServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notionToken}`,
        // Accept header for Streamable HTTP (supports both JSON and SSE)
        Accept: "application/json, text/event-stream",
        // Notion API version header
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(initRequest),
    })

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      console.error("[Notion MCP] Initialize error:", initResponse.status, errorText)
      
      if (initResponse.status === 401) {
        throw new Error(
          `Notion MCP authentication failed (401). ` +
          `Token may be expired or invalid. ` +
          `Please re-authenticate with Notion OAuth or refresh your integration token. ` +
          `Error: ${errorText}`
        )
      }
      
      throw new Error(`MCP initialize failed: ${initResponse.status} ${initResponse.statusText}. ${errorText}`)
    }

    const initData: JSONRPCResponse = await initResponse.json()
    if (initData.error) {
      throw new Error(
        `MCP initialize error: ${initData.error.message} ` +
        `(code: ${initData.error.code}). ` +
        `Data: ${JSON.stringify(initData.error.data)}`
      )
    }

    console.log("[Notion MCP] Initialized successfully")

    // Step 2: List available tools
    const toolsRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: `tools-${Date.now()}`,
      method: "tools/list",
      params: {},
    }

    const toolsResponse = await fetch(mcpServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notionToken}`,
        Accept: "application/json, text/event-stream",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(toolsRequest),
    })

    if (!toolsResponse.ok) {
      const errorText = await toolsResponse.text()
      console.error("[Notion MCP] Tools/list error:", toolsResponse.status, errorText)
      
      if (toolsResponse.status === 401) {
        throw new Error(
          `Notion MCP authentication failed during tools/list (401). ` +
          `Token may have expired. Please re-authenticate. ` +
          `Error: ${errorText}`
        )
      }
      
      throw new Error(`MCP tools/list failed: ${toolsResponse.status} ${toolsResponse.statusText}. ${errorText}`)
    }

    const toolsData: JSONRPCResponse = await toolsResponse.json()
    console.log("[Notion MCP] Tools response received")
    
    if (toolsData.error) {
      throw new Error(
        `MCP tools/list error: ${toolsData.error.message} ` +
        `(code: ${toolsData.error.code}). ` +
        `Data: ${JSON.stringify(toolsData.error.data)}`
      )
    }

    // Extract tools from result
    // MCP tools/list returns { result: { tools: [...] } }
    const tools = toolsData.result?.tools || []
    console.log("[Notion MCP] Found", tools.length, "tools:", tools.map((t: any) => t.name))
    return tools as MCPTool[]
  } catch (error: any) {
    console.error("[Notion MCP] Error listing tools:", error)
    throw error
  }
}

/**
 * Call a Notion MCP tool
 * Uses the same connection pattern as listNotionMCPTools
 */
export async function callNotionMCPTool(
  userId: string,
  toolName: string,
  arguments_: Record<string, any>
): Promise<any> {
  const mcpServerUrl = "https://mcp.notion.com/mcp"
  
  // Get valid token with automatic refresh
  const { getNotionTokenWithRefresh } = await import("./notion-token-manager")
  const notionToken = await getNotionTokenWithRefresh(userId)
  if (!notionToken) {
    throw new Error("No valid Notion token found")
  }

  try {
    const callRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: `call-${Date.now()}`,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: arguments_,
      },
    }

    const response = await fetch(mcpServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notionToken}`,
        Accept: "application/json, text/event-stream",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(callRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`MCP tools/call failed: ${response.status} ${response.statusText}. ${errorText}`)
    }

    const data: JSONRPCResponse = await response.json()
    if (data.error) {
      throw new Error(`MCP tools/call error: ${data.error.message} (code: ${data.error.code})`)
    }

    return data.result
  } catch (error: any) {
    console.error(`[Notion MCP] Error calling tool ${toolName}:`, error)
    throw error
  }
}

