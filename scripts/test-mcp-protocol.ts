/**
 * Comprehensive MCP server protocol tester
 * Tests various request formats to determine what each server expects
 */

interface TestCase {
  name: string
  url: string
  method: string
  headers: Record<string, string>
  body?: string
}

const servers = [
  "https://brave-mcp.moodmnky.com/mcp",
  "https://firecrawl-mcp.moodmnky.com/mcp",
  "https://fetch-mcp.moodmnky.com/mcp",
  "https://supabase-mcp.moodmnky.com/mcp",
  "https://notion-mcp.moodmnky.com/mcp",
]

const initRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "test-client",
      version: "1.0.0",
    },
  },
}

async function testRequest(testCase: TestCase): Promise<{
  success: boolean
  status?: number
  response?: string
  error?: string
}> {
  try {
    const options: RequestInit = {
      method: testCase.method,
      headers: testCase.headers,
    }

    if (testCase.body) {
      options.body = testCase.body
    }

    const response = await fetch(testCase.url, options)

    const responseText = await response.text()

    return {
      success: response.ok,
      status: response.status,
      response: responseText.substring(0, 500),
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

async function testServer(serverUrl: string) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`Testing: ${serverUrl}`)
  console.log("=".repeat(60))

  const testCases: TestCase[] = [
    // Test 1: Standard JSON-RPC with application/json
    {
      name: "Standard JSON-RPC (application/json)",
      url: serverUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(initRequest),
    },
    // Test 2: With text/event-stream Accept
    {
      name: "JSON-RPC with SSE Accept",
      url: serverUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(initRequest),
    },
    // Test 3: Only text/event-stream
    {
      name: "JSON-RPC with text/event-stream only",
      url: serverUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(initRequest),
    },
    // Test 4: GET request
    {
      name: "GET request",
      url: serverUrl,
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
    // Test 5: OPTIONS request
    {
      name: "OPTIONS request",
      url: serverUrl,
      method: "OPTIONS",
      headers: {},
    },
  ]

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`)
    const result = await testRequest(testCase)

    if (result.success) {
      console.log(`   ✅ Success (${result.status})`)
      if (result.response) {
        console.log(`   Response: ${result.response}`)
      }
    } else {
      console.log(`   ❌ Failed`)
      if (result.status) {
        console.log(`   Status: ${result.status}`)
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      if (result.response) {
        console.log(`   Response: ${result.response}`)
      }
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

async function testAllServers() {
  console.log("🧪 MCP Server Protocol Tester")
  console.log("Testing various request formats to determine server requirements\n")

  for (const server of servers) {
    await testServer(server)
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log("✅ Testing complete")
  console.log("=".repeat(60))
}

testAllServers().catch(console.error)

