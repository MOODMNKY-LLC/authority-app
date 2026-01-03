/**
 * Test script for Notion MCP connection
 * Run with: npx tsx scripts/test-notion-mcp.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testNotionMCP() {
  console.log("🧪 Testing Notion MCP Connection...\n")

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get a test user (you may need to adjust this)
  const { data: users } = await supabase.auth.admin.listUsers()
  if (!users || users.users.length === 0) {
    console.error("❌ No users found. Please create a user first.")
    return
  }

  const testUser = users.users[0]
  console.log(`📋 Testing with user: ${testUser.email || testUser.id}\n`)

  // Get user settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notion_access_token, notion_token")
    .eq("user_id", testUser.id)
    .single()

  const notionToken = settings?.notion_access_token || settings?.notion_token

  if (!notionToken) {
    console.error("❌ No Notion token found for user")
    console.log("💡 Please ensure the user has connected Notion via OAuth or added an integration token")
    return
  }

  console.log(`✅ Found Notion token (length: ${notionToken.length})\n`)

  // Test MCP connection
  const mcpServerUrl = "https://mcp.notion.com/mcp"
  console.log(`🔗 Connecting to: ${mcpServerUrl}\n`)

  try {
    // Step 1: Initialize
    console.log("📤 Step 1: Sending initialize request...")
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: "authority-app-test",
          version: "1.0.0",
        },
      },
    }

    const initResponse = await fetch(mcpServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notionToken}`,
      },
      body: JSON.stringify(initRequest),
    })

    console.log(`📥 Initialize response status: ${initResponse.status}`)

    if (!initResponse.ok) {
      const errorText = await initResponse.text()
      console.error(`❌ Initialize failed: ${errorText}`)
      return
    }

    const initData = await initResponse.json()
    console.log("✅ Initialize successful")
    console.log("📋 Initialize response:", JSON.stringify(initData, null, 2))
    console.log()

    // Step 2: List tools
    console.log("📤 Step 2: Sending tools/list request...")
    const toolsRequest = {
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

    console.log(`📥 Tools/list response status: ${toolsResponse.status}`)

    if (!toolsResponse.ok) {
      const errorText = await toolsResponse.text()
      console.error(`❌ Tools/list failed: ${errorText}`)
      return
    }

    const toolsData = await toolsResponse.json()
    console.log("✅ Tools/list successful")
    console.log("📋 Tools response:", JSON.stringify(toolsData, null, 2))

    if (toolsData.result?.tools) {
      console.log(`\n🎉 Found ${toolsData.result.tools.length} tools:`)
      toolsData.result.tools.forEach((tool: any, idx: number) => {
        console.log(`  ${idx + 1}. ${tool.name} - ${tool.description || "No description"}`)
      })
    } else {
      console.log("⚠️  No tools found in response")
    }
  } catch (error: any) {
    console.error("❌ Error testing Notion MCP:", error)
    console.error("Stack:", error.stack)
  }
}

testNotionMCP().catch(console.error)


