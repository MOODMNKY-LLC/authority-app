import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

/**
 * Discover databases from a specific Notion page ID
 * Useful when you know the exact page ID from a URL
 * Example: https://notion.so/workspace/PAGE-TITLE-2dccd2a6542281a3ba04c052023fe40e
 * Page ID: 2dccd2a6542281a3ba04c052023fe40e
 */
export async function POST(request: NextRequest) {
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
      .select("notion_access_token, notion_token")
      .eq("user_id", user.id)
      .single()

    // PRIORITIZE OAuth token
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

    const { page_id } = await request.json()

    if (!page_id) {
      return NextResponse.json(
        {
          success: false,
          error: "page_id required",
        },
        { status: 400 },
      )
    }

    const notion = new Client({
      auth: notionToken,
    })

    // Validate token
    try {
      await notion.users.me({})
    } catch (tokenError: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Token validation failed: ${tokenError.message}`,
        },
        { status: 401 },
      )
    }

    console.log(`[Authority] 🔍 Discovering databases from page ID: ${page_id}`)

    // Get page details
    let pageTitle = "Unknown"
    try {
      const pageDetails = await notion.pages.retrieve({ page_id })
      
      // Extract title
      if ("properties" in pageDetails && pageDetails.properties) {
        const titleProp = Object.values(pageDetails.properties).find(
          (prop: any) => prop.type === "title" && prop.title?.length > 0,
        )
        if (titleProp && (titleProp as any).title) {
          pageTitle = (titleProp as any).title.map((t: any) => t.plain_text).join("")
        }
      }
      
      console.log(`[Authority] ✅ Page found: "${pageTitle}"`)
    } catch (pageError: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Page not accessible: ${pageError.message}`,
          suggestion: "Ensure the page is shared with your Notion integration",
        },
        { status: 404 },
      )
    }

    // Get all child databases (with pagination)
    const childDatabases: Array<{ id: string; title: string; url: string }> = []
    let childrenHasMore = true
    let childrenCursor: string | undefined

    while (childrenHasMore) {
      const childrenResponse = await notion.blocks.children.list({
        block_id: page_id,
        start_cursor: childrenCursor,
        page_size: 100,
      })

      for (const block of childrenResponse.results) {
        if (block.type === "child_database") {
          const dbId = block.id
          try {
            const dbDetails = await notion.databases.retrieve({ database_id: dbId })
            let dbTitle = ""
            if ("title" in dbDetails && Array.isArray(dbDetails.title)) {
              dbTitle = dbDetails.title.map((t: any) => t.plain_text).join("")
            }

            childDatabases.push({
              id: dbId,
              title: dbTitle,
              url: "url" in dbDetails ? dbDetails.url : "",
            })
            console.log(`[Authority]   Found database: "${dbTitle}" (${dbId.substring(0, 8)}...)`)
          } catch (dbErr: any) {
            console.warn(`[Authority] ⚠️ Could not retrieve database ${dbId}:`, dbErr.message)
            childDatabases.push({
              id: dbId,
              title: "Unknown (permission issue?)",
              url: "",
            })
          }
        }
      }

      childrenHasMore = childrenResponse.has_more
      childrenCursor = childrenResponse.next_cursor || undefined
    }

    console.log(`[Authority] ✅ Found ${childDatabases.length} databases from page`)

    // Store template page ID in user_settings
    await supabase
      .from("user_settings")
      .update({
        notion_template_page_id: page_id,
      })
      .eq("user_id", user.id)

    console.log(`[Authority] ✅ Stored template page ID: ${page_id}`)

    return NextResponse.json({
      success: true,
      pageId: page_id,
      pageTitle,
      databases: childDatabases,
      databaseCount: childDatabases.length,
      message: `Found ${childDatabases.length} databases from "${pageTitle}"`,
    })
  } catch (error: any) {
    console.error("[Authority] Discover by ID error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to discover databases",
        details: error.stack,
      },
      { status: 500 },
    )
  }
}




