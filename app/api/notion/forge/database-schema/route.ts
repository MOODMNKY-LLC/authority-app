import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

const FORGE_TO_DATABASE_MAP: Record<string, string> = {
  character: "Characters",
  world: "Worlds",
  storyline: "Stories",
  story: "Stories",
  magic: "Magic Systems",
  faction: "Factions & Organizations",
  lore: "Lore & History",
}

/**
 * Get database schema/properties for a specific Forge type
 * Returns the Notion database structure including all properties
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

    const { searchParams } = new URL(request.url)
    const forgeType = searchParams.get("forgeType")

    if (!forgeType) {
      return NextResponse.json(
        {
          success: false,
          error: "forgeType parameter required",
        },
        { status: 400 },
      )
    }

    const databaseName = FORGE_TO_DATABASE_MAP[forgeType]
    if (!databaseName) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown forgeType: ${forgeType}`,
        },
        { status: 400 },
      )
    }

    // Get user's Notion settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not connected",
        },
        { status: 200 },
      )
    }

    const notionToken = settings.notion_access_token || settings.notion_token
    if (!notionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion token not found",
        },
        { status: 200 },
      )
    }

    // Get database ID from user settings - use flexible matching like verify-databases
    const databases = settings.notion_databases || {}
    let databaseId = databases[databaseName]

    // If no exact match, try case-insensitive and partial matching
    if (!databaseId || typeof databaseId !== 'string') {
      const dbNameLower = databaseName.toLowerCase().trim()
      for (const [storedName, storedId] of Object.entries(databases)) {
        if (typeof storedId === 'string') {
          const storedNameLower = storedName.toLowerCase().trim()
          if (storedNameLower === dbNameLower || 
              storedNameLower.includes(dbNameLower) || 
              dbNameLower.includes(storedNameLower)) {
            databaseId = storedId
            console.log(`[Authority] Matched "${databaseName}" to stored key "${storedName}"`)
            break
          }
        }
      }
    }

    if (!databaseId || typeof databaseId !== 'string') {
      const availableKeys = databases && typeof databases === 'object' ? Object.keys(databases) : []
      console.log(`[Authority] Database "${databaseName}" not found. Available keys:`, availableKeys)
      return NextResponse.json(
        {
          success: false,
          error: `Database "${databaseName}" not found in settings`,
          databaseName,
          availableDatabases: availableKeys,
          suggestion: availableKeys.length > 0 
            ? `Available databases: ${availableKeys.slice(0, 5).join(', ')}${availableKeys.length > 5 ? '...' : ''}`
            : "No databases synced. Go to Settings → Notion → Sync Databases",
        },
        { status: 200 },
      )
    }

    // Initialize Notion client
    const notion = new Client({
      auth: notionToken,
    })

    try {
      // Retrieve database schema
      const database = await notion.databases.retrieve({
        database_id: databaseId,
      })

      // Extract properties with full details
      const properties: Record<string, any> = {}
      if (database.properties) {
        Object.entries(database.properties).forEach(([key, prop]: [string, any]) => {
          const propertyData: any = {
            id: prop.id,
            type: prop.type,
            name: key,
          }

          // Include type-specific configuration
          switch (prop.type) {
            case "select":
              propertyData.options = prop.select?.options || []
              break
            case "multi_select":
              propertyData.options = prop.multi_select?.options || []
              break
            case "number":
              propertyData.format = prop.number?.format || "number"
              break
            case "date":
              propertyData.date = prop.date || {}
              break
            case "checkbox":
              propertyData.checkbox = prop.checkbox || {}
              break
            case "url":
              propertyData.url = prop.url || {}
              break
            case "email":
              propertyData.email = prop.email || {}
              break
            case "phone_number":
              propertyData.phone_number = prop.phone_number || {}
              break
            case "rich_text":
              propertyData.rich_text = prop.rich_text || {}
              break
            case "title":
              propertyData.title = prop.title || {}
              break
          }

          properties[key] = propertyData
        })
      }

      return NextResponse.json({
        success: true,
        databaseId,
        databaseName,
        forgeType,
        properties,
        title: database.title,
        url: database.url,
      })
    } catch (notionError: any) {
      console.error("[Authority] Error retrieving database:", notionError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to retrieve database: ${notionError.message}`,
          databaseId,
          databaseName,
        },
        { status: 200 },
      )
    }
  } catch (error: any) {
    console.error("[Authority] Error in database-schema:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get database schema",
      },
      { status: 500 },
    )
  }
}

