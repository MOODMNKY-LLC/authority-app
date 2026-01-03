/**
 * Test script to verify all MCP servers are functional
 * Tests each server endpoint and verifies tools/list returns results
 */

interface MCPServer {
  name: string
  url: string
  requiresAuth: boolean
  authHeader?: string
}

const servers: MCPServer[] = [
  {
    name: 'Notion',
    url: 'https://notion-mcp.moodmnky.com/mcp',
    requiresAuth: true,
    authHeader: `Bearer ${process.env.MCP_NOTION_TOKEN || 'ntn_h87200563322kIxmXHtz1C2dKPwuAnsja69XIXeRGtdeTT'}`,
  },
  {
    name: 'Firecrawl',
    url: 'https://firecrawl-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'Supabase',
    url: 'https://supabase-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'Fetch',
    url: 'https://fetch-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'Filesystem',
    url: 'https://filesystem-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'Memory',
    url: 'https://memory-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'N8n',
    url: 'https://n8n-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'Magic',
    url: 'https://magic-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'MagicUI',
    url: 'https://magicui-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'Brave Search',
    url: 'https://brave-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'Tavily',
    url: 'https://tavily-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'GitHub',
    url: 'https://github-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
  {
    name: 'Sequential Thinking',
    url: 'https://sequential-thinking-mcp.moodmnky.com/mcp',
    requiresAuth: false,
  },
]

interface JSONRPCRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

async function testMCPServer(server: MCPServer): Promise<{ success: boolean; tools?: any[]; error?: string }> {
  try {
    console.log(`\n🧪 Testing ${server.name}...`)
    console.log(`   URL: ${server.url}`)

    // Step 1: Initialize
    const initRequest: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: `init-${Date.now()}`,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'mcp-test-script',
          version: '1.0.0',
        },
      },
    }

    const initHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (server.authHeader) {
      initHeaders['Authorization'] = server.authHeader
    }

    const initResponse = await fetch(server.url, {
      method: 'POST',
      headers: initHeaders,
      body: JSON.stringify(initRequest),
    })

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      return {
        success: false,
        error: `Initialize failed: ${initResponse.status} ${initResponse.statusText} - ${errorText}`,
      }
    }

    const initData: JSONRPCResponse = await initResponse.json()
    if (initData.error) {
      return {
        success: false,
        error: `Initialize error: ${initData.error.message} (code: ${initData.error.code})`,
      }
    }

    console.log(`   ✅ Initialize successful`)

    // Step 2: List Tools
    const toolsRequest: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: `tools-${Date.now()}`,
      method: 'tools/list',
      params: {},
    }

    const toolsResponse = await fetch(server.url, {
      method: 'POST',
      headers: initHeaders,
      body: JSON.stringify(toolsRequest),
    })

    if (!toolsResponse.ok) {
      const errorText = await toolsResponse.text()
      return {
        success: false,
        error: `Tools/list failed: ${toolsResponse.status} ${toolsResponse.statusText} - ${errorText}`,
      }
    }

    const toolsData: JSONRPCResponse = await toolsResponse.json()
    if (toolsData.error) {
      return {
        success: false,
        error: `Tools/list error: ${toolsData.error.message} (code: ${toolsData.error.code})`,
      }
    }

    const tools = toolsData.result?.tools || []
    console.log(`   ✅ Tools/list successful - Found ${tools.length} tools`)

    if (tools.length > 0) {
      console.log(`   📋 Tools: ${tools.slice(0, 3).map((t: any) => t.name).join(', ')}${tools.length > 3 ? '...' : ''}`)
    }

    return {
      success: true,
      tools,
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Exception: ${error.message}`,
    }
  }
}

async function testAllServers() {
  console.log('🚀 Testing All MCP Servers\n')
  console.log('='.repeat(60))

  const results: Array<{ server: string; success: boolean; toolCount?: number; error?: string }> = []

  for (const server of servers) {
    const result = await testMCPServer(server)
    results.push({
      server: server.name,
      success: result.success,
      toolCount: result.tools?.length,
      error: result.error,
    })

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n📊 Test Results Summary\n')

  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  console.log(`✅ Successful: ${successful.length}/${results.length}`)
  successful.forEach((r) => {
    console.log(`   - ${r.server}: ${r.toolCount || 0} tools`)
  })

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`)
    failed.forEach((r) => {
      console.log(`   - ${r.server}: ${r.error}`)
    })
  }

  return results
}

// Run tests
testAllServers()
  .then((results) => {
    const allSuccessful = results.every((r) => r.success)
    process.exit(allSuccessful ? 0 : 1)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

