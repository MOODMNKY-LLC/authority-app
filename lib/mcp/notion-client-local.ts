/**
 * Local Notion MCP Client
 * Connects to a locally running Notion MCP server instance
 * Uses integration tokens (works with @notionhq/notion-mcp-server)
 * 
 * This is an alternative to the remote server when OAuth tokens are unavailable
 * @see https://github.com/makenotion/notion-mcp-server
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
 * Connect to local Notion MCP server
 * Requires running @notionhq/notion-mcp-server locally
 * 
 * For Next.js apps, you would need to:
 * 1. Run the server as a separate process/service
 * 2. Or use a serverless function to spawn it
 * 3. Or run it in a container/service
 * 
 * @param localServerUrl - URL of local MCP server (e.g., http://localhost:3000/mcp)
 * @param authToken - Auth token for local server (if using --auth-token)
 * @param notionToken - Notion integration token
 */
export async function listNotionMCPToolsLocal(
  localServerUrl: string,
  authToken: string | null,
  notionToken: string
): Promise<MCPTool[]> {
  try {
    // Initialize MCP connection
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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    }

    // Add auth token if provided (for local server security)
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    // The local server uses NOTION_TOKEN env var, but we can also pass it via headers
    // However, the standard way is via environment variable when starting the server
    // For HTTP requests, we might need to pass it differently

    console.log("[Notion MCP Local] Initializing connection to", localServerUrl)

    const initResponse = await fetch(localServerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(initRequest),
    })

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      throw new Error(`Local MCP initialize failed: ${initResponse.status} ${errorText}`)
    }

    const initData: JSONRPCResponse = await initResponse.json()
    if (initData.error) {
      throw new Error(`Local MCP initialize error: ${initData.error.message}`)
    }

    // List tools
    const toolsRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: `tools-${Date.now()}`,
      method: "tools/list",
      params: {},
    }

    const toolsResponse = await fetch(localServerUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(toolsRequest),
    })

    if (!toolsResponse.ok) {
      const errorText = await toolsResponse.text()
      throw new Error(`Local MCP tools/list failed: ${toolsResponse.status} ${errorText}`)
    }

    const toolsData: JSONRPCResponse = await toolsResponse.json()
    if (toolsData.error) {
      throw new Error(`Local MCP tools/list error: ${toolsData.error.message}`)
    }

    const tools = toolsData.result?.tools || []
    return tools as MCPTool[]
  } catch (error: any) {
    console.error("[Notion MCP Local] Error:", error)
    throw error
  }
}


