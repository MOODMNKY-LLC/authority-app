import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"

/**
 * Verify AI Provider API key and return user information
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
    const { provider, apiKey } = body

    if (!apiKey || !provider) {
      return NextResponse.json({ error: "API key and provider required" }, { status: 400 })
    }

    // Verify API key based on provider
    try {
      let userInfo: any = null
      let verified = false

      switch (provider.toLowerCase()) {
        case "openai":
          {
            const response = await fetch("https://api.openai.com/v1/models", {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            })
            if (response.ok) {
              verified = true
              // OpenAI doesn't have a user endpoint, so we'll use a generic response
              userInfo = {
                name: "OpenAI User",
                provider: "openai",
              }
            } else {
              throw new Error(`OpenAI API error: ${response.status}`)
            }
          }
          break

        case "anthropic":
          {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-3-opus-20240229",
                max_tokens: 10,
                messages: [{ role: "user", content: "test" }],
              }),
            })
            // Even if it fails due to model, a 401 means invalid key
            if (response.status === 401) {
              throw new Error("Invalid API key")
            }
            verified = true
            userInfo = {
              name: "Anthropic User",
              provider: "anthropic",
            }
          }
          break

        default:
          // For other providers, just mark as verified if key is provided
          verified = true
          userInfo = {
            name: `${provider} User`,
            provider: provider,
          }
      }

      // Update user settings with verification status
      await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            ai_provider_verified: verified,
            ai_provider_user_info: userInfo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      return NextResponse.json({
        verified,
        userInfo,
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
    console.error("[Authority] Error verifying AI provider API key:", error)
    return NextResponse.json(
      { error: error.message || "Failed to verify API key" },
      { status: 500 }
    )
  }
}



