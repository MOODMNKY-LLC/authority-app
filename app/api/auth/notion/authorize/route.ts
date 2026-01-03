import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

/**
 * OAuth Authorize URL
 * Used by Notion to initiate user authorization with the integration
 * 
 * This endpoint initiates the OAuth flow for Notion link preview/unfurl.
 * It redirects to Notion's OAuth page, then back to Notion's redirect_uri.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Get OAuth parameters from Notion
    const clientId = searchParams.get("client_id")
    const redirectUri = searchParams.get("redirect_uri")
    const state = searchParams.get("state")
    const responseType = searchParams.get("response_type") || "code"
    
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Missing required parameters: client_id, redirect_uri" },
        { status: 400 }
      )
    }

    // Store redirect_uri and state in cookies for later use
    const cookieStore = await cookies()
    cookieStore.set("notion_oauth_redirect_uri", redirectUri, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    })
    if (state) {
      cookieStore.set("notion_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
      })
    }

    // Get base URL for our callback
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   request.headers.get("origin") ||
                   "http://localhost:3000"

    // Get Notion OAuth client ID from environment
    const notionClientId = process.env.NOTION_OAUTH_CLIENT_ID || "2dcd872b-594c-801d-9629-00377ca43eaa"
    
    if (!notionClientId) {
      return NextResponse.json(
        { error: "Notion OAuth client ID not configured" },
        { status: 500 }
      )
    }

    // Build Notion OAuth URL
    const notionOAuthUrl = new URL("https://api.notion.com/v1/oauth/authorize")
    notionOAuthUrl.searchParams.set("client_id", notionClientId)
    notionOAuthUrl.searchParams.set("redirect_uri", `${baseUrl}/api/auth/notion/callback`)
    notionOAuthUrl.searchParams.set("response_type", responseType)
    if (state) {
      notionOAuthUrl.searchParams.set("state", state)
    }

    // Redirect to Notion OAuth
    return NextResponse.redirect(notionOAuthUrl.toString())
  } catch (error: any) {
    console.error("[Authority] OAuth authorize error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

