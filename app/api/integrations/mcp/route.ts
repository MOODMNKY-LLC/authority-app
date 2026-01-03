import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
      .select("mcp_config")
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      config: settings?.mcp_config || {},
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching MCP config:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch MCP config" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { config } = body

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          mcp_config: config || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Error saving MCP config:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save MCP config" },
      { status: 500 }
    )
  }
}



