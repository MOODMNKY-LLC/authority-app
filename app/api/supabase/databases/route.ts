import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Known tables in the Authority app
const KNOWN_TABLES = [
  { name: "messages", type: "chat", userColumn: "user_id" },
  { name: "chats", type: "chat", userColumn: "user_id" },
  { name: "projects", type: "project", userColumn: "user_id" },
  { name: "characters", type: "forge", userColumn: "user_id" },
  { name: "worlds", type: "forge", userColumn: "user_id" },
  { name: "stories", type: "forge", userColumn: "user_id" },
  { name: "user_profiles", type: "user", userColumn: "user_id" },
  { name: "user_settings", type: "user", userColumn: "user_id" },
  { name: "generated_images", type: "image", userColumn: "user_id" },
  { name: "notion_characters_sync", type: "sync", userColumn: "user_id" },
  { name: "notion_worlds_sync", type: "sync", userColumn: "user_id" },
  { name: "notion_stories_sync", type: "sync", userColumn: "user_id" },
  { name: "notion_pages_sync", type: "sync", userColumn: "user_id" },
  { name: "notion_chat_sessions_sync", type: "sync", userColumn: "user_id" },
]

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Query known tables and get row counts for user-specific data
    const databases = await Promise.all(
      KNOWN_TABLES.map(async (table) => {
        try {
          // Try to get count with user filter
          const { count, error } = await supabase
            .from(table.name)
            .select("*", { count: "exact", head: true })
            .eq(table.userColumn, user.id)
            .limit(1)

          if (error) {
            // If user-specific query fails, try without filter (for tables like user_profiles)
            const { count: totalCount } = await supabase
              .from(table.name)
              .select("*", { count: "exact", head: true })
              .limit(1)

            return {
              name: table.name,
              rowCount: totalCount || 0,
              type: table.type,
              userRows: 0,
            }
          }

          // Also get total count
          const { count: totalCount } = await supabase
            .from(table.name)
            .select("*", { count: "exact", head: true })
            .limit(1)

          return {
            name: table.name,
            rowCount: totalCount || 0,
            userRows: count || 0,
            type: table.type,
          }
        } catch (err) {
          // Table might not exist or be accessible
          return {
            name: table.name,
            rowCount: 0,
            userRows: 0,
            type: table.type,
            error: "Table not accessible",
          }
        }
      })
    )

    return NextResponse.json({ databases })
  } catch (error: any) {
    console.error("[Authority] Error fetching Supabase databases:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch databases" },
      { status: 500 }
    )
  }
}

