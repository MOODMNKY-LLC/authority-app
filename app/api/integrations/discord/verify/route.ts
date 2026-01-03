import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"

/**
 * Verify Discord webhook URL by sending a test message
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
    const { webhookUrl } = body

    // If no webhook URL provided, try to get it from saved settings
    let urlToVerify = webhookUrl
    if (!urlToVerify) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("discord_webhook_url")
        .eq("user_id", user.id)
        .single()
      
      if (settings?.discord_webhook_url) {
        try {
          urlToVerify = await decryptApiKey(settings.discord_webhook_url)
        } catch (decryptError) {
          return NextResponse.json(
            {
              verified: false,
              error: "Failed to decrypt saved webhook URL",
            },
            { status: 200 }
          )
        }
      }
    }

    if (!urlToVerify) {
      return NextResponse.json({ error: "Webhook URL required" }, { status: 400 })
    }

    // Verify webhook URL by sending a test message
    try {
      const response = await fetch(urlToVerify, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: "✅ Authority Discord integration verified successfully!",
          embeds: [
            {
              title: "Verification Test",
              description: "This is a test message to verify your Discord webhook connection.",
              color: 0x5865f2, // Discord blurple
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Discord] Webhook verification failed: ${response.status} ${response.statusText}`, errorText)
        return NextResponse.json(
          {
            verified: false,
            error: `Discord webhook error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`,
          },
          { status: 200 } // Return 200 but with verified: false
        )
      }

      // Discord webhooks return 204 No Content on success, or 200 with empty body
      // Both are valid success responses

      // Update user settings with verification status
      await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            discord_webhook_verified: true,
            discord_webhook_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      return NextResponse.json({
        verified: true,
        message: "Webhook URL verified successfully. Check your Discord channel for the test message.",
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          verified: false,
          error: error.message || "Failed to verify webhook URL",
        },
        { status: 200 }
      )
    }
  } catch (error: any) {
    console.error("[Authority] Error verifying Discord webhook:", error)
    return NextResponse.json(
      { error: error.message || "Failed to verify webhook URL" },
      { status: 500 },
    )
  }
}

