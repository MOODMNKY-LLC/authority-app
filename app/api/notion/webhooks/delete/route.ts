import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Delete a Notion webhook subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const databaseId = searchParams.get("database_id")

    if (!databaseId) {
      return NextResponse.json({ error: "database_id required" }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_webhooks")
      .eq("user_id", user.id)
      .single()

    const webhooks = (settings?.notion_webhooks as Record<string, any>) || {}

    // Remove webhook for this database
    delete webhooks[databaseId]

    // Update user settings
    const { error: updateError } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          notion_webhooks: webhooks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Error deleting webhook:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete webhook" },
      { status: 500 }
    )
  }
}



