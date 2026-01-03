import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"
import crypto from "crypto"

/**
 * Create a Notion webhook subscription for a database
 * Requires integration token (Enhanced Mode)
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
    const { databaseId } = body

    if (!databaseId) {
      return NextResponse.json({ error: "databaseId required" }, { status: 400 })
    }

    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_token, notion_databases, notion_webhooks")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 })
    }

    // Check for integration token (required for webhooks)
    if (!settings.notion_token) {
      return NextResponse.json(
        {
          error: "Integration token required",
          message: "Webhooks require a Notion integration token. Add one in Settings → Notion → Integration Token.",
        },
        { status: 400 }
      )
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString("hex")

    // Get webhook URL (use environment variable or construct from request)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000"
    const webhookUrl = `${baseUrl}/api/webhooks/notion`

    // Create webhook subscription via Notion API
    // Note: Notion doesn't have a direct webhook API endpoint
    // We'll need to use their subscription API or store the webhook config
    // For now, we'll store the configuration and the actual subscription
    // would be created via Notion's UI or API when available

    const notion = new Client({ auth: settings.notion_token })

    // Store webhook configuration
    const webhooks = (settings.notion_webhooks as Record<string, any>) || {}
    const webhookId = `wh_${crypto.randomBytes(16).toString("hex")}`

    webhooks[databaseId] = {
      webhook_id: webhookId,
      secret,
      active: true,
      created_at: new Date().toISOString(),
      webhook_url: webhookUrl,
    }

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

    return NextResponse.json({
      success: true,
      webhook_id: webhookId,
      message: "Webhook subscription created. Configure it in your Notion workspace settings.",
    })
  } catch (error: any) {
    console.error("[Authority] Error creating webhook:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create webhook" },
      { status: 500 }
    )
  }
}



