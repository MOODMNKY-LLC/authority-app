import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
 * Debug endpoint to check database connection status for a Forge type
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

    const debugInfo: any = {
      forgeType,
      databaseName,
      hasSettings: !!settings,
      settingsError: settingsError?.message,
      hasOAuthToken: !!settings?.notion_access_token,
      hasIntegrationToken: !!settings?.notion_token,
      hasAnyToken: !!(settings?.notion_access_token || settings?.notion_token),
      databases: settings?.notion_databases || {},
      databaseKeys: settings?.notion_databases ? Object.keys(settings.notion_databases) : [],
    }

    // Try to find database ID
    const databases = settings?.notion_databases || {}
    let databaseId = databases[databaseName]

    // Try flexible matching
    if (!databaseId || typeof databaseId !== 'string') {
      const dbNameLower = databaseName.toLowerCase().trim()
      for (const [storedName, storedId] of Object.entries(databases)) {
        if (typeof storedId === 'string') {
          const storedNameLower = storedName.toLowerCase().trim()
          if (storedNameLower === dbNameLower || 
              storedNameLower.includes(dbNameLower) || 
              dbNameLower.includes(storedNameLower)) {
            databaseId = storedId
            debugInfo.matchedDatabase = storedName
            debugInfo.databaseId = storedId
            break
          }
        }
      }
    } else {
      debugInfo.databaseId = databaseId
    }

    debugInfo.databaseFound = !!databaseId

    return NextResponse.json({
      success: true,
      debug: debugInfo,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Debug failed",
      },
      { status: 500 },
    )
  }
}



