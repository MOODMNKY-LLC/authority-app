import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

/**
 * Debug endpoint to help troubleshoot Notion sync issues
 * Returns detailed information about what the Notion API can see
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 },
      )
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_template_page_id, notion_databases")
      .eq("user_id", user.id)
      .single()

    const notionToken = settings?.notion_access_token || settings?.notion_token

    if (!notionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not connected",
        },
        { status: 400 },
      )
    }

    const notion = new Client({
      auth: notionToken,
    })

    // Test token validity
    let tokenValid = false
    let tokenError: any = null
    try {
      await notion.users.me({})
      tokenValid = true
    } catch (err: any) {
      tokenError = err.message
    }

    // Get all search results (paginated)
    const allPages: any[] = []
    const allDatabases: any[] = []
    let searchHasMore = true
    let searchCursor: string | undefined

    while (searchHasMore) {
      const searchResponse = await notion.search({
        start_cursor: searchCursor,
        page_size: 100,
      })

      for (const result of searchResponse.results) {
        if (result.object === "page") {
          let pageTitle = ""
          if ("properties" in result && result.properties) {
            const titleProp = Object.values(result.properties).find(
              (prop: any) => prop.type === "title" && prop.title?.length > 0,
            )
            if (titleProp && (titleProp as any).title) {
              pageTitle = (titleProp as any).title.map((t: any) => t.plain_text).join("")
            }
          }
          allPages.push({
            id: result.id,
            title: pageTitle || "Untitled",
            url: "url" in result ? result.url : "",
            lastEdited: "last_edited_time" in result ? result.last_edited_time : "",
            parentType: "parent" in result && result.parent ? result.parent.type : "unknown",
          })
        } else if (result.object === "database") {
          let dbTitle = ""
          if ("title" in result && Array.isArray(result.title)) {
            dbTitle = result.title.map((t: any) => t.plain_text).join("")
          }
          allDatabases.push({
            id: result.id,
            title: dbTitle || "Untitled",
            url: "url" in result ? result.url : "",
            parentType: "parent" in result && result.parent ? result.parent.type : "unknown",
            parentId: "parent" in result && result.parent && "page_id" in result.parent ? result.parent.page_id : undefined,
          })
        }
      }

      searchHasMore = searchResponse.has_more
      searchCursor = searchResponse.next_cursor || undefined
    }

    // Check template page if stored
    let templatePageInfo: any = null
    if (settings?.notion_template_page_id) {
      try {
        const templatePage = await notion.pages.retrieve({
          page_id: settings.notion_template_page_id,
        })
        
        // Get children
        const children = await notion.blocks.children.list({
          block_id: settings.notion_template_page_id,
        })
        
        templatePageInfo = {
          id: settings.notion_template_page_id,
          accessible: true,
          childrenCount: children.results.length,
          childDatabases: children.results.filter((b: any) => b.type === "child_database").length,
        }
      } catch (err: any) {
        templatePageInfo = {
          id: settings.notion_template_page_id,
          accessible: false,
          error: err.message,
        }
      }
    }

    // Find pages matching template patterns
    const templatePatterns = ["Authority Template", "AUTHORITY_TEMPLATE", "Authority", "authority template"]
    const matchingPages = allPages.filter((page) =>
      templatePatterns.some((pattern) => page.title.toLowerCase().includes(pattern.toLowerCase())),
    )

    return NextResponse.json({
      success: true,
      token: {
        valid: tokenValid,
        error: tokenError,
        type: settings?.notion_access_token ? "OAuth" : "Integration",
        hasToken: !!notionToken,
      },
      search: {
        totalPages: allPages.length,
        totalDatabases: allDatabases.length,
        pages: allPages.slice(0, 20), // First 20 for preview
        databases: allDatabases.slice(0, 20), // First 20 for preview
      },
      template: {
        storedPageId: settings?.notion_template_page_id || null,
        pageInfo: templatePageInfo,
        matchingPages: matchingPages,
        storedDatabases: settings?.notion_databases || null,
      },
      recommendations: {
        templateFound: matchingPages.length > 0,
        templateAccessible: templatePageInfo?.accessible ?? false,
        nextSteps: matchingPages.length === 0
          ? "Template page not found. Check if template title matches one of: " + templatePatterns.join(", ")
          : templatePageInfo?.accessible === false
          ? "Template page ID stored but not accessible. Try running 'Discover Databases' again."
          : "Template found and accessible. Try running 'Sync Databases'.",
      },
    })
  } catch (error: any) {
    console.error("[Authority] Debug search error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to debug search",
        details: error.stack,
      },
      { status: 500 },
    )
  }
}


