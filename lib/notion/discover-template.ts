import { Client } from "@notionhq/client"

/**
 * Discover template page and extract its databases
 * Used automatically after OAuth to capture template page ID
 * 
 * @param notionToken - Notion API token (OAuth or integration)
 * @returns Template page info with databases, or null if not found
 */
export async function discoverTemplatePage(notionToken: string): Promise<{
  pageId: string
  pageTitle: string
  pageUrl: string
  databases: Array<{ id: string; title: string }>
} | null> {
  try {
    const notion = new Client({ auth: notionToken })

    // Validate token
    try {
      await notion.users.me({})
    } catch {
      console.warn("[Authority] Token validation failed in discoverTemplatePage")
      return null
    }

    // Template title patterns (supporting various formats)
    const templateTitlePatterns = [
      "AUTHORITY-TEMPLATE",
      "AUTHORITY_TEMPLATE",
      "Authority Template",
      "authority template",
      "Authority-Template",
      "authority-template",
      "AUTHORITY TEMPLATE",
      "Authority",
      "authority",
    ]

    console.log("[Authority] 🔍 Auto-discovering template page after OAuth...")

    // Search all pages (paginated)
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
    }

    // Find pages matching template patterns
    const candidatePages: Array<{
      id: string
      title: string
      url: string
      lastEdited: string
    }> = []

    for (const page of allSearchResults) {
      if (page.object === "page") {
        let pageTitle = ""
        if ("properties" in page && page.properties) {
          const titleProp = Object.values(page.properties).find(
            (prop: any) => prop.type === "title" && prop.title?.length > 0,
          )
          if (titleProp && (titleProp as any).title) {
            pageTitle = (titleProp as any).title.map((t: any) => t.plain_text).join("")
          }
        }

        // Normalize and match
        const normalizeTitle = (title: string) => title.toLowerCase().replace(/[-_\s]/g, "")
        const normalizedPageTitle = normalizeTitle(pageTitle)
        const matchesPattern = templateTitlePatterns.some((pattern) => {
          const normalizedPattern = normalizeTitle(pattern)
          return (
            normalizedPageTitle.includes(normalizedPattern) ||
            normalizedPattern.includes(normalizedPageTitle) ||
            pageTitle.toLowerCase().includes(pattern.toLowerCase())
          )
        })

        if (matchesPattern && pageTitle) {
          candidatePages.push({
            id: page.id,
            title: pageTitle,
            url: "url" in page ? page.url : "",
            lastEdited: "last_edited_time" in page ? page.last_edited_time : "",
          })
        }
      }
    }

    if (candidatePages.length === 0) {
      console.log("[Authority] ⚠️ No template pages found (user may duplicate template later)")
      return null
    }

    console.log(`[Authority] Found ${candidatePages.length} candidate template pages`)

    // Sort by last edited (most recent first) - user likely just duplicated it
    candidatePages.sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime())

    // Check each candidate for child databases
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

    for (const candidate of candidatePages) {
      try {
        // Get all child databases (paginated)
        const childDatabases: Array<{ id: string; title: string }> = []
        let childrenHasMore = true
        let childrenCursor: string | undefined

        while (childrenHasMore) {
          const childrenResponse = await notion.blocks.children.list({
            block_id: candidate.id,
            start_cursor: childrenCursor,
            page_size: 100,
          })

          for (const block of childrenResponse.results) {
            if (block.type === "child_database") {
              try {
                const dbDetails = await notion.databases.retrieve({ database_id: block.id })
                let dbTitle = ""
                if ("title" in dbDetails && Array.isArray(dbDetails.title)) {
                  dbTitle = dbDetails.title.map((t: any) => t.plain_text).join("")
                }
                if (dbTitle) {
                  childDatabases.push({ id: block.id, title: dbTitle })
                }
              } catch {
                // Skip databases we can't access
              }
            }
          }

          childrenHasMore = childrenResponse.has_more
          childrenCursor = childrenResponse.next_cursor || undefined
        }

        // Check if this looks like the template (has multiple expected databases)
        const foundDatabaseNames = childDatabases.map((db) => db.title.toLowerCase().trim())
        const matchingCount = expectedDatabaseNames.filter((name) => {
          const nameLower = name.toLowerCase().trim()
          return foundDatabaseNames.some(
            (foundName) =>
              foundName === nameLower ||
              foundName.includes(nameLower) ||
              nameLower.includes(foundName),
          )
        }).length

        // If this page has multiple expected databases OR many child databases, it's likely the template
        if (matchingCount >= 2 || childDatabases.length >= 4) {
          console.log(
            `[Authority] ✅ Auto-discovered template: "${candidate.title}" (${matchingCount} expected databases, ${childDatabases.length} total)`,
          )
          return {
            pageId: candidate.id,
            pageTitle: candidate.title,
            pageUrl: candidate.url,
            databases: childDatabases,
          }
        }
      } catch (err) {
        console.warn(`[Authority] Error checking candidate page ${candidate.id}:`, err)
      }
    }

    console.log("[Authority] ⚠️ No template pages matched criteria (user may duplicate template later)")
    return null
  } catch (error: any) {
    console.error("[Authority] Error in discoverTemplatePage:", error.message)
    return null
  }
}




