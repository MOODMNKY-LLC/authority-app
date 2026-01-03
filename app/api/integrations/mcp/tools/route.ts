import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Call MCP server's tools/list method to get available tools
 * This serves as both a connectivity check and tool discovery
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
    const { serverName, serverType, config } = body

    if (!serverName || !serverType) {
      return NextResponse.json({ error: "Server name and type required" }, { status: 400 })
    }

    let tools: any[] = []
    let error: string | null = null

    try {
      if (serverType === "notion") {
        // For Notion MCP, we need to check if token exists and call the MCP server
        const { data: settings } = await supabase
          .from("user_settings")
          .select("notion_access_token, notion_token")
          .eq("user_id", user.id)
          .single()

        const token = settings?.notion_access_token || settings?.notion_token
        if (!token) {
          return NextResponse.json({
            tools: [],
            error: "Notion token not found",
            connected: false,
          })
        }

        // Notion MCP server would be running via Docker or npm
        // For now, we'll return a placeholder indicating it's configured
        // In production, this would call the actual MCP server
        tools = [
          {
            name: "notion_search",
            description: "Search pages and databases in Notion workspace",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" },
              },
            },
          },
          {
            name: "notion_read_page",
            description: "Read content from a Notion page",
            inputSchema: {
              type: "object",
              properties: {
                page_id: { type: "string", description: "Notion page ID" },
              },
            },
          },
          {
            name: "notion_create_page",
            description: "Create a new page in Notion",
            inputSchema: {
              type: "object",
              properties: {
                parent_id: { type: "string", description: "Parent page or database ID" },
                title: { type: "string", description: "Page title" },
              },
            },
          },
        ]
      } else if (serverType === "n8n") {
        // For n8n MCP, call the n8n instance's MCP endpoint
        let n8nHost = config?.host || process.env.NEXT_PUBLIC_N8N_HOST || process.env.N8N_HOST
        let n8nApiKey = config?.apiKey

        // If API key not provided in config, try to get it from user_settings
        if (!n8nApiKey) {
          const { data: settings } = await supabase
            .from("user_settings")
            .select("n8n_api_key")
            .eq("user_id", user.id)
            .single()

          if (settings?.n8n_api_key) {
            try {
              const { decryptApiKey } = await import("@/lib/encryption")
              n8nApiKey = await decryptApiKey(settings.n8n_api_key)
            } catch (decryptError) {
              return NextResponse.json({
                tools: [],
                error: "Failed to decrypt n8n API key",
                connected: false,
              })
            }
          }
        }

        // If host not provided, try to get it from user_settings or use default
        if (!n8nHost) {
          n8nHost = process.env.NEXT_PUBLIC_N8N_HOST || process.env.N8N_HOST || "https://slade-n8n.moodmnky.com"
        }

        if (!n8nHost || !n8nApiKey) {
          return NextResponse.json({
            tools: [],
            error: "N8n host and API key required",
            connected: false,
          })
        }

        // Ensure host has protocol
        let hostUrl = n8nHost
        if (!hostUrl.startsWith("http://") && !hostUrl.startsWith("https://")) {
          hostUrl = `https://${hostUrl}`
        }

        // n8n MCP endpoint format: /webhook/mcp/{workflow-id} or /api/v1/mcp/tools
        // Try the MCP tools endpoint first
        try {
          const response = await fetch(`${hostUrl}/api/v1/mcp/tools`, {
            method: "POST",
            headers: {
              "X-N8N-API-KEY": n8nApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "tools/list",
              id: 1,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.result && Array.isArray(data.result.tools)) {
              tools = data.result.tools
            } else if (data.tools && Array.isArray(data.tools)) {
              tools = data.tools
            }
          } else {
            // If MCP endpoint doesn't exist, try listing workflows as tools
            const workflowsResponse = await fetch(`${hostUrl}/api/v1/workflows`, {
              headers: {
                "X-N8N-API-KEY": n8nApiKey,
                Accept: "application/json",
              },
            })

            if (workflowsResponse.ok) {
              const workflows = await workflowsResponse.json()
              tools = (Array.isArray(workflows) ? workflows : []).map((workflow: any) => ({
                name: `n8n_${workflow.id}`,
                description: workflow.name || `N8n workflow ${workflow.id}`,
                inputSchema: {
                  type: "object",
                  properties: {
                    workflow_id: { type: "string", description: "Workflow ID", default: workflow.id },
                    input_data: { type: "object", description: "Input data for workflow" },
                  },
                },
                metadata: {
                  workflowId: workflow.id,
                  workflowName: workflow.name,
                  active: workflow.active,
                },
              }))
            } else {
              error = `N8n API error: ${workflowsResponse.status}`
            }
          }
        } catch (fetchError: any) {
          error = fetchError.message || "Failed to connect to n8n MCP server"
        }
      } else {
        // Generic MCP server - would need server URL and connection details
        error = `Unsupported MCP server type: ${serverType}`
      }
    } catch (err: any) {
      error = err.message || "Failed to list MCP tools"
    }

    return NextResponse.json({
      tools,
      connected: tools.length > 0 && !error,
      error,
      serverName,
      serverType,
    })
  } catch (error: any) {
    console.error("[Authority] Error listing MCP tools:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list MCP tools" },
      { status: 500 }
    )
  }
}

