import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"
import { listMCPTools } from "@/lib/mcp/generic-client"

/**
 * Comprehensive debugging endpoint for MCP servers
 * Tests Notion and N8n specifically with detailed logging
 */
export async function GET(request: NextRequest) {
  const debugReport: any = {
    timestamp: new Date().toISOString(),
    servers: {},
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Debug Notion MCP
    debugReport.servers.notion = await debugNotionMCP(supabase, user.id)
    
    // Debug N8n MCP
    debugReport.servers.n8n = await debugN8nMCP()

    return NextResponse.json(debugReport, { status: 200 })
  } catch (error: any) {
    debugReport.error = error.message
    return NextResponse.json(debugReport, { status: 500 })
  }
}

async function debugNotionMCP(supabase: any, userId: string) {
  const debug: any = {
    serverId: "notion",
    steps: [],
    errors: [],
    warnings: [],
  }

  try {
    // Step 1: Check token availability
    debug.steps.push("Step 1: Checking token availability")
    const { data: notionSettings } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token")
      .eq("user_id", userId)
      .single()

    // Priority 1: Server-level auth token (if MCP server requires its own auth token)
    const serverAuthToken = process.env.MCP_NOTION_SERVER_AUTH_TOKEN
    
    let notionToken: string | null = null
    let tokenSource = "none"
    
    if (serverAuthToken) {
      // Server requires its own auth token
      notionToken = serverAuthToken
      tokenSource = "server_auth_token"
      debug.tokenInfo.hasServerAuthToken = true
    } else {
      // Priority 2: User's Notion token (if server doesn't require auth token)
      // Try OAuth token first, then integration token (self-hosted servers may accept integration tokens)
      notionToken =
        notionSettings?.notion_access_token ||
        process.env.MCP_NOTION_TOKEN

      // Fall back to integration token if OAuth not available
      if (!notionToken && notionSettings?.notion_token) {
        try {
          notionToken = decryptApiKey(notionSettings.notion_token)
          tokenSource = "integration_token"
        } catch (error) {
          debug.warnings.push(`Failed to decrypt integration token: ${error}`)
        }
      } else if (notionToken) {
        tokenSource = notionToken.startsWith("ntn_") ? "oauth_token" : "env_token"
      }
    }
    
    debug.tokenInfo.tokenSource = tokenSource

    debug.tokenInfo = {
      hasOAuthToken: !!notionSettings?.notion_access_token,
      hasIntegrationToken: !!notionSettings?.notion_token,
      hasEnvToken: !!process.env.MCP_NOTION_TOKEN,
      tokenLength: notionToken?.length || 0,
      tokenPrefix: notionToken?.substring(0, 10) || "none",
      tokenType: notionToken?.startsWith("secret_") ? "integration" : 
                 notionToken?.startsWith("ntn_") ? "oauth" : 
                 notionToken?.startsWith("Bearer ") ? "bearer" : "unknown",
    }

    if (!notionToken) {
      debug.errors.push("No Notion token found in any source")
      return debug
    }

    // Step 1.5: Validate token with Notion API directly
    debug.steps.push("Step 1.5: Validating token with Notion API")
    try {
      const notionApiResponse = await fetch("https://api.notion.com/v1/users/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${notionToken}`,
          "Notion-Version": "2022-06-28",
        },
      })

      debug.tokenValidation = {
        apiStatus: notionApiResponse.status,
        apiStatusText: notionApiResponse.statusText,
        apiOk: notionApiResponse.ok,
        tokenType: notionToken.startsWith("secret_") ? "integration" : 
                   notionToken.startsWith("ntn_") ? "oauth" : "unknown",
      }

      if (!notionApiResponse.ok) {
        const apiErrorText = await notionApiResponse.text()
        debug.tokenValidation.apiError = apiErrorText.substring(0, 200)
        
        // If OAuth token fails, suggest trying integration token
        if (notionToken.startsWith("ntn_") && notionSettings?.notion_token) {
          debug.warnings.push("OAuth token failed. Self-hosted MCP server may accept integration tokens. Trying integration token...")
          
          // Try integration token
          try {
            const integrationToken = decryptApiKey(notionSettings.notion_token)
            debug.tokenValidation.tryingIntegrationToken = true
            
            // Update token for MCP test
            notionToken = integrationToken
            debug.tokenInfo.tokenType = "integration"
            debug.tokenInfo.tokenPrefix = integrationToken.substring(0, 10)
            
            // Note: We'll test this token in the MCP initialize step
          } catch (error) {
            debug.errors.push(`Failed to decrypt integration token: ${error}`)
          }
        } else {
          debug.errors.push(`Token validation failed: ${notionApiResponse.status} ${notionApiResponse.statusText}`)
          debug.warnings.push("Token may be expired or invalid. Please re-authenticate with Notion or add an integration token.")
        }
      } else {
        const apiData = await notionApiResponse.json()
        debug.tokenValidation.apiSuccess = {
          userId: apiData.id,
          userName: apiData.name,
          userType: apiData.type,
        }
      }
    } catch (apiError: any) {
      debug.tokenValidation = {
        apiError: apiError.message,
      }
      debug.errors.push(`Token validation request failed: ${apiError.message}`)
    }

    // Step 2: Check endpoint configuration
    debug.steps.push("Step 2: Checking endpoint configuration")
    const notionEndpoint = process.env.MCP_NOTION_URL || "https://notion-mcp.moodmnky.com/mcp"
    debug.endpoint = notionEndpoint

    // Step 3: Test initialize with detailed logging
    debug.steps.push("Step 3: Testing initialize request")
    const initRequest = {
      jsonrpc: "2.0",
      id: `debug-init-${Date.now()}`,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: "authority-app-debug",
          version: "1.0.0",
        },
      },
    }

    const initHeaders: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28", // Notion API version
    }

    debug.initRequest = {
      url: notionEndpoint,
      headers: Object.keys(initHeaders),
      hasAuth: !!initHeaders.Authorization,
      hasNotionVersion: !!initHeaders["Notion-Version"],
    }

    const initResponse = await fetch(notionEndpoint, {
      method: "POST",
      headers: initHeaders,
      body: JSON.stringify(initRequest),
    })

    debug.initResponse = {
      status: initResponse.status,
      statusText: initResponse.statusText,
      headers: Object.fromEntries(initResponse.headers.entries()),
      ok: initResponse.ok,
    }

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      debug.errors.push(`Initialize failed: ${initResponse.status} ${initResponse.statusText}`)
      debug.initError = errorText.substring(0, 500)
      
      // Parse error for better diagnostics
      try {
        const errorJson = JSON.parse(errorText)
        debug.parsedInitError = errorJson
        
        if (initResponse.status === 403 && errorJson.error?.message?.includes("Invalid bearer token")) {
          debug.recommendations = [
            "Token is invalid or expired",
            "Please re-authenticate with Notion OAuth",
            "Go to Settings → Notion → Connect with Notion",
            "Or add a new integration token if using integration tokens"
          ]
        }
      } catch {
        // Not JSON, keep raw error
      }
      
      return debug
    }

    // Step 4: Extract session ID
    debug.steps.push("Step 4: Extracting session ID")
    const initResponseText = await initResponse.text()
    const sessionId = 
      initResponse.headers.get("mcp-session-id") || 
      initResponse.headers.get("Mcp-Session-Id") ||
      initResponse.headers.get("MCP-Session-ID")

    debug.sessionInfo = {
      sessionId: sessionId || "none",
      hasSessionId: !!sessionId,
      responseLength: initResponseText.length,
      responsePreview: initResponseText.substring(0, 200),
    }

    if (!sessionId) {
      debug.warnings.push("No session ID found in initialize response")
    }

    // Step 5: Test tools/list with session ID
    debug.steps.push("Step 5: Testing tools/list request")
    const toolsRequest = {
      jsonrpc: "2.0",
      id: `debug-tools-${Date.now()}`,
      method: "tools/list",
      params: {},
    }

    const toolsHeaders: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
    }

    if (sessionId) {
      toolsHeaders["Mcp-Session-Id"] = sessionId
    }

    debug.toolsRequest = {
      url: notionEndpoint,
      headers: Object.keys(toolsHeaders),
      hasAuth: !!toolsHeaders.Authorization,
      hasSessionId: !!toolsHeaders["Mcp-Session-Id"],
      hasNotionVersion: !!toolsHeaders["Notion-Version"],
    }

    const toolsResponse = await fetch(notionEndpoint, {
      method: "POST",
      headers: toolsHeaders,
      body: JSON.stringify(toolsRequest),
    })

    debug.toolsResponse = {
      status: toolsResponse.status,
      statusText: toolsResponse.statusText,
      headers: Object.fromEntries(toolsResponse.headers.entries()),
      ok: toolsResponse.ok,
    }

    if (!toolsResponse.ok) {
      const errorText = await toolsResponse.text()
      debug.errors.push(`Tools/list failed: ${toolsResponse.status} ${toolsResponse.statusText}`)
      debug.toolsError = errorText.substring(0, 500)
      return debug
    }

    // Step 6: Parse tools response
    debug.steps.push("Step 6: Parsing tools response")
    const toolsResponseText = await toolsResponse.text()
    
    // Parse SSE response
    const lines = toolsResponseText.split("\n")
    let dataLine = ""
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        dataLine = line.substring(6)
        break
      }
    }

    if (dataLine) {
      try {
        const parsed = JSON.parse(dataLine)
        debug.toolsResult = {
          hasResult: !!parsed.result,
          toolCount: parsed.result?.tools?.length || 0,
          tools: parsed.result?.tools?.map((t: any) => t.name) || [],
          error: parsed.error || null,
        }
        debug.success = true
      } catch (parseError: any) {
        debug.errors.push(`Failed to parse tools response: ${parseError.message}`)
        debug.parseError = {
          message: parseError.message,
          dataPreview: dataLine.substring(0, 200),
        }
      }
    } else {
      debug.errors.push("No data line found in SSE response")
      debug.responsePreview = toolsResponseText.substring(0, 500)
    }

  } catch (error: any) {
    debug.errors.push(`Unexpected error: ${error.message}`)
    debug.errorStack = error.stack
  }

  return debug
}

