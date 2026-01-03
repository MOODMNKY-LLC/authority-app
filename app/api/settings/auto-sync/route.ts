import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 },
      )
    }

    const { enabled } = await request.json()

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "enabled must be a boolean",
        },
        { status: 400 },
      )
    }

    // Update auto_sync_enabled in user_settings
    const { error: updateError } = await supabase
      .from("user_settings")
      .update({ auto_sync_enabled: enabled })
      .eq("user_id", user.id)

    if (updateError) {
      console.error("[Authority] Error updating auto sync setting:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: updateError.message || "Failed to update auto sync setting",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      autoSyncEnabled: enabled,
      message: enabled 
        ? "Automatic syncing enabled. Your databases will sync every 15 minutes."
        : "Automatic syncing disabled. Use manual sync buttons to sync your databases.",
    })
  } catch (error: any) {
    console.error("[Authority] Auto sync setting error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update auto sync setting",
      },
      { status: 500 },
    )
  }
}


