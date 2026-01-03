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
    // Priority: NEXT_PUBLIC_SITE_URL > VERCEL_URL > request origin > localhost
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    
    if (!baseUrl) {
      // Try Vercel URL (automatically set by Vercel)
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`
      }
    }
    
    if (!baseUrl) {
      // Try request origin
      const origin = request.headers.get("origin") || request.headers.get("host")
      if (origin) {
        // Ensure protocol is included
        if (origin.startsWith("http://") || origin.startsWith("https://")) {
          baseUrl = origin
        } else {
          // Add protocol based on environment
          const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
          baseUrl = `${protocol}://${origin}`
        }
      }
    }
    
    // Final fallback
    if (!baseUrl) {
      baseUrl = process.env.NODE_ENV === "production" 
        ? "https://localhost:3000" // Should never happen in production
        : "http://localhost:3000"
    }
    
    // Ensure HTTPS in production
    if (process.env.NODE_ENV === "production" && baseUrl.startsWith("http://")) {
      baseUrl = baseUrl.replace("http://", "https://")
    }
    
    console.log("[Notion OAuth] Base URL:", {
      baseUrl,
      nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      vercelUrl: process.env.VERCEL_URL,
      nodeEnv: process.env.NODE_ENV,
      requestOrigin: request.headers.get("origin"),
      requestHost: request.headers.get("host"),
    })

    // Get Notion OAuth client ID from environment
    const notionClientId = process.env.NOTION_OAUTH_CLIENT_ID
    
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

