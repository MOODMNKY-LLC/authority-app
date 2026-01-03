import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encryptApiKey } from "@/lib/encryption"

// Hardcoded Discord bot client ID (from .env)
// Use DISCORD_APPLICATION_ID if NEXT_PUBLIC_DISCORD_CLIENT_ID is not set
// Also check DISCORD_CLIENT_ID as fallback
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || ""
// Discord bot permissions: SEND_MESSAGES (2048) + MANAGE_WEBHOOKS (536870912) + READ_MESSAGES (1024)
const DISCORD_PERMISSIONS = "536875024" // Combined permissions for bot functionality
// Scopes: bot (required) + applications.commands (for slash commands, optional but recommended)
const DISCORD_SCOPES = "bot%20applications.commands"
const DISCORD_BOT_INVITE_URL = DISCORD_CLIENT_ID
  ? `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${DISCORD_PERMISSIONS}&scope=${DISCORD_SCOPES}`
  : null

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
      .select("discord_webhook_url, discord_webhook_verified, discord_webhook_verified_at")
      .eq("user_id", user.id)
      .single()

    return NextResponse.json({
      webhookUrl: settings?.discord_webhook_url || null,
      verified: settings?.discord_webhook_verified || false,
      verifiedAt: settings?.discord_webhook_verified_at || null,
      botInviteUrl: DISCORD_BOT_INVITE_URL, // Hardcoded from .env
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching Discord settings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch Discord settings" },
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
    const { webhookUrl } = body

    // Prepare update object - explicitly clear old values when saving new key
    const updateData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    // Encrypt webhook URL before storage (contains sensitive info)
    if (webhookUrl && webhookUrl.trim() !== "") {
      // New webhook URL provided - encrypt and save, clear old verification status
      updateData.discord_webhook_url = await encryptApiKey(webhookUrl)
      updateData.discord_webhook_verified = false // Clear verification until new URL is verified
      updateData.discord_webhook_verified_at = null // Clear verification timestamp
    } else {
      // Empty/null URL - explicitly clear everything
      updateData.discord_webhook_url = null
      updateData.discord_webhook_verified = false
      updateData.discord_webhook_verified_at = null
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(updateData, { onConflict: "user_id" })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Error saving Discord settings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save Discord settings" },
      { status: 500 }
    )
  }
}