async function debugN8nMCP() {
  const debug: any = {
    serverId: "n8n",
    steps: [],
    errors: [],
    warnings: [],
  }

  try {
    // Step 1: Check endpoint configuration
    debug.steps.push("Step 1: Checking endpoint configuration")
    const n8nEndpoint = process.env.MCP_N8N_URL || "https://n8n-mcp.moodmnky.com/mcp"
    debug.endpoint = n8nEndpoint

    // Step 2: Test initialize
    debug.steps.push("Step 2: Testing initialize request")
    const initRequest = {
      jsonrpc: "2.0",
      id: `debug-init-${Date.now()}`,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: "authority-app-debug",
          version: "1.0.0",
        },
      },
    }

    const initHeaders: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    }

    debug.initRequest = {
      url: n8nEndpoint,
      headers: Object.keys(initHeaders),
    }

    const initResponse = await fetch(n8nEndpoint, {
      method: "POST",
      headers: initHeaders,
      body: JSON.stringify(initRequest),
    })

    debug.initResponse = {
      status: initResponse.status,
      statusText: initResponse.statusText,
      headers: Object.fromEntries(initResponse.headers.entries()),
      ok: initResponse.ok,
    }

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      debug.errors.push(`Initialize failed: ${initResponse.status} ${initResponse.statusText}`)
      debug.initError = errorText.substring(0, 1000)
      
      // Try to parse error JSON
      try {
        const errorJson = JSON.parse(errorText)
        debug.parsedError = errorJson
      } catch {
        // Not JSON, that's the issue
        debug.errors.push("Response is not valid JSON")
        debug.jsonParseIssue = {
          message: "Unterminated string in JSON",
          responseLength: errorText.length,
          responsePreview: errorText.substring(0, 200),
          position131: errorText.substring(120, 140), // Around position 131
        }
        
        // Add recommendations for N8n server-side issue
        debug.recommendations = [
          "N8n MCP server is returning malformed JSON",
          "This is a server-side bug, not a client issue",
          "Check N8n MCP server logs for JSON serialization errors",
          "Verify N8n MCP server configuration",
          "Consider using N8n REST API directly as alternative",
          "Contact N8n MCP server maintainers about this issue"
        ]
      }
      
      return debug
    }

    // Step 3: Extract session ID
    debug.steps.push("Step 3: Extracting session ID")
    const initResponseText = await initResponse.text()
    const sessionId = 
      initResponse.headers.get("mcp-session-id") || 
      initResponse.headers.get("Mcp-Session-Id") ||
      initResponse.headers.get("MCP-Session-ID")

    debug.sessionInfo = {
      sessionId: sessionId || "none",
      hasSessionId: !!sessionId,
      responseLength: initResponseText.length,
      responsePreview: initResponseText.substring(0, 200),
    }

    // Step 4: Test tools/list
    debug.steps.push("Step 4: Testing tools/list request")
    const toolsRequest = {
      jsonrpc: "2.0",
      id: `debug-tools-${Date.now()}`,
      method: "tools/list",
      params: {},
    }

    const toolsHeaders: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    }

    if (sessionId) {
      toolsHeaders["Mcp-Session-Id"] = sessionId
    }

    const toolsResponse = await fetch(n8nEndpoint, {
      method: "POST",
      headers: toolsHeaders,
      body: JSON.stringify(toolsRequest),
    })

    debug.toolsResponse = {
      status: toolsResponse.status,
      statusText: toolsResponse.statusText,
      ok: toolsResponse.ok,
    }

    if (toolsResponse.ok) {
      const toolsResponseText = await toolsResponse.text()
      debug.success = true
      debug.toolsResponseText = toolsResponseText.substring(0, 500)
    } else {
      const errorText = await toolsResponse.text()
      debug.errors.push(`Tools/list failed: ${toolsResponse.status}`)
      debug.toolsError = errorText.substring(0, 500)
    }

  } catch (error: any) {
    debug.errors.push(`Unexpected error: ${error.message}`)
    debug.errorStack = error.stack
  }

  return debug
}

