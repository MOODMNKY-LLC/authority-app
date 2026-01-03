import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"
import crypto from "crypto"

/**
 * Notion Webhook Endpoint
 * 
 * Handles inbound webhooks from Notion for real-time sync updates.
 * Supports both verification challenges and event processing.
 * 
 * Webhook events:
 * - page.created
 * - page.updated
 * - page.deleted
 */

export async function GET(request: NextRequest) {
  // Handle webhook verification challenge
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get("challenge")

  if (challenge) {
    return NextResponse.json({ challenge })
  }

  return NextResponse.json({ error: "Challenge parameter required" }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const signature = request.headers.get("x-notion-signature")
    const body = await request.text()
    const payload = JSON.parse(body)

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    // Find user by webhook_id in payload
    const webhookId = payload.webhook_id
    if (!webhookId) {
      return NextResponse.json({ error: "Missing webhook_id" }, { status: 400 })
    }

    // Find user with this webhook_id
    const { data: settingsList, error: findError } = await supabase
      .from("user_settings")
      .select("user_id, notion_webhooks, notion_token")
      .not("notion_webhooks", "is", null)

    if (findError || !settingsList) {
      return NextResponse.json({ error: "Failed to find webhook" }, { status: 500 })
    }

    let targetUserId: string | null = null
    let webhookSecret: string | null = null

    // Find the user who owns this webhook
    for (const settings of settingsList) {
      const webhooks = settings.notion_webhooks as Record<string, any> || {}
      for (const [databaseId, webhookData] of Object.entries(webhooks)) {
        if (webhookData?.webhook_id === webhookId) {
          targetUserId = settings.user_id
          webhookSecret = webhookData?.secret
          break
        }
      }
      if (targetUserId) break
    }

    if (!targetUserId || !webhookSecret) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 })
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex")

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Process webhook events
    const events = payload.events || []
    const results = []

    for (const event of events) {
      try {
        const result = await processWebhookEvent(
          supabase,
          targetUserId,
          settingsList.find(s => s.user_id === targetUserId)?.notion_token || "",
          event
        )
        results.push(result)
      } catch (error: any) {
        console.error(`[Authority] Error processing webhook event:`, error)
        results.push({
          event_id: event.id,
          status: "error",
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error: any) {
    console.error("[Authority] Webhook error:", error)
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    )
  }
}

/**
 * Process a single webhook event
 */
async function processWebhookEvent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  notionToken: string,
  event: any
) {
  const { object, type } = event

  if (type !== "page.created" && type !== "page.updated" && type !== "page.deleted") {
    return {
      event_id: event.id,
      status: "skipped",
      reason: "Unsupported event type",
    }
  }

  const pageId = object.id
  const databaseId = object.parent?.database_id

  if (!pageId || !databaseId) {
    return {
      event_id: event.id,
      status: "skipped",
      reason: "Missing page_id or database_id",
    }
  }

  // Determine sync table based on database_id
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("notion_databases")
    .eq("user_id", userId)
    .single()

  const databases = (userSettings?.notion_databases as Record<string, string>) || {}
  const databaseName = Object.keys(databases).find(
    (name) => databases[name] === databaseId
  )

  if (!databaseName) {
    return {
      event_id: event.id,
      status: "skipped",
      reason: "Database not synced",
    }
  }

  // Map database name to sync table
  const tableMapping: Record<string, string> = {
    Characters: "notion_characters_sync",
    Worlds: "notion_worlds_sync",
    Stories: "notion_stories_sync",
    "Chat Sessions": "notion_chat_sessions_sync",
  }

  const syncTable = tableMapping[databaseName] || "notion_pages_sync"

  if (type === "page.deleted") {
    // Delete from sync table
    const { error } = await supabase
      .from(syncTable)
      .delete()
      .eq("notion_page_id", pageId)
      .eq("user_id", userId)

    if (error) throw error

    // Emit Realtime event
    await supabase.channel(`notion-updates-${userId}`).send({
      type: "broadcast",
      event: "notion_page_deleted",
      payload: { pageId, databaseId, databaseName },
    })

    return {
      event_id: event.id,
      status: "deleted",
      page_id: pageId,
    }
  }

  // For created/updated, fetch full page data from Notion
  const notion = new Client({ auth: notionToken })
  const page = await notion.pages.retrieve({ page_id: pageId })

  // Extract page data (similar to sync-to-postgres logic)
  const extracted = extractNotionPageData(page, databaseName)
  const contentHash = generateContentHash(extracted.properties, page.last_edited_time)

  // Prepare sync data
  const syncData: any = {
    notion_page_id: page.id,
    notion_database_id: databaseId,
    user_id: userId,
    properties: extracted.properties,
    content_hash: contentHash,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date(page.last_edited_time).toISOString(),
  }

  // Add database-specific fields
  if (syncTable === "notion_characters_sync" || syncTable === "notion_worlds_sync") {
    syncData.name = extracted.name
    syncData.description = extracted.description
  } else if (syncTable === "notion_stories_sync") {
    syncData.title = extracted.name
    syncData.description = extracted.description
  } else if (syncTable === "notion_chat_sessions_sync") {
    syncData.title = extracted.name
    syncData.transcript = extracted.description
  } else {
    syncData.title = extracted.name
    syncData.content = extracted.description
    syncData.database_name = databaseName
  }

  // Upsert to sync table
  const { error: upsertError } = await supabase
    .from(syncTable)
    .upsert(syncData, {
      onConflict: "notion_page_id,user_id",
    })

  if (upsertError) throw upsertError

  // Emit Realtime event
  await supabase.channel(`notion-updates-${userId}`).send({
    type: "broadcast",
    event: "notion_page_updated",
    payload: {
      pageId,
      databaseId,
      databaseName,
      type: type === "page.created" ? "created" : "updated",
    },
  })

  return {
    event_id: event.id,
    status: type === "page.created" ? "created" : "updated",
    page_id: pageId,
  }
}

/**
 * Extract Notion page data (simplified version - should match sync-to-postgres logic)
 */
function extractNotionPageData(page: any, databaseName: string) {
  const properties: Record<string, any> = {}
  let name = ""
  let description = ""

  // Extract properties
  if (page.properties) {
    for (const [key, value] of Object.entries(page.properties)) {
      properties[key] = value

      // Extract title/name
      if (value.type === "title" && Array.isArray(value.title)) {
        name = value.title.map((t: any) => t.plain_text).join("")
      }

      // Extract description
      if (
        (key.toLowerCase().includes("description") ||
          key.toLowerCase().includes("bio") ||
          key.toLowerCase().includes("backstory") ||
          key.toLowerCase().includes("premise")) &&
        value.type === "rich_text" &&
        Array.isArray(value.rich_text)
      ) {
        description = value.rich_text.map((t: any) => t.plain_text).join("")
      }
    }
  }

  return { name, description, properties }
}

/**
 * Generate content hash for change detection
 */
function generateContentHash(properties: Record<string, any>, lastEdited: string): string {
  const crypto = require("crypto")
  const content = JSON.stringify({ properties, lastEdited })
  return crypto.createHash("sha256").update(content).digest("hex")
}
