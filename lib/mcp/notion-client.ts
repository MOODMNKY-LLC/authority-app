/**
 * Notion MCP Client
 * Connects to Notion's official MCP server at https://mcp.notion.com/mcp
 * Uses JSON-RPC 2.0 protocol over Streamable HTTP transport
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
 * Connect to Notion MCP server and list available tools
 * Uses Streamable HTTP transport as per Notion MCP documentation
 * @see https://developers.notion.com/docs/get-started-with-mcp
 * 
 * Notion MCP Server: https://mcp.notion.com/mcp
 * Authentication: OAuth Bearer token
 * Protocol: JSON-RPC 2.0 over Streamable HTTP
 */
export async function listNotionMCPTools(notionToken: string): Promise<MCPTool[]> {
  const mcpServerUrl = "https://mcp.notion.com/mcp"
  
  try {
    // Step 1: Initialize MCP connection
    // For Streamable HTTP, we need to initialize before calling other methods
    const initRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: 1,
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

    const initResponse = await fetch(mcpServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notionToken}`,
      },
      body: JSON.stringify(initRequest),
    })

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      console.error("[Notion MCP] Initialize error:", initResponse.status, errorText)
      throw new Error(`MCP initialize failed: ${initResponse.status} ${initResponse.statusText}`)
    }

    const initData: JSONRPCResponse = await initResponse.json()
    if (initData.error) {
      throw new Error(`MCP initialize error: ${initData.error.message} (code: ${initData.error.code})`)
    }

    console.log("[Notion MCP] Initialized successfully")

    // Step 2: List available tools
    const toolsRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    }

    const toolsResponse = await fetch(mcpServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notionToken}`,
      },
      body: JSON.stringify(toolsRequest),
    })

    if (!toolsResponse.ok) {
      const errorText = await toolsResponse.text()
      console.error("[Notion MCP] Tools/list error:", toolsResponse.status, errorText)
      throw new Error(`MCP tools/list failed: ${toolsResponse.status} ${toolsResponse.statusText}`)
    }

    const toolsData: JSONRPCResponse = await toolsResponse.json()
    console.log("[Notion MCP] Tools response received")
    
    if (toolsData.error) {
      throw new Error(`MCP tools/list error: ${toolsData.error.message} (code: ${toolsData.error.code})`)
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
 */
export async function callNotionMCPTool(
  notionToken: string,
  toolName: string,
  arguments_: Record<string, any>
): Promise<any> {
  const mcpServerUrl = "https://mcp.notion.com/mcp"
  
  try {
    const callRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
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
      },
      body: JSON.stringify(callRequest),
    })

    if (!response.ok) {
      throw new Error(`MCP tools/call failed: ${response.status} ${response.statusText}`)
    }

    const data: JSONRPCResponse = await response.json()
    if (data.error) {
      throw new Error(`MCP tools/call error: ${data.error.message}`)
    }

    return data.result
  } catch (error: any) {
    console.error(`[Notion MCP] Error calling tool ${toolName}:`, error)
    throw error
  }
}

