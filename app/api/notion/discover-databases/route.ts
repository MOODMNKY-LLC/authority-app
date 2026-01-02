import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

/**
 * Discover all databases in the user's Notion workspace
 * Specifically searches for the duplicated Authority template page and extracts its databases
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
      .select("notion_access_token, notion_token, notion_template_page_id")
      .eq("user_id", user.id)
      .single()

    // PRIORITIZE OAuth token - this is what the user authenticated with
    const notionToken = settings?.notion_access_token || settings?.notion_token
    const tokenType = settings?.notion_access_token ? "OAuth" : settings?.notion_token ? "Integration" : "None"

    if (!notionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not connected. Please authenticate with Notion OAuth or add an integration token.",
        },
        { status: 400 },
      )
    }

    console.log(`[Authority] Using ${tokenType} token for discovery`)

    const notion = new Client({
      auth: notionToken,
    })

    // Validate token works before proceeding
    try {
      await notion.users.me({})
      console.log("[Authority] ✅ Token validated successfully")
    } catch (tokenError: any) {
      console.error("[Authority] ❌ Token validation failed:", tokenError.message)
      return NextResponse.json(
        {
          success: false,
          error: `Token validation failed: ${tokenError.message}`,
          tokenType,
          suggestion: tokenType === "OAuth" 
            ? "Your OAuth token may have expired. Please re-authenticate with Notion."
            : "Please verify your integration token is correct and has proper permissions.",
        },
        { status: 401 },
      )
    }

    // Search for template pages by title patterns
    // When a template is duplicated, it gets a NEW page ID, so we search by title
    // Support various title formats including dashes, underscores, and full titles
    const templateTitlePatterns = [
      "AUTHORITY-TEMPLATE",           // Exact match from URL
      "AUTHORITY_TEMPLATE",            // Underscore variant
      "Authority Template",            // Title case with space
      "authority template",            // Lowercase
      "Authority-Template",            // Title case with dash
      "authority-template",            // Lowercase with dash
      "AUTHORITY TEMPLATE",            // Uppercase with space
      "Authority",                     // Just "Authority"
      "authority",                     // Just "authority" lowercase
    ]

    console.log("[Authority] 🔍 Searching for template pages...")
    console.log("[Authority] Using token:", notionToken.substring(0, 10) + "...")
    console.log("[Authority] Looking for pages matching:", templateTitlePatterns.join(", "))
    
    // Search for all pages (Notion API doesn't support filtering by object type in search)
    // We'll filter client-side
    // IMPORTANT: Notion search() paginates! We need to paginate through all results
    let allSearchResults: any[] = []
    let searchHasMore = true
    let searchCursor: string | undefined
    
    while (searchHasMore) {
      const searchResponse = await notion.search({
        start_cursor: searchCursor,
        page_size: 100,
      })
      
      allSearchResults = allSearchResults.concat(searchResponse.results)
      searchHasMore = searchResponse.has_more
      searchCursor = searchResponse.next_cursor || undefined
      
      console.log(`[Authority] Search progress: ${allSearchResults.length} results so far...`)
    }
    
    console.log(`[Authority] Total search results: ${allSearchResults.length}`)
    const searchResponse = { results: allSearchResults }

    // Find pages that match template title patterns
    const candidateTemplatePages: Array<{
      id: string
      title: string
      url: string
      lastEdited: string
    }> = []

    for (const page of searchResponse.results) {
      if (page.object === "page") {
        let pageTitle = ""
        // Extract title from page properties
        if ("properties" in page && page.properties) {
          const titleProp = Object.values(page.properties).find(
            (prop: any) => prop.type === "title" && prop.title?.length > 0,
          )
          if (titleProp && (titleProp as any).title) {
            pageTitle = (titleProp as any).title.map((t: any) => t.plain_text).join("")
          }
        }

        // Check if title matches any pattern (normalize dashes/underscores/spaces)
        const normalizeTitle = (title: string) => title.toLowerCase().replace(/[-_\s]/g, "")
        const normalizedPageTitle = normalizeTitle(pageTitle)
        const matchesPattern = templateTitlePatterns.some((pattern) => {
          const normalizedPattern = normalizeTitle(pattern)
          // Check if normalized title contains normalized pattern OR vice versa
          return normalizedPageTitle.includes(normalizedPattern) || 
                 normalizedPattern.includes(normalizedPageTitle) ||
                 // Also check original title contains pattern (case-insensitive)
                 pageTitle.toLowerCase().includes(pattern.toLowerCase())
        })

        // Log all pages for debugging (only first 20 to avoid spam)
        if (pageTitle && candidateTemplatePages.length < 20) {
          console.log(`[Authority]   Page: "${pageTitle}" (${page.id.substring(0, 8)}...)`)
        }

        if (matchesPattern) {
          console.log(`[Authority] ✅ Template candidate found: "${pageTitle}"`)
          console.log(`[Authority]   Page ID: ${page.id}`)
          console.log(`[Authority]   URL: ${"url" in page ? page.url : "N/A"}`)
          candidateTemplatePages.push({
            id: page.id,
            title: pageTitle,
            url: "url" in page ? page.url : "",
            lastEdited: "last_edited_time" in page ? page.last_edited_time : "",
          })
        }
      }
    }

    console.log(`[Authority] Found ${candidateTemplatePages.length} candidate template pages`)

    // For each candidate, check its children for databases
    let foundTemplatePage: {
      id: string
      title: string
      url: string
      databases: Array<{ id: string; title: string; url: string }>
    } | null = null

    // All 13 core databases that should be in the template
    const expectedDatabaseNames = [
      "Chat Sessions",
      "Characters",
      "Worlds",
      "Stories",
      "Chapters",
      "Magic Systems",
      "Factions & Organizations",
      "Lore & History",
      "Locations",
      "Projects",
      "Image Gallery",
      "Integration Keys",
      "Voice Profiles",
    ]

    for (const candidate of candidateTemplatePages) {
      try {
        console.log(`[Authority] Checking candidate template page: "${candidate.title}" (${candidate.id.substring(0, 8)}...)`)
        
        // Get children blocks WITH PAGINATION - Notion paginates children!
        const childDatabases: Array<{ id: string; title: string; url: string }> = []
        let childrenHasMore = true
        let childrenCursor: string | undefined
        
        while (childrenHasMore) {
          const childrenResponse = await notion.blocks.children.list({
            block_id: candidate.id,
            start_cursor: childrenCursor,
            page_size: 100,
          })

          // Extract child_database blocks
          for (const block of childrenResponse.results) {
            if (block.type === "child_database") {
              const dbId = block.id
              try {
                // Retrieve database details to get title
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
                console.log(`[Authority]   Found child database: "${dbTitle}" (${dbId.substring(0, 8)}...)`)
              } catch (dbErr: any) {
                console.warn(`[Authority] ⚠️ Could not retrieve database ${dbId}:`, dbErr.message)
                // Still add the database ID even if we can't get details (might be permission issue)
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

        console.log(`[Authority] Template page "${candidate.title}" has ${childDatabases.length} child databases:`)
        childDatabases.forEach(db => console.log(`[Authority]   - "${db.title}"`))

        // Check if this template has the expected databases (case-insensitive, flexible matching)
        const foundDatabaseNames = childDatabases.map((db) => db.title.toLowerCase().trim())
        const matchingCount = expectedDatabaseNames.filter((name) => {
          const nameLower = name.toLowerCase().trim()
          return foundDatabaseNames.some(foundName => 
            foundName === nameLower || 
            foundName.includes(nameLower) || 
            nameLower.includes(foundName)
          )
        }).length

        console.log(`[Authority] Matching databases: ${matchingCount}/${expectedDatabaseNames.length} expected`)

        // If this page has multiple expected databases OR multiple child databases, it's likely the template
        if (matchingCount >= 2 || childDatabases.length >= 4) {
          foundTemplatePage = {
            id: candidate.id,
            title: candidate.title,
            url: candidate.url,
            databases: childDatabases,
          }
          console.log(`[Authority] ✅ Found template page: "${candidate.title}"`)
          console.log(`[Authority]   - ${matchingCount}/${expectedDatabaseNames.length} expected databases matched`)
          console.log(`[Authority]   - ${childDatabases.length} total child databases`)
          break // Use the first matching template
        } else {
          console.log(`[Authority] ⚠️ Template page "${candidate.title}" doesn't match criteria (${matchingCount} matches, ${childDatabases.length} databases)`)
        }
      } catch (err) {
        console.warn(`[Authority] Error checking template page ${candidate.id}:`, err)
      }
    }

    // Also search for all databases in workspace (for comparison)
    // Use the already-paginated search results instead of searching again
    const allDatabasesResponse = { results: allSearchResults }

    const allDatabases: Array<{
      id: string
      title: string
      url: string
      parentType: string
      parentId?: string
      createdTime: string
      lastEditedTime: string
      inTemplate: boolean
    }> = []

    const templateDatabaseIds = foundTemplatePage
      ? foundTemplatePage.databases.map((db) => db.id)
      : []

    for (const result of allDatabasesResponse.results) {
      if (result.object === "database") {
        let title = ""
        if ("title" in result && Array.isArray(result.title)) {
          title = result.title.map((t: any) => t.plain_text).join("")
        }

        if (!title) {
          try {
            const dbDetails = await notion.databases.retrieve({ database_id: result.id })
            if ("title" in dbDetails && Array.isArray(dbDetails.title)) {
              title = dbDetails.title.map((t: any) => t.plain_text).join("")
            }
          } catch (err) {
            console.warn(`[Authority] Could not retrieve title for database ${result.id}:`, err)
            continue
          }
        }

        if (title) {
          const parentType = "parent" in result && result.parent ? result.parent.type : "unknown"
          const parentId =
            "parent" in result && result.parent && "page_id" in result.parent
              ? result.parent.page_id
              : undefined

          allDatabases.push({
            id: result.id,
            title: title,
            url: "url" in result ? result.url : "",
            parentType: parentType,
            parentId: parentId,
            createdTime: "created_time" in result ? result.created_time : "",
            lastEditedTime: "last_edited_time" in result ? result.last_edited_time : "",
            inTemplate: templateDatabaseIds.includes(result.id) || parentId === foundTemplatePage?.id,
          })
        }
      }
    }

    // Update user_settings with found template page ID if we found one
    if (foundTemplatePage && foundTemplatePage.id !== settings?.notion_template_page_id) {
      await supabase
        .from("user_settings")
        .update({
          notion_template_page_id: foundTemplatePage.id,
        })
        .eq("user_id", user.id)
      console.log(`[Authority] Updated template page ID to: ${foundTemplatePage.id}`)
    }

    return NextResponse.json({
      success: true,
      tokenType,
      templatePage: foundTemplatePage,
      totalDatabases: allDatabases.length,
      databases: allDatabases,
      templateDatabaseIds: templateDatabaseIds,
      candidatePages: candidateTemplatePages,
      expectedDatabases: expectedDatabaseNames,
      message: foundTemplatePage
        ? `Template page found: "${foundTemplatePage.title}" with ${foundTemplatePage.databases.length} databases`
        : candidateTemplatePages.length > 0
        ? `Found ${candidateTemplatePages.length} candidate pages but none matched template criteria. Check that databases are shared with your integration.`
        : `No template pages found matching title patterns. Ensure your template page title contains "Authority Template" or similar.`,
    })
  } catch (error: any) {
    console.error("[Authority] Database discovery error:", error)
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

