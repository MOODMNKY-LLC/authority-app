import { NextRequest, NextResponse } from "next/server"

/**
 * Get Notion Integration URLs
 * Returns all required URLs for configuring Notion webhooks and OAuth
 */
export async function GET() {
  try {
    // Get base URL from environment or construct from request
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   "http://localhost:3000"

    // Remove trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, "")

    return NextResponse.json({
      baseUrl: cleanBaseUrl,
      urls: {
        // Webhook URL (for real-time sync)
        webhook: `${cleanBaseUrl}/api/webhooks/notion`,
        
        // Unfurl callback URL (for link preview/unfurling)
        unfurlCallback: `${cleanBaseUrl}/api/notion/unfurl`,
        
        // OAuth URLs (for link preview/unfurl)
        oauthAuthorize: `${cleanBaseUrl}/api/auth/notion/authorize`,
        oauthToken: `${cleanBaseUrl}/api/auth/notion/token`,
        oauthDeleted: `${cleanBaseUrl}/api/auth/notion/deleted`,
        
        // OAuth callback (for link preview/unfurl OAuth flow)
        oauthCallback: `${cleanBaseUrl}/api/auth/notion/callback`,
        
        // OAuth callback (for user authentication via Supabase)
        userAuthCallback: `${cleanBaseUrl}/auth/callback`,
      },
      configuration: {
        oauthClientId: process.env.NOTION_OAUTH_CLIENT_ID || "2dcd872b-594c-801d-9629-00377ca43eaa",
        oauthScopes: process.env.NOTION_OAUTH_SCOPES || "read",
      },
      instructions: {
        webhook: "Use this URL in Notion's webhook settings for each database",
        unfurlCallback: "Unfurl Callback URL - Called when Notion needs to preview links from your domain. Use this in Notion's integration settings under 'Unfurling domain & patterns'.",
        oauthAuthorize: "OAuth Authorize URL - Used by Notion to initiate user authorization",
        oauthToken: "OAuth Token URL - Called by Notion to retrieve access token",
        oauthDeleted: "Deleted Token Callback URL - Called when user removes integration",
        oauthCallback: "OAuth Callback URL - Used for user authentication flow",
      },
      unfurl: {
        domain: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname : null,
        allowedDomains: process.env.NOTION_UNFURL_DOMAINS?.split(",").map(d => d.trim()) || [],
        note: "Domain verification must be completed in Notion's integration settings. This is a one-time setup process.",
      },
    })
  } catch (error: any) {
    console.error("[Authority] Error generating URLs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate URLs" },
      { status: 500 }
    )
  }
}

