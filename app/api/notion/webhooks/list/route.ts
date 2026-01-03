import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * List all Notion webhook subscriptions for the user
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_webhooks, notion_databases")
      .eq("user_id", user.id)
      .single()

    const webhooks = (settings?.notion_webhooks as Record<string, any>) || {}
    const databases = (settings?.notion_databases as Record<string, string>) || {}

    // Format webhooks with database names
    const formatted = Object.entries(webhooks).map(([databaseId, webhookData]) => {
      const databaseName = Object.keys(databases).find(
        (name) => databases[name] === databaseId
      )

      return {
        database_id: databaseId,
        database_name: databaseName || "Unknown",
        webhook_id: webhookData?.webhook_id,
        active: webhookData?.active || false,
        created_at: webhookData?.created_at,
      }
    })

    return NextResponse.json({ webhooks: formatted })
  } catch (error: any) {
    console.error("[Authority] Error listing webhooks:", error)
    return NextResponse.json(
      { error: error.message || "Failed to list webhooks" },
      { status: 500 }
    )
  }
}



