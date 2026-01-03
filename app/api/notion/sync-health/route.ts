import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Get sync health status for all databases
 * Returns last synced time, health status, and property completeness
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      )
    }

    // Get user settings to find synced databases
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_databases")
      .eq("user_id", user.id)
      .single()

    const databases = settings?.notion_databases || {}
    if (typeof databases === "string") {
      try {
        JSON.parse(databases)
      } catch {
        // If parsing fails, treat as empty
      }
    }

    const healthStatus: Record<string, {
      databaseId: string
      databaseName: string
      lastSynced: string | null
      health: "healthy" | "stale" | "never_synced" | "error"
      pageCount: number
      syncedPageCount: number
      propertyCompleteness: number | null // Percentage of properties synced
      status: "synced" | "pending" | "error"
    }> = {}

    // Check each database
    for (const [databaseName, databaseId] of Object.entries(databases)) {
      if (!databaseId || typeof databaseId !== "string") {
        continue
      }

      // Determine which sync table to query based on database name
      let syncTable: string
      let nameField: string
      
      if (databaseName === "Characters") {
        syncTable = "notion_characters_sync"
        nameField = "name"
      } else if (databaseName === "Worlds") {
        syncTable = "notion_worlds_sync"
        nameField = "name"
      } else if (databaseName === "Stories") {
        syncTable = "notion_stories_sync"
        nameField = "title"
      } else {
        syncTable = "notion_pages_sync"
        nameField = "title"
      }

      // Get sync statistics for this database
      let query = supabase
        .from(syncTable)
        .select("last_synced_at, properties, notion_page_id", { count: "exact" })
        .eq("user_id", user.id)

      if (syncTable === "notion_pages_sync") {
        query = query.eq("database_name", databaseName)
      }

      const { data: syncData, error: syncError, count } = await query

      if (syncError) {
        healthStatus[databaseName] = {
          databaseId,
          databaseName,
          lastSynced: null,
          health: "error",
          pageCount: 0,
          syncedPageCount: 0,
          propertyCompleteness: null,
          status: "error",
        }
        continue
      }

      // Calculate last synced time
      // Check both: pages synced TO Notion (notion_page_id set) and pages synced FROM Notion (last_synced_at)
      const syncedPages = syncData?.filter((item) => item.notion_page_id !== null) || []
      const lastSyncedTimes = syncData
        ?.map((item) => item.last_synced_at)
        .filter(Boolean)
        .map((time) => new Date(time).getTime()) || []
      
      // Also check if database was discovered (exists in user_settings)
      const databaseDiscovered = !!databaseId
      
      const lastSynced = lastSyncedTimes.length > 0
        ? new Date(Math.max(...lastSyncedTimes)).toISOString()
        : databaseDiscovered
          ? new Date().toISOString() // If database is discovered but no sync data, consider it just discovered
          : null

      // Determine health status
      let health: "healthy" | "stale" | "never_synced" | "error" = "never_synced"
      if (lastSynced) {
        const hoursSinceSync = (Date.now() - new Date(lastSynced).getTime()) / (1000 * 60 * 60)
        if (hoursSinceSync < 1) {
          health = "healthy"
        } else if (hoursSinceSync < 24) {
          health = "stale"
        } else {
          health = "stale" // Consider stale if older than 24 hours
        }
      } else if (databaseDiscovered) {
        // Database is discovered but no sync data yet - consider it "healthy" (just discovered)
        health = "healthy"
      }

      // Calculate property completeness
      // This is a rough estimate: count how many synced pages have properties vs empty
      let propertyCompleteness: number | null = null
      if (syncedPages.length > 0) {
        const pagesWithProperties = syncedPages.filter(
          (item) => item.properties && typeof item.properties === "object" && Object.keys(item.properties).length > 0
        ).length
        propertyCompleteness = Math.round((pagesWithProperties / syncedPages.length) * 100)
      }

      // Status: "synced" if database is discovered AND has pages (either synced to Notion or synced from Notion)
      // "pending" if database is discovered but no pages yet
      // "error" if there was an error
      let status: "synced" | "pending" | "error" = "pending"
      if (databaseDiscovered) {
        if (count && count > 0) {
          status = "synced"
        } else {
          status = "pending" // Database discovered but no pages yet
        }
      }
      
      healthStatus[databaseName] = {
        databaseId,
        databaseName,
        lastSynced,
        health,
        pageCount: count || 0,
        syncedPageCount: syncedPages.length,
        propertyCompleteness,
        status,
      }
    }

    return NextResponse.json({
      success: true,
      healthStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Authority] Sync health error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get sync health" },
      { status: 500 },
    )
  }
}

