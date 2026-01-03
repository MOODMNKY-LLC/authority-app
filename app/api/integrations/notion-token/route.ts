import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encryptApiKey, decryptApiKey } from "@/lib/encryption"
import { Client } from "@notionhq/client"

/**
 * Save and verify Notion integration token
 */
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
    const { token } = body

    if (!token || !token.trim()) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // Verify token by calling Notion API
    let verified = false
    let userInfo: any = null

    try {
      const notion = new Client({ auth: token })
      const me = await notion.users.me({})

      verified = true
      userInfo = {
        id: me.id,
        name: me.name || null,
        email: (me as any).person?.email || null,
        type: me.type,
      }
    } catch (error: any) {
      verified = false
      userInfo = null
    }

    // Encrypt token before storage - this will overwrite any existing encrypted token
    const encryptedToken = await encryptApiKey(token)

    // Update user settings - explicitly overwrite old token and update verification
    const { error: updateError } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: user.id,
          notion_token: encryptedToken, // New encrypted token overwrites old one
          notion_token_verified: verified, // Update verification status
          notion_token_user_info: userInfo, // Update user info (or null if verification failed)
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      verified,
      userInfo,
    })
  } catch (error: any) {
    console.error("[Authority] Error saving Notion token:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save token" },
      { status: 500 }
    )
  }
}

/**
 * Get Notion integration token status
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
      .select("notion_token, notion_token_verified, notion_token_user_info")
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      hasToken: !!settings?.notion_token,
      verified: settings?.notion_token_verified || false,
      userInfo: settings?.notion_token_user_info || null,
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching Notion token status:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch token status" },
      { status: 500 }
    )
  }
}


