import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * Setup FDW server and tables for the current user
 * This should be called when user connects Notion or manually
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

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

    // Check if user has Notion token
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_token, notion_access_token, notion_fdw_server, notion_fdw_schema")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        {
          success: false,
          error: "User settings not found",
        },
        { status: 404 },
      )
    }

    const hasToken = !!(settings.notion_token || settings.notion_access_token)
    if (!hasToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not connected. Please connect your Notion account first.",
        },
        { status: 400 },
      )
    }

    // Create FDW server and tables
    const { data: result, error } = await supabase.rpc("create_user_notion_fdw_tables", {
      p_user_id: user.id,
    })

    if (error) {
      console.error("[Authority] Error setting up FDW:", error)
      
      // Check if wrappers extension is available
      if (error.message?.includes("does not exist") || error.message?.includes("wrappers")) {
        return NextResponse.json(
          {
            success: false,
            error: "FDW not available",
            message: "Notion FDW requires wrappers extension. Please enable it in your Supabase project dashboard: Database → Extensions → wrappers",
            details: error.message,
          },
          { status: 503 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to setup FDW",
        },
        { status: 500 },
      )
    }

    // Get updated settings to return server/schema names
    const { data: updatedSettings } = await supabase
      .from("user_settings")
      .select("notion_fdw_server, notion_fdw_schema")
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: "FDW setup completed",
      server: updatedSettings?.notion_fdw_server,
      schema: updatedSettings?.notion_fdw_schema,
    })
  } catch (error: any) {
    console.error("[Authority] Error in FDW setup endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to setup FDW",
      },
      { status: 500 },
    )
  }
}




