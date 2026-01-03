import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"
import { queryNotionDatabase } from "@/lib/notion/query-database"

const REQUIRED_DATABASES = [
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

interface DatabaseInfo {
  id: string
  name: string
  pageCount?: number
  lastEdited?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated. Please log in first.",
        },
        { status: 401 },
      )
    }

    // Get user's Notion settings - prefer OAuth token
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_workspace_id, notion_databases, notion_template_page_id")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not connected. Please connect your Notion workspace first.",
        },
        { status: 200 },
      )
    }

    // PRIORITIZE OAuth token - this is what the user authenticated with
    const notionToken = settings.notion_access_token || settings.notion_token
    const tokenType = settings.notion_access_token ? "OAuth" : settings.notion_token ? "Integration" : "None"
    
    console.log(`[Authority] Using ${tokenType} token for sync`)

    if (!notionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion OAuth not completed. Please authenticate with Notion first.",
          action: "authenticate",
        },
        { status: 200 },
      )
    }

    // Initialize Notion client
    let notion = new Client({
      auth: notionToken,
    })
    
    // Validate token works and client is properly initialized
    try {
      await notion.users.me({})
      console.log("[Authority] ✅ Token validated successfully")
      // Don't pre-check query method - Next.js may have issues with method detection
      // We'll catch errors when actually using it
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

    // Search for databases in the workspace
    const databases: Record<string, DatabaseInfo> = {}
    const missing: string[] = []
    const databaseContents: Record<string, any> = {}
    let templatePageId = settings.notion_template_page_id

    try {
      // First, try to get databases from the template page if we have its ID
      const templateDatabases: Array<{ id: string; title: string }> = []
      
      if (templatePageId) {
        try {
          console.log(`[Authority] Getting databases from stored template page: ${templatePageId}`)
          
          // Validate template page is accessible
          try {
            await notion.pages.retrieve({ page_id: templatePageId })
            console.log(`[Authority] ✅ Template page ${templatePageId} is accessible`)
          } catch (pageErr: any) {
            console.warn(`[Authority] ⚠️ Stored template page ${templatePageId} not accessible:`, pageErr.message)
            console.log(`[Authority] Triggering discovery to find template page...`)
            templatePageId = null // Clear invalid template page ID
            // Don't throw - we'll fall back to discovery/search
          }
          
          if (templatePageId) {
            let hasMore = true
            let startCursor: string | undefined
            
            // Paginate through all children blocks (Notion API paginates children)
            while (hasMore) {
              const childrenResponse = await notion.blocks.children.list({
                block_id: templatePageId,
                start_cursor: startCursor,
                page_size: 100,
              })

              // Extract child_database blocks
              for (const block of childrenResponse.results) {
                if (block.type === "child_database") {
                  const dbId = block.id
                  try {
                    const dbDetails = await notion.databases.retrieve({ database_id: dbId })
                    let dbTitle = ""
                    if ("title" in dbDetails && Array.isArray(dbDetails.title)) {
                      dbTitle = dbDetails.title.map((t: any) => t.plain_text).join("")
                    }
                    if (dbTitle) {
                      templateDatabases.push({ id: dbId, title: dbTitle })
                      console.log(`[Authority] Found template database: ${dbTitle} (${dbId.substring(0, 8)}...)`)
                    }
                  } catch (dbErr: any) {
                    console.warn(`[Authority] ⚠️ Could not retrieve database ${dbId}:`, dbErr.message)
                    // Still add database ID even if we can't get title (permission issue?)
                    templateDatabases.push({ id: dbId, title: "Unknown" })
                  }
                }
              }
              
              hasMore = childrenResponse.has_more
              startCursor = childrenResponse.next_cursor || undefined
            }
            
            console.log(`[Authority] Total template databases found: ${templateDatabases.length}`)
          }
        } catch (templateErr: any) {
          console.warn(`[Authority] ⚠️ Error accessing template page ${templatePageId}:`, templateErr.message)
          templatePageId = null // Clear invalid template page ID
        }
      }
      
      // If no template page ID or template page failed, auto-discover template
      if (!templatePageId || templateDatabases.length === 0) {
        console.log(`[Authority] ⚠️ No template databases found from stored page ID. Auto-discovering template...`)
        
        // Import and use the discovery helper
        const { discoverTemplatePage } = await import("@/lib/notion/discover-template")
        const discoveredTemplate = await discoverTemplatePage(notionToken)
        
        if (discoveredTemplate) {
          console.log(`[Authority] ✅ Auto-discovered template: "${discoveredTemplate.pageTitle}"`)
          templatePageId = discoveredTemplate.pageId
          
          // Use discovered databases
          templateDatabases.push(...discoveredTemplate.databases.map(db => ({
            id: db.id,
            title: db.title
          })))
          
          // Store template page ID for future use
          await supabase
            .from("user_settings")
            .update({
              notion_template_page_id: templatePageId,
            })
            .eq("user_id", user.id)
        } else {
          console.log(`[Authority] ⚠️ Template not found. User may need to duplicate template first.`)
        }
      }

      // If we found databases from template page, use those
      // Otherwise, fall back to searching by name
      if (templateDatabases.length > 0) {
        console.log(`[Authority] Using ${templateDatabases.length} databases from template page`)
        
        // Sync all template databases
        for (const templateDb of templateDatabases) {
          const dbId = templateDb.id
          const dbName = templateDb.title

          try {
            // Query database to get page count and info
            // Use helper function which has fallback to raw HTTP
            const dbQuery = await queryNotionDatabase(notion, dbId, {
              page_size: 1, // Just to check if accessible
            }, notionToken)

            // Get database details
            const dbDetails = await notion.databases.retrieve({
              database_id: dbId,
            })

            databases[dbName] = {
              id: dbId,
              name: dbName,
              pageCount: dbQuery.results.length, // This is just first page, we'll get full count below
            }

            // Get full page count
            let fullPageCount = 0
            let hasMore = true
            let startCursor: string | undefined

            while (hasMore) {
              const query = await queryNotionDatabase(notion, dbId, {
                page_size: 100,
                start_cursor: startCursor,
              }, notionToken)
              fullPageCount += query.results.length
              hasMore = query.has_more
              startCursor = query.next_cursor || undefined
            }

            databases[dbName].pageCount = fullPageCount

            // Get sample pages for display (first 5)
            // Try to sort by last edited time (may not have this property)
            let sampleQuery
            try {
              sampleQuery = await queryNotionDatabase(notion, dbId, {
                page_size: 5,
                sorts: [
                  {
                    timestamp: "last_edited_time",
                    direction: "descending",
                  },
                ],
              }, notionToken)
            } catch (sortError: any) {
              // If sorting fails, try without sort
              sampleQuery = await queryNotionDatabase(notion, dbId, {
                page_size: 5,
              }, notionToken)
            }

            databaseContents[dbName] = {
              totalPages: fullPageCount,
              samplePages: sampleQuery.results.map((page: any) => {
                // Extract title from page properties
                let title = "Untitled"
                if (page.properties) {
                  const titleProp = Object.values(page.properties).find(
                    (prop: any) => prop.type === "title" && prop.title?.length > 0,
                  )
                  if (titleProp && (titleProp as any).title) {
                    title = (titleProp as any).title.map((t: any) => t.plain_text).join("")
                  }
                }
                return {
                  id: page.id,
                  title: title,
                  lastEdited: page.last_edited_time,
                  url: page.url,
                }
              }),
            }
          } catch (dbError: any) {
            console.error(`[Authority] Error querying database ${dbName}:`, dbError)
            // Log more details about the error
            if (dbError.message?.includes("not a function")) {
              console.error(`[Authority] Notion client issue - notion type:`, typeof notion)
              console.error(`[Authority] Notion client has databases:`, !!notion?.databases)
              console.error(`[Authority] Notion client databases type:`, typeof notion?.databases)
              console.error(`[Authority] Notion client databases.query:`, typeof notion?.databases?.query)
              console.error(`[Authority] Notion client databases.retrieve:`, typeof notion?.databases?.retrieve)
              // Verify client is still valid
              try {
                await notion.users.me({})
                console.error(`[Authority] Client validation: OK`)
              } catch (validationError) {
                console.error(`[Authority] Client validation failed:`, validationError)
              }
            }
            // Still add the database ID even if query fails
            databases[dbName] = {
              id: dbId,
              name: dbName,
            }
          }
        }

        // Check if core required databases exist (case-insensitive, flexible matching)
        const foundDatabaseNames = templateDatabases.map(db => db.title.toLowerCase().trim())
        for (const requiredDbName of REQUIRED_DATABASES) {
          const requiredLower = requiredDbName.toLowerCase().trim()
          // Check for exact match or if any synced database name contains/equals the required name
          const found = foundDatabaseNames.some(foundName => 
            foundName === requiredLower || 
            foundName.includes(requiredLower) || 
            requiredLower.includes(foundName)
          )
          if (!found) {
            missing.push(requiredDbName)
          }
        }
      } else {
        // Fallback: Search for databases by name (backward compatibility)
        console.log("[Authority] ⚠️ No template page found, searching databases by name...")
        console.log("[Authority] This is a fallback - consider running 'Discover Databases' first")
        
        // Search with pagination
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
        
        const searchResponse = { results: allSearchResults }
        console.log(`[Authority] Found ${allSearchResults.length} total items in workspace search`)

        // Map found databases by title
        const foundDatabases: Record<string, { id: string; title: string }> = {}
        
        for (const result of searchResponse.results) {
          if (result.object === "database") {
            let title = ""
            if ("title" in result && Array.isArray(result.title)) {
              title = result.title.map((t: any) => t.plain_text).join("")
            }
            
            // If no title in search result, try to retrieve database details
            if (!title) {
              try {
                const dbDetails = await notion.databases.retrieve({ database_id: result.id })
                if ("title" in dbDetails && Array.isArray(dbDetails.title)) {
                  title = dbDetails.title.map((t: any) => t.plain_text).join("")
                }
              } catch (err) {
                console.warn(`[Authority] Could not retrieve title for database ${result.id}:`, err)
              }
            }
            
            if (title) {
              foundDatabases[title] = {
                id: result.id,
                title: title,
              }
            }
          }
        }

        console.log("[Authority] Found databases:", Object.keys(foundDatabases))

        // Check for required databases and get their info (case-insensitive, flexible matching)
        for (const dbName of REQUIRED_DATABASES) {
          // Try exact match first
          let matchedDb = foundDatabases[dbName]
          
          // If no exact match, try case-insensitive and partial matching
          if (!matchedDb) {
            const dbNameLower = dbName.toLowerCase().trim()
            for (const [foundName, foundInfo] of Object.entries(foundDatabases)) {
              const foundNameLower = foundName.toLowerCase().trim()
              if (foundNameLower === dbNameLower || 
                  foundNameLower.includes(dbNameLower) || 
                  dbNameLower.includes(foundNameLower)) {
                matchedDb = foundInfo
                break
              }
            }
          }
          
          if (matchedDb) {
            const dbId = foundDatabases[dbName].id

            try {
              // Query database to get page count and info
              // Use helper function which has fallback to raw HTTP
              const dbQuery = await queryNotionDatabase(notion, dbId, {
                page_size: 1, // Just to check if accessible
              }, notionToken)

              // Get database details
              const dbDetails = await notion.databases.retrieve({
                database_id: dbId,
              })

              databases[dbName] = {
                id: dbId,
                name: dbName,
                pageCount: dbQuery.results.length, // This is just first page, we'll get full count below
              }

              // Get full page count
              let fullPageCount = 0
              let hasMore = true
              let startCursor: string | undefined

              while (hasMore) {
                const query = await queryNotionDatabase(notion, dbId, {
                  page_size: 100,
                  start_cursor: startCursor,
                }, notionToken)
                fullPageCount += query.results.length
                hasMore = query.has_more
                startCursor = query.next_cursor || undefined
              }

              databases[dbName].pageCount = fullPageCount

              // Get sample pages for display (first 5)
              // Try to sort by last edited time (may not have this property)
              let sampleQuery
              try {
                sampleQuery = await queryNotionDatabase(notion, dbId, {
                  page_size: 5,
                  sorts: [
                    {
                      timestamp: "last_edited_time",
                      direction: "descending",
                    },
                  ],
                }, notionToken)
              } catch (sortError: any) {
                // If sorting fails, try without sort
                sampleQuery = await queryNotionDatabase(notion, dbId, {
                  page_size: 5,
                }, notionToken)
              }

              databaseContents[dbName] = {
                totalPages: fullPageCount,
                samplePages: sampleQuery.results.map((page: any) => {
                  // Extract title from page properties
                  let title = "Untitled"
                  if (page.properties) {
                    const titleProp = Object.values(page.properties).find(
                      (prop: any) => prop.type === "title" && prop.title?.length > 0,
                    )
                    if (titleProp && (titleProp as any).title) {
                      title = (titleProp as any).title.map((t: any) => t.plain_text).join("")
                    }
                  }
                  return {
                    id: page.id,
                    title: title,
                    lastEdited: page.last_edited_time,
                    url: page.url,
                  }
                }),
              }
            } catch (dbError: any) {
              console.error(`[Authority] Error querying database ${dbName}:`, dbError)
              // Still add the database ID even if query fails
              databases[dbName] = {
                id: dbId,
                name: dbName,
              }
            }
          } else {
            missing.push(dbName)
          }
        }
      }

      // Update user_settings with found database IDs
      // Normalize database names to match REQUIRED_DATABASES for consistent lookup
      if (Object.keys(databases).length > 0) {
        const databaseIds: Record<string, string> = {}
        Object.entries(databases).forEach(([name, info]) => {
          // Try to match the stored name against REQUIRED_DATABASES
          // This ensures we can look up databases even if template titles don't exactly match
          let normalizedName = name
          const nameLower = name.toLowerCase().trim()
          
          // Find matching required database name (case-insensitive, flexible)
          for (const requiredName of REQUIRED_DATABASES) {
            const requiredLower = requiredName.toLowerCase().trim()
            if (nameLower === requiredLower || 
                nameLower.includes(requiredLower) || 
                requiredLower.includes(nameLower)) {
              normalizedName = requiredName
              break
            }
          }
          
          databaseIds[normalizedName] = info.id
        })

        const updateData: any = {
          notion_databases: databaseIds,
          notion_workspace_id: settings.notion_workspace_id,
        }

        // Update template page ID if we found one and it's different
        if (templatePageId && templatePageId !== settings.notion_template_page_id) {
          updateData.notion_template_page_id = templatePageId
        }

        await supabase
          .from("user_settings")
          .update(updateData)
          .eq("user_id", user.id)

        console.log("[Authority] Updated user_settings with database IDs:", databaseIds)
        if (templatePageId) {
          console.log(`[Authority] Updated template page ID: ${templatePageId}`)
        }

        // Setup FDW server and tables for this user (non-blocking)
        try {
          const { error: fdwError } = await supabase.rpc("create_user_notion_fdw_tables", {
            p_user_id: user.id,
          })
          if (fdwError) {
            console.warn("[Authority] FDW setup failed (non-critical):", fdwError.message)
          } else {
            console.log("[Authority] ✅ FDW server and tables created/verified for user")
          }
        } catch (fdwErr) {
          // Non-critical: FDW setup failed, but sync succeeded
          console.warn("[Authority] FDW setup error (non-critical):", fdwErr)
        }

        // Trigger automatic seeding if databases are synced and user hasn't been seeded yet
        // Only seed if all required databases are found and synced successfully
        // Note: Seed data is now automatically created on user signup via database trigger
        // No need to seed here - it already exists in Supabase sync tables
        console.log("[Authority] ✅ Database sync complete. Seed data is available in Supabase and can be synced to Notion when ready.")
      }

      return NextResponse.json({
        success: true,
        databases,
        databaseContents,
        missing,
        templatePageId: templatePageId || null,
        message:
          missing.length === 0
            ? `All ${Object.keys(databases).length} template databases synced successfully!`
            : `Synced ${Object.keys(databases).length} databases from template. Missing core databases: ${missing.join(", ")}`,
        syncedCount: Object.keys(databases).length,
        totalTemplateDatabases: templateDatabases.length || 0,
      })
    } catch (notionError: any) {
      console.error("[Authority] Notion API error during sync:", notionError)
      return NextResponse.json(
        {
          success: false,
          error: `Notion API error: ${notionError.message || "Failed to sync databases"}`,
          details: notionError.message,
        },
        { status: 200 },
      )
    }
  } catch (error: any) {
    console.error("[Authority] Database sync error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to sync Notion databases",
      },
      { status: 500 },
    )
  }
}
