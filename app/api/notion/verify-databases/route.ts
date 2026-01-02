import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

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
          authenticated: false,
          error: "Not authenticated",
        },
        { status: 401 },
      )
    }

    // Get user settings - same pattern as connection-status endpoint
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({
        authenticated: true,
        connected: false,
        error: "User settings not found",
        databases: {},
        accessibleCount: 0,
        inaccessibleCount: REQUIRED_DATABASES.length,
        totalCount: REQUIRED_DATABASES.length,
        allAccessible: false,
      })
    }

    const hasOAuthToken = !!settings?.notion_access_token
    const hasIntegrationToken = !!settings?.notion_token
    const hasAnyToken = hasOAuthToken || hasIntegrationToken

    if (!hasAnyToken) {
      return NextResponse.json({
        authenticated: true,
        connected: false,
        error: "No Notion token found",
        databases: {},
        accessibleCount: 0,
        inaccessibleCount: REQUIRED_DATABASES.length,
        totalCount: REQUIRED_DATABASES.length,
        allAccessible: false,
      })
    }

    const notion = new Client({
      auth: settings?.notion_access_token || settings?.notion_token,
    })

    // Verify token is valid first
    let tokenValid = false
    try {
      await notion.users.me({})
      tokenValid = true
    } catch (tokenError: any) {
      return NextResponse.json({
        authenticated: true,
        connected: false,
        error: `Token invalid: ${tokenError.message}`,
        databases: {},
        accessibleCount: 0,
        inaccessibleCount: REQUIRED_DATABASES.length,
        totalCount: REQUIRED_DATABASES.length,
        allAccessible: false,
      })
    }

    // Get database IDs from settings - use exact same pattern as connection-status endpoint
    // This endpoint works, so we'll match its logic exactly
    const databases = settings.notion_databases || {}
    
    // Debug logging - match connection-status pattern
    console.log("[Authority] Verifying databases for user:", user.id)
    console.log("[Authority] notion_databases type:", typeof databases)
    console.log("[Authority] notion_databases is null:", databases === null)
    console.log("[Authority] notion_databases is undefined:", databases === undefined)
    console.log("[Authority] notion_databases keys count:", databases && typeof databases === 'object' ? Object.keys(databases).length : 0)
    console.log("[Authority] notion_databases keys:", databases && typeof databases === 'object' ? Object.keys(databases) : 'N/A')
    
    // Log a sample to see structure
    if (databases && typeof databases === 'object') {
      const sampleKeys = Object.keys(databases).slice(0, 3)
      const sample: Record<string, any> = {}
      sampleKeys.forEach(key => {
        sample[key] = {
          value: databases[key],
          type: typeof databases[key],
          isString: typeof databases[key] === 'string',
        }
      })
      console.log("[Authority] Sample database entries:", JSON.stringify(sample, null, 2))
    }
    
    // Ping each database individually
    const databaseStatus: Record<
      string,
      {
        accessible: boolean
        id: string | null
        error?: string
        name?: string
      }
    > = {}

    // Check each required database - use flexible matching like sync-databases does
    for (const dbName of REQUIRED_DATABASES) {
      // Try exact match first
      let dbId = databases[dbName]
      
      // If no exact match, try case-insensitive and partial matching
      if (!dbId || typeof dbId !== 'string') {
        const dbNameLower = dbName.toLowerCase().trim()
        for (const [storedName, storedId] of Object.entries(databases)) {
          if (typeof storedId === 'string') {
            const storedNameLower = storedName.toLowerCase().trim()
            if (storedNameLower === dbNameLower || 
                storedNameLower.includes(dbNameLower) || 
                dbNameLower.includes(storedNameLower)) {
              dbId = storedId
              console.log(`[Authority] Matched "${dbName}" to stored key "${storedName}"`)
              break
            }
          }
        }
      }

      if (!dbId || typeof dbId !== 'string') {
        // Database ID not found in settings
        const availableKeys = databases && typeof databases === 'object' ? Object.keys(databases) : []
        databaseStatus[dbName] = {
          accessible: false,
          id: null,
          error: availableKeys.length > 0 
            ? `Not found. Available keys: ${availableKeys.slice(0, 5).join(', ')}${availableKeys.length > 5 ? '...' : ''}`
            : "Database ID not found in settings",
        }
        continue
      }

      // Ping the database
      try {
        const dbDetails = await notion.databases.retrieve({
          database_id: dbId,
        })

        databaseStatus[dbName] = {
          accessible: true,
          id: dbId,
          name: dbDetails.title?.[0]?.plain_text || dbName,
        }
      } catch (error: any) {
        // Database not accessible (deleted, access revoked, etc.)
        databaseStatus[dbName] = {
          accessible: false,
          id: dbId,
          error: error.message || "Database not accessible",
        }
      }
    }

    const accessibleCount = Object.values(databaseStatus).filter((s) => s.accessible).length
    const inaccessibleCount = Object.values(databaseStatus).filter((s) => !s.accessible).length

    return NextResponse.json({
      authenticated: true,
      connected: tokenValid,
      databases: databaseStatus,
      accessibleCount,
      inaccessibleCount,
      totalCount: REQUIRED_DATABASES.length,
      allAccessible: accessibleCount === REQUIRED_DATABASES.length,
    })
  } catch (error: any) {
    console.error("[Authority] Error verifying databases:", error)
    return NextResponse.json(
      {
        authenticated: false,
        connected: false,
        error: error.message || "Failed to verify databases",
        databases: {},
        accessibleCount: 0,
        inaccessibleCount: REQUIRED_DATABASES.length,
        totalCount: REQUIRED_DATABASES.length,
        allAccessible: false,
      },
      { status: 500 },
    )
  }
}

