/**
 * Generic MCP client for connecting to any MCP server via HTTP/SSE
 * Uses the MCP SDK's SSEClientTransport for proper protocol handling
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

export interface MCPServerConfig {
  url: string
  headers?: Record<string, string>
}

/**
 * Parse SSE (Server-Sent Events) response from MCP server
 * Format: "event: message\nid: <id>\ndata: <json>\n\n"
 */
function parseSSEResponse(sseText: string): JSONRPCResponse {
  // If it's already JSON (some servers might return JSON directly)
  if (sseText.trim().startsWith("{")) {
    try {
      return JSON.parse(sseText)
    } catch {
      // Fall through to SSE parsing
    }
  }

  // Parse SSE format
  const lines = sseText.split("\n")
  let dataLine = ""
  let id = ""

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      dataLine = line.substring(6) // Remove "data: " prefix
    } else if (line.startsWith("id: ")) {
      id = line.substring(4) // Remove "id: " prefix
    }
  }

  if (!dataLine) {
    throw new Error("No data line found in SSE response")
  }

  try {
    const parsed = JSON.parse(dataLine)
    // Ensure id matches if provided in SSE
    if (id && !parsed.id) {
      parsed.id = id
    }
    return parsed
  } catch (error: any) {
    throw new Error(`Failed to parse SSE data: ${error.message}`)
  }
}

/**
 * Initialize connection to MCP server
 * Returns session ID if provided by server (some servers require session management)
 */
async function initializeMCPConnection(config: MCPServerConfig): Promise<{
  sessionId?: string
  cookies?: string[]
}> {
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

  // MCP servers may require specific headers
  // Try multiple Accept header formats
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept": "application/json", // Start with standard JSON
    ...config.headers,
  }
  
  // If config has Accept header, use it; otherwise try text/event-stream
  if (!config.headers?.Accept) {
    headers["Accept"] = "application/json, text/event-stream"
  }

  // Notion MCP requires Notion-Version header
  if (config.url.includes("notion-mcp") || config.headers?.Authorization?.includes("Bearer")) {
    headers["Notion-Version"] = "2022-06-28"
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers,
    body: JSON.stringify(initRequest),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Initialize failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  // MCP servers return SSE format (text/event-stream), not plain JSON
  const responseText = await response.text()
  const data = parseSSEResponse(responseText)
  
  if (data.error) {
    throw new Error(`Initialize error: ${data.error.message} (code: ${data.error.code})`)
  }

  // Extract session ID from response header (MCP spec: server returns it in Mcp-Session-Id header)
  // Check both case variations: mcp-session-id and Mcp-Session-Id
  const sessionId = 
    response.headers.get("mcp-session-id") || 
    response.headers.get("Mcp-Session-Id") ||
    response.headers.get("MCP-Session-ID") ||
    data.result?.sessionId ||
    data.result?.serverInfo?.sessionId

  const cookies = response.headers.getSetCookie?.() || []

  return {
    sessionId: sessionId || undefined,
    cookies,
  }
}

/**
 * List tools from MCP server
 */
export async function listMCPTools(config: MCPServerConfig): Promise<any[]> {
  try {
    // Initialize connection first and get session ID
    const initResult = await initializeMCPConnection(config)

    // Then list tools
    const toolsRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: `tools-${Date.now()}`,
      method: "tools/list",
      params: {},
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      ...config.headers,
    }

    // Notion MCP requires Notion-Version header
    if (config.url.includes("notion-mcp") || config.headers?.Authorization?.includes("Bearer")) {
      headers["Notion-Version"] = "2022-06-28"
    }

    // Include session ID if provided (MCP spec: required for subsequent requests)
    if (initResult.sessionId) {
      headers["Mcp-Session-Id"] = initResult.sessionId
    }

    // Include cookies from initialize if any
    if (initResult.cookies && initResult.cookies.length > 0) {
      headers["Cookie"] = initResult.cookies.join("; ")
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(toolsRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tools/list failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    // MCP servers return SSE format (text/event-stream), not plain JSON
    const responseText = await response.text()
    const data = parseSSEResponse(responseText)
    
    if (data.error) {
      throw new Error(`Tools/list error: ${data.error.message} (code: ${data.error.code})`)
    }

    return data.result?.tools || []
  } catch (error: any) {
    console.error(`[MCP Client] Error listing tools from ${config.url}:`, error)
    throw error
  }
}

/**
 * Call a tool on MCP server
 */
export async function callMCPTool(
  config: MCPServerConfig,
  toolName: string,
  arguments_: Record<string, any>
): Promise<any> {
  try {
    // Initialize connection first and get session ID
    const initResult = await initializeMCPConnection(config)

    // Then call tool
    const callRequest: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: `call-${Date.now()}`,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: arguments_,
      },
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      ...config.headers,
    }

    // Notion MCP requires Notion-Version header
    if (config.url.includes("notion-mcp") || config.headers?.Authorization?.includes("Bearer")) {
      headers["Notion-Version"] = "2022-06-28"
    }

    // Include session ID if provided (MCP spec: required for subsequent requests)
    if (initResult.sessionId) {
      headers["Mcp-Session-Id"] = initResult.sessionId
    }

    // Include cookies from initialize if any
    if (initResult.cookies && initResult.cookies.length > 0) {
      headers["Cookie"] = initResult.cookies.join("; ")
    }

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify(callRequest),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tool call failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    // MCP servers return SSE format (text/event-stream), not plain JSON
    const responseText = await response.text()
    const data = parseSSEResponse(responseText)
    
    if (data.error) {
      throw new Error(`Tool call error: ${data.error.message} (code: ${data.error.code})`)
    }

    return data.result
  } catch (error: any) {
    console.error(`[MCP Client] Error calling tool ${toolName} on ${config.url}:`, error)
    throw error
  }
}

