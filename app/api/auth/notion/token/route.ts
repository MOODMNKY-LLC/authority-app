import { NextRequest, NextResponse } from "next/server"

/**
 * OAuth Token URL
 * Called by Notion to retrieve an access token for the unfurl callback URL
 * 
 * This endpoint exchanges an authorization code for an access token.
 * Note: The code passed here is actually a token we generated in the callback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, client_id, client_secret, redirect_uri, grant_type } = body

    if (!code || grant_type !== "authorization_code") {
      return NextResponse.json(
        { error: "Invalid request. Code and grant_type=authorization_code required." },
        { status: 400 }
      )
    }

    // Decode the code token we created in the callback
    let actualCode: string
    try {
      const decoded = JSON.parse(Buffer.from(code, "base64").toString())
      actualCode = decoded.code
      
      // Verify code is not too old (10 minutes max)
      const codeAge = Date.now() - decoded.timestamp
      if (codeAge > 600000) {
        return NextResponse.json(
          { error: "Authorization code expired" },
          { status: 400 }
        )
      }
    } catch (error) {
      // If decoding fails, assume it's a direct code (for backwards compatibility)
      actualCode = code
    }

    // Exchange the Notion authorization code for an access token
    // We need to call Notion's token endpoint
    const notionTokenUrl = "https://api.notion.com/v1/oauth/token"
    
    const notionClientId = process.env.NOTION_OAUTH_CLIENT_ID
    const notionClientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET

    if (!notionClientId || !notionClientSecret) {
      return NextResponse.json(
        { error: "Notion OAuth credentials not configured" },
        { status: 500 }
      )
    }

    // Get base URL for redirect_uri
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   "http://localhost:3000"
    const callbackUrl = `${baseUrl}/api/auth/notion/callback`

    // Exchange code with Notion
    const tokenResponse = await fetch(notionTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${notionClientId}:${notionClientSecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: actualCode,
        redirect_uri: callbackUrl,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({ error: "Unknown error" }))
      console.error("[Authority] Notion token exchange error:", error)
      return NextResponse.json(
        { error: error.error || "Failed to exchange code with Notion" },
        { status: tokenResponse.status }
      )
    }

    const tokenData = await tokenResponse.json()

    // Return token in OAuth 2.0 format
    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: "Bearer",
      expires_in: tokenData.expires_in || 3600,
      scope: tokenData.scope || "read",
    })
  } catch (error: any) {
    console.error("[Authority] Token endpoint error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

