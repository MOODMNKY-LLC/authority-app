import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"

/**
 * Verify N8n API key and return user information
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
        .select("n8n_api_key")
        .eq("user_id", user.id)
        .single()
      
      if (settings?.n8n_api_key) {
        try {
          const { decryptApiKey } = await import("@/lib/encryption")
          keyToVerify = await decryptApiKey(settings.n8n_api_key)
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

    // Get N8n host from environment (hardcoded)
    let n8nHost = process.env.NEXT_PUBLIC_N8N_HOST || process.env.N8N_HOST || "https://slade-n8n.moodmnky.com"
    // Ensure host has protocol
    if (!n8nHost.startsWith("http://") && !n8nHost.startsWith("https://")) {
      n8nHost = `https://${n8nHost}`
    }

    // Verify API key by calling N8n API
    // Use /api/v1/workflows endpoint with limit=1 to verify the key works
    // The /api/v1/me endpoint doesn't exist in n8n, so we verify by fetching workflows
    try {
      const response = await fetch(`${n8nHost}/api/v1/workflows?limit=1`, {
        headers: {
          "X-N8N-API-KEY": keyToVerify,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[N8n] Verification failed: ${response.status} ${response.statusText}`, errorText)
        return NextResponse.json(
          {
            verified: false,
            error: `N8n API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`,
          },
          { status: 200 } // Return 200 but with verified: false
        )
      }

      const workflows = await response.json()
      // If we get a response (even empty array), the key is valid
      // n8n doesn't provide user info in workflows endpoint, so we create a generic userInfo
      const userInfo = {
        name: "N8n User",
        workflowCount: Array.isArray(workflows) ? workflows.length : 0,
      }

      // Update user settings with verification status
      await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            n8n_verified: true,
            n8n_user_info: userInfo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      return NextResponse.json({
        verified: true,
        userInfo: {
          name: userInfo.name || "N8n User",
          email: userInfo.email || null,
          id: userInfo.id || null,
          workflowCount: userInfo.workflowCount || 0,
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
    console.error("[Authority] Error verifying N8n API key:", error)
    return NextResponse.json(
      { error: error.message || "Failed to verify API key" },
      { status: 500 }
    )
  }
}


