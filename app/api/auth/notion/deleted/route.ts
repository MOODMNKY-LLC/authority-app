import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Deleted Token Callback URL
 * Called by Notion when a user removes your integration
 * 
 * This endpoint handles cleanup when a user disconnects Notion
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, workspace_id } = body

    if (!user_id && !workspace_id) {
      return NextResponse.json(
        { error: "Missing user_id or workspace_id" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find user by workspace_id or user_id
    let userId: string | null = null

    if (workspace_id) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("user_id")
        .eq("notion_workspace_id", workspace_id)
        .single()

      userId = settings?.user_id || null
    } else if (user_id) {
      userId = user_id
    }

    if (!userId) {
      console.warn("[Authority] Could not find user for deleted token callback:", { user_id, workspace_id })
      return NextResponse.json({ success: true, message: "User not found, no cleanup needed" })
    }

    // Clean up user's Notion settings
    const { error } = await supabase
      .from("user_settings")
      .update({
        notion_access_token: null,
        notion_token: null,
        notion_workspace_id: null,
        notion_databases: null,
        notion_template_page_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) {
      console.error("[Authority] Error cleaning up Notion settings:", error)
      return NextResponse.json(
        { error: "Failed to clean up settings" },
        { status: 500 }
      )
    }

    console.log(`[Authority] Cleaned up Notion settings for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: "Notion integration removed successfully",
    })
  } catch (error: any) {
    console.error("[Authority] Deleted token callback error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}



