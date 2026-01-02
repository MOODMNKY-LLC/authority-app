import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateNotionToken } from "@/lib/notion/validate-token"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // Validate token
    const validation = await validateNotionToken(token)

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error || "Invalid token",
        },
        { status: 200 },
      )
    }

    // Save token to user settings
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      notion_token: token,
      notion_workspace_id: validation.workspaceId,
      notion_bot_id: validation.botId,
    })

    // Setup FDW server and tables for this user (non-blocking)
    try {
      const { error: fdwError } = await supabase.rpc("create_user_notion_fdw_tables", {
        p_user_id: user.id,
      })
      if (fdwError) {
        console.warn("[Authority] FDW setup failed (non-critical):", fdwError.message)
      } else {
        console.log("[Authority] ✅ FDW server and tables created for user")
      }
    } catch (fdwErr) {
      // Non-critical: FDW setup failed, but token validation succeeded
      console.warn("[Authority] FDW setup error (non-critical):", fdwErr)
    }

    return NextResponse.json({
      valid: true,
      workspaceId: validation.workspaceId,
      workspaceName: validation.workspaceName,
    })
  } catch (error: any) {
    console.error("[Authority] Token validation error:", error)
    return NextResponse.json(
      {
        valid: false,
        error: error.message || "Failed to validate token",
      },
      { status: 500 },
    )
  }
}

