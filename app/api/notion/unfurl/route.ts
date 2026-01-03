import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Notion Unfurl Callback Endpoint
 * 
 * Handles link preview/unfurling requests from Notion.
 * Called with POST when an unfurl action occurs.
 * Called with DELETE when unfurl URL preview(s) or mention(s) is deleted.
 * 
 * This endpoint is used for Notion's link preview feature, allowing
 * Notion pages to show rich previews of URLs from your domain.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Notion sends unfurl requests with:
    // - url: The URL to unfurl
    // - user_id: The Notion user ID requesting the unfurl
    // - workspace_id: The Notion workspace ID
    
    const { url, user_id, workspace_id } = body

    if (!url) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      )
    }

    // Extract domain from URL
    const urlObj = new URL(url)
    const domain = urlObj.hostname

    // Verify domain is allowed (from env or config)
    const allowedDomains = process.env.NOTION_UNFURL_DOMAINS?.split(",").map(d => d.trim()) || []
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                   "http://localhost:3000"
    const baseDomain = new URL(baseUrl).hostname

    // Allow our own domain and any configured domains
    const isAllowed = allowedDomains.includes(domain) || domain === baseDomain

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Domain not allowed for unfurling" },
        { status: 403 }
      )
    }

    // Fetch page content from your app based on the URL
    // This is a placeholder - implement based on your routing structure
    const pageData = await fetchPagePreview(url)

    if (!pageData) {
      return NextResponse.json(
        { error: "Page not found" },
        { status: 404 }
      )
    }

    // Return unfurl response in Notion's expected format
    return NextResponse.json({
      type: "page",
      page: {
        id: pageData.id,
        title: pageData.title,
        description: pageData.description,
        icon: pageData.icon,
        cover: pageData.cover,
        url: url,
      },
    })
  } catch (error: any) {
    console.error("[Authority] Unfurl error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process unfurl request" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Notion sends delete requests when unfurl previews are removed
    // Handle cleanup if needed (e.g., cache invalidation)
    
    const { url, user_id, workspace_id } = body

    // Log the deletion for debugging
    console.log("[Authority] Unfurl deleted:", { url, user_id, workspace_id })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Authority] Unfurl delete error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process unfurl deletion" },
      { status: 500 }
    )
  }
}

/**
 * Fetch page preview data from your app
 * This should be implemented based on your app's routing structure
 */
async function fetchPagePreview(url: string): Promise<any> {
  try {
    // Extract path from URL
    const urlObj = new URL(url)
    const path = urlObj.pathname

    // Map paths to content types
    // This is a placeholder - implement based on your app structure
    if (path.startsWith("/forge/")) {
      // Handle Forge pages
      const parts = path.split("/")
      const type = parts[2]
      const id = parts[3]
      
      // Fetch from Supabase or your database
      const supabase = await createClient()
      // Implement based on your schema
      
      return {
        id: id,
        title: `Forge: ${type}`,
        description: `Content from ${type}`,
        icon: null,
        cover: null,
      }
    }

    // Default fallback
    return {
      id: path,
      title: "Authority App",
      description: "AI-assisted world-building system",
      icon: null,
      cover: null,
    }
  } catch (error) {
    console.error("[Authority] Error fetching page preview:", error)
    return null
  }
}



