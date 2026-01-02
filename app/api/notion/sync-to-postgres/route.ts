import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"
import crypto from "crypto"

/**
 * Sync Notion database content to PostgreSQL sync tables
 * This endpoint can be called manually or by cron jobs
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Parse request body (handle empty body)
    let body: any = {}
    try {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      // Empty body is okay - will sync all databases for authenticated user
    }

    const { database_id, database_name, user_id: provided_user_id } = body

    // Determine target user ID
    let targetUserId: string | null = null

    if (provided_user_id) {
      // For cron jobs: user_id provided in body
      targetUserId = provided_user_id
    } else {
      // For authenticated requests: use current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        return NextResponse.json(
          {
            success: false,
            error: "Not authenticated. Provide user_id in body or authenticate.",
          },
          { status: 401 },
        )
      }
      targetUserId = user.id
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "user_id required",
        },
        { status: 400 },
      )
    }

    // Get user's Notion settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_databases")
      .eq("user_id", targetUserId)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not connected",
        },
        { status: 400 },
      )
    }

    const notionToken = settings.notion_access_token || settings.notion_token
    if (!notionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion token not found",
        },
        { status: 400 },
      )
    }

    // If database_id not provided, sync all databases
    if (!database_id) {
      const databases = settings.notion_databases || {}
      const results: Array<{ database_name: string; synced_count: number; status: string }> = []

      for (const [dbName, dbId] of Object.entries(databases)) {
        try {
          const result = await syncDatabase(supabase, notionToken, targetUserId, dbId as string, dbName)
          results.push({
            database_name: dbName,
            synced_count: result.syncedCount,
            status: result.error ? `error: ${result.error}` : "success",
          })
        } catch (error: any) {
          results.push({
            database_name: dbName,
            synced_count: 0,
            status: `error: ${error.message}`,
          })
        }
      }

      return NextResponse.json({
        success: true,
        results,
      })
    }

    // Sync single database
    const result = await syncDatabase(supabase, notionToken, targetUserId, database_id, database_name)

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      synced_count: result.syncedCount,
      database_name,
    })
  } catch (error: any) {
    console.error("[Authority] Error syncing Notion to PostgreSQL:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to sync Notion data",
      },
      { status: 500 },
    )
  }
}

/**
 * Sync a single Notion database to PostgreSQL
 */
async function syncDatabase(
  supabase: ReturnType<typeof createServerClient>,
  notionToken: string,
  userId: string,
  databaseId: string,
  databaseName: string,
) {
  const notion = new Client({ auth: notionToken })
  let syncedCount = 0
  let hasMore = true
  let startCursor: string | undefined

  // Determine which sync table to use
  const tableMapping: Record<string, string> = {
    Characters: "notion_characters_sync",
    Worlds: "notion_worlds_sync",
    Stories: "notion_stories_sync",
    "Chat Sessions": "notion_chat_sessions_sync",
  }

  const syncTable = tableMapping[databaseName] || "notion_pages_sync"

  // Query all pages from Notion database with pagination
  while (hasMore) {
    const query = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: startCursor,
    })

    for (const page of query.results) {
      try {
        const extracted = extractNotionPageData(page, databaseName)
        const contentHash = generateContentHash(extracted.properties, page.last_edited_time)

        // Check if page already exists and if it needs updating
        const { data: existing } = await supabase
          .from(syncTable)
          .select("content_hash")
          .eq("notion_page_id", page.id)
          .eq("user_id", userId)
          .maybeSingle()

        // Skip if content hasn't changed
        if (existing && existing.content_hash === contentHash) {
          continue
        }

        // Prepare data for upsert
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
          syncData.message_count = extracted.messageCount || 0
        } else {
          // notion_pages_sync
          syncData.title = extracted.name
          syncData.content = extracted.description
          syncData.database_name = databaseName
        }

        // Upsert into sync table
        const { error: upsertError } = await supabase
          .from(syncTable)
          .upsert(syncData, {
            onConflict: "notion_page_id,user_id",
          })

        if (upsertError) {
          console.error(`[Authority] Error upserting page ${page.id}:`, upsertError)
          continue
        }

        syncedCount++
      } catch (pageError: any) {
        console.error(`[Authority] Error processing page ${page.id}:`, pageError)
        continue
      }
    }

    hasMore = query.has_more
    startCursor = query.next_cursor || undefined
  }

  return { syncedCount, error: null }
}

/**
 * Extract relevant data from a Notion page based on database type
 */
function extractNotionPageData(page: any, databaseName: string) {
  const properties = page.properties || {}
  let name = ""
  let description = ""
  let messageCount = 0

  // Extract title/name (first title property)
  const titleProp = Object.values(properties).find((prop: any) => prop.type === "title" && prop.title?.length > 0)
  if (titleProp && (titleProp as any).title) {
    name = (titleProp as any).title.map((t: any) => t.plain_text).join("")
  }

  // Extract description based on database type
  if (databaseName === "Characters") {
    const descProp = properties["Description"] || properties["Bio"] || properties["Backstory"]
    if (descProp?.type === "rich_text" && descProp.rich_text) {
      description = descProp.rich_text.map((t: any) => t.plain_text).join("")
    }
  } else if (databaseName === "Worlds") {
    const descProp = properties["Concept/Premise"] || properties["Description"] || properties["Overview"]
    if (descProp?.type === "rich_text" && descProp.rich_text) {
      description = descProp.rich_text.map((t: any) => t.plain_text).join("")
    }
  } else if (databaseName === "Stories") {
    const descProp = properties["Premise"] || properties["Description"] || properties["Synopsis"]
    if (descProp?.type === "rich_text" && descProp.rich_text) {
      description = descProp.rich_text.map((t: any) => t.plain_text).join("")
    }
  } else if (databaseName === "Chat Sessions") {
    const transcriptProp = properties["Raw Transcript"] || properties["Transcript"]
    if (transcriptProp?.type === "rich_text" && transcriptProp.rich_text) {
      description = transcriptProp.rich_text.map((t: any) => t.plain_text).join("")
    }
    const countProp = properties["Message Count"]
    if (countProp?.type === "number") {
      messageCount = countProp.number || 0
    }
  } else {
    // Generic: try common description fields
    const descProp = properties["Description"] || properties["Notes"] || properties["Content"]
    if (descProp?.type === "rich_text" && descProp.rich_text) {
      description = descProp.rich_text.map((t: any) => t.plain_text).join("")
    }
  }

  return {
    name: name || "Untitled",
    description,
    properties,
    messageCount,
  }
}

/**
 * Generate content hash for change detection
 */
function generateContentHash(properties: any, lastEditedTime: string): string {
  const hashInput = JSON.stringify(properties) + lastEditedTime
  return crypto.createHash("md5").update(hashInput).digest("hex")
}

