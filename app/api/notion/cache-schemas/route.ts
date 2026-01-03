/**
 * Cache Notion Database Schemas
 * 
 * Fetches schemas from all user's Notion databases and stores them in Supabase
 * This enables faster property mapping without repeated API calls
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"
import { cacheSchema } from "@/lib/notion/get-cached-schema"
import { rateLimitedCall } from "@/lib/notion/rate-limiter"
import { queryNotionDatabase } from "@/lib/notion/query-database"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user settings with Notion databases
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Failed to load user settings" },
        { status: 500 },
      )
    }

    // PRIORITIZE OAuth token (notion_access_token) - this is user-authenticated and has better permissions
    // OAuth tokens allow access to databases the user has access to, even if not explicitly shared with integration
    const notionToken = settings.notion_access_token || settings.notion_token
    if (!notionToken) {
      return NextResponse.json(
        { error: "Notion token not found. Please connect your Notion account via OAuth." },
        { status: 400 },
      )
    }
    
    // Log which token type we're using for debugging
    if (settings.notion_access_token) {
      console.log("[Authority] ✅ Using OAuth token for schema caching (user-authenticated access)")
    } else if (settings.notion_token) {
      console.log("[Authority] ⚠️ Using integration token (fallback) - OAuth recommended for better permissions")
    }

    const notion = new Client({ auth: notionToken })

    // Parse databases from settings
    const notionDatabases = settings.notion_databases || {}
    if (Object.keys(notionDatabases).length === 0) {
      return NextResponse.json(
        { error: "No Notion databases configured. Please sync databases first." },
        { status: 400 },
      )
    }

    const results: Record<string, { success: boolean; error?: string; schema?: any }> = {}

    // Fetch and cache schema for each database
    for (const [databaseName, databaseId] of Object.entries(notionDatabases)) {
      try {
        console.log(`[Authority] Fetching schema for "${databaseName}" (${databaseId})...`)

        // Fetch schema from Notion API
        const dbDetails = await rateLimitedCall(
          () => notion.databases.retrieve({
            database_id: databaseId as string,
          }),
        )

        const schema = dbDetails.properties || {}

        if (Object.keys(schema).length === 0) {
          console.warn(
            `[Authority] ⚠️ Schema is empty for "${databaseName}" - this may be a permissions issue`,
          )
          console.warn(
            `[Authority]   → Database ID: ${databaseId}`,
          )
          console.warn(
            `[Authority]   → Full database response:`,
            JSON.stringify({
              id: dbDetails.id,
              title: dbDetails.title,
              properties: dbDetails.properties,
              parent: dbDetails.parent,
            }, null, 2),
          )
          
          // Try to infer schema from an existing page if database has content
          try {
            console.log(
              `[Authority]   → Attempting to infer schema from existing pages...`,
            )
            // Use our query helper function to avoid bundling issues
            // This uses OAuth token passed explicitly for user-authenticated access
            const queryResult = await rateLimitedCall(
              () => queryNotionDatabase(
                notion,
                databaseId as string,
                { page_size: 1 },
                notionToken,
              ),
            )
            
            if (queryResult.results && queryResult.results.length > 0) {
              const firstPage = queryResult.results[0] as any
              if (firstPage.properties) {
                const inferredSchema: Record<string, any> = {}
                // Extract property types from the page
                Object.keys(firstPage.properties).forEach((propName) => {
                  const prop = firstPage.properties[propName]
                  inferredSchema[propName] = {
                    type: prop.type,
                    // Include type-specific info if available
                    ...(prop.type === 'select' && prop.select ? { select: { options: [] } } : {}),
                    ...(prop.type === 'multi_select' && prop.multi_select ? { multi_select: { options: [] } } : {}),
                  }
                })
                
                if (Object.keys(inferredSchema).length > 0) {
                  console.log(
                    `[Authority]   → ✅ Inferred ${Object.keys(inferredSchema).length} properties from page`,
                  )
                  
                  // Cache the inferred schema
                  const cached = await cacheSchema(
                    user.id,
                    databaseId as string,
                    databaseName,
                    inferredSchema,
                  )
                  
                  if (cached) {
                    results[databaseName] = {
                      success: true,
                      schema: {
                        propertyCount: Object.keys(inferredSchema).length,
                        properties: Object.keys(inferredSchema),
                        inferred: true,
                      },
                    }
                  } else {
                    results[databaseName] = {
                      success: false,
                      error: "Failed to cache inferred schema",
                    }
                  }
                  continue
                } else {
                  results[databaseName] = {
                    success: false,
                    error: "Schema is empty - database may not be shared with integration. Share the database with your Notion integration at notion.so/my-integrations",
                  }
                  continue
                }
              } else {
                results[databaseName] = {
                  success: false,
                  error: "Schema is empty - database may not be shared with integration. Share the database with your Notion integration at notion.so/my-integrations",
                }
                continue
              }
            } else {
              results[databaseName] = {
                success: false,
                error: "Schema is empty and database has no pages - database may not be shared with integration. Share the database with your Notion integration at notion.so/my-integrations",
              }
              continue
            }
          } catch (inferError: any) {
            console.error(
              `[Authority]   → Failed to infer schema:`,
              inferError.message,
            )
            results[databaseName] = {
              success: false,
              error: `Schema is empty - database may not be shared with integration. Error: ${inferError.message}. Share the database with your Notion integration at notion.so/my-integrations`,
            }
            continue
          }
        }

        // Cache schema in Supabase
        const cached = await cacheSchema(
          user.id,
          databaseId as string,
          databaseName,
          schema,
        )

        if (cached) {
          console.log(
            `[Authority] ✅ Cached schema for "${databaseName}": ${Object.keys(schema).length} properties`,
          )
          results[databaseName] = {
            success: true,
            schema: {
              propertyCount: Object.keys(schema).length,
              properties: Object.keys(schema),
            },
          }
        } else {
          results[databaseName] = {
            success: false,
            error: "Failed to cache schema",
          }
        }
      } catch (error: any) {
        console.error(
          `[Authority] ❌ Failed to cache schema for "${databaseName}":`,
          error.message,
        )
        results[databaseName] = {
          success: false,
          error: error.message || "Unknown error",
        }
      }
    }

    const successCount = Object.values(results).filter((r) => r.success).length
    const totalCount = Object.keys(results).length
    const inferredCount = Object.values(results).filter((r) => r.success && r.schema?.inferred).length

    // Consider it successful if at least some schemas were cached
    // Partial success is still useful - empty databases will cache once they have pages
    const isSuccess = successCount > 0
    
    let message = `Cached ${successCount}/${totalCount} database schemas`
    if (inferredCount > 0) {
      message += ` (${inferredCount} inferred from pages)`
    }
    if (successCount < totalCount) {
      const failedCount = totalCount - successCount
      message += `. ${failedCount} database${failedCount !== 1 ? 's' : ''} have no pages yet - schemas will be cached automatically when pages are added.`
    }

    return NextResponse.json({
      success: isSuccess,
      message,
      results,
      summary: {
        total: totalCount,
        cached: successCount,
        inferred: inferredCount,
        failed: totalCount - successCount,
      },
    })
  } catch (error: any) {
    console.error("[Authority] Error caching schemas:", error)
    return NextResponse.json(
      { error: error.message || "Failed to cache schemas" },
      { status: 500 },
    )
  }
}

// GET endpoint to check cached schemas
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: schemas, error } = await supabase
      .from("notion_database_schemas")
      .select("database_id, database_name, last_updated, schema_json")
      .eq("user_id", user.id)
      .order("database_name")

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch cached schemas" },
        { status: 500 },
      )
    }

    // Return summary (not full schema JSON to keep response small)
    const summary = schemas.map((s) => ({
      database_id: s.database_id,
      database_name: s.database_name,
      last_updated: s.last_updated,
      property_count: Object.keys(s.schema_json || {}).length,
      properties: Object.keys(s.schema_json || {}),
    }))

    return NextResponse.json({
      success: true,
      schemas: summary,
      count: schemas.length,
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching cached schemas:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch cached schemas" },
      { status: 500 },
    )
  }
}
