import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"

/**
 * Verify Flowise API key and return user information
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
    const { apiKey } = body

    // If no API key provided, try to get it from saved settings
    let keyToVerify = apiKey
    if (!keyToVerify) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("flowise_api_key")
        .eq("user_id", user.id)
        .single()
      
      if (settings?.flowise_api_key) {
        try {
          const { decryptApiKey } = await import("@/lib/encryption")
          keyToVerify = await decryptApiKey(settings.flowise_api_key)
        } catch (decryptError) {
          return NextResponse.json(
            {
              verified: false,
              error: "Failed to decrypt saved API key",
            },
            { status: 200 }
          )
        }
      }
    }

    if (!keyToVerify) {
      return NextResponse.json({ error: "API key required" }, { status: 400 })
    }

    // Get Flowise host from environment (hardcoded)
    let flowiseHost = process.env.NEXT_PUBLIC_FLOWISE_HOST || process.env.FLOWISE_HOST || "https://flowise.ai"
    // Ensure host has protocol
    if (!flowiseHost.startsWith("http://") && !flowiseHost.startsWith("https://")) {
      flowiseHost = `https://${flowiseHost}`
    }

    // Verify API key by calling Flowise API
    // Use /api/v1/chatflows endpoint with limit=1 to verify the key works
    try {
      const response = await fetch(`${flowiseHost}/api/v1/chatflows?limit=1`, {
        headers: {
          Authorization: `Bearer ${keyToVerify}`,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Flowise] Verification failed: ${response.status} ${response.statusText}`, errorText)
        return NextResponse.json(
          {
            verified: false,
            error: `Flowise API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`,
          },
          { status: 200 } // Return 200 but with verified: false
        )
      }

      const chatflows = await response.json()
      // If we get a response (even empty array), the key is valid
      const userInfo = {
        name: "Flowise User",
        chatflowCount: Array.isArray(chatflows) ? chatflows.length : 0,
      }

      // Update user settings with verification status
      await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            flowise_verified: true,
            flowise_user_info: userInfo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      return NextResponse.json({
        verified: true,
        userInfo: {
          name: userInfo.name || "Flowise User",
          email: userInfo.email || null,
          id: userInfo.id || null,
          chatflowCount: userInfo.chatflowCount || 0,
        },
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          verified: false,
          error: error.message || "Failed to verify API key",
        },
        { status: 200 }
      )
    }
  } catch (error: any) {
    console.error("[Authority] Error verifying Flowise API key:", error)
    return NextResponse.json(
      { error: error.message || "Failed to verify API key" },
      { status: 500 }
    )
  }
}


