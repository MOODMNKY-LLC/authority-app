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

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          verified: false,
          message: "Not authenticated. Please log in first.",
          missing: [],
          databases: {},
        },
        { status: 401 },
      )
    }

    // Get user's Notion settings - check both OAuth token and personal integration token
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_workspace_id, notion_databases, notion_template_page_id, notion_workspace_name")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        {
          verified: false,
          message: "Notion not connected. Please connect your Notion workspace first.",
          missing: [],
          databases: {},
        },
        { status: 200 },
      )
    }

    // Prefer personal integration token over OAuth token (more reliable)
    const notionToken = settings.notion_token || settings.notion_access_token

    if (!notionToken) {
      return NextResponse.json(
        {
          verified: false,
          message: "Notion integration not configured. Please add your Notion integration token in settings.",
          missing: [],
          databases: {},
          suggestion: "Create a personal integration at notion.so/my-integrations and add the token in Settings → Notion Integration",
        },
        { status: 200 },
      )
    }

    // Initialize Notion client with available token
    const notion = new Client({
      auth: notionToken,
    })

    // Search for databases in the workspace
    const databases: Record<string, string> = {}
    const missing: string[] = []

    try {
      // Search for all content (databases are included in search results)
      // Note: Notion API doesn't support filtering by "database" - we filter client-side
      const searchResponse = await notion.search({})

      // Map database titles to IDs
      const foundDatabases: Record<string, string> = {}
      const allFoundDatabases: Array<{ id: string; title: string; url?: string }> = []
      
      for (const result of searchResponse.results) {
        if (result.object === "database") {
          // Try to get title from title property
          let title = ""
          if ("title" in result && Array.isArray(result.title)) {
            title = result.title.map((t: any) => t.plain_text).join("")
          }
          
          // If no title, try to get it from the database itself
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
            foundDatabases[title] = result.id
            allFoundDatabases.push({
              id: result.id,
              title: title,
              url: "url" in result ? result.url : undefined,
            })
          }
          
          // Also check if database has a parent page (might be in template)
          if ("parent" in result && result.parent?.type === "page_id") {
            console.log("[Authority] Found database:", title || result.id, "in page:", result.parent.page_id)
          }
        }
      }

      console.log("[Authority] Found databases:", Object.keys(foundDatabases))
      console.log("[Authority] All databases in workspace:", allFoundDatabases.map(db => `${db.title} (${db.id.substring(0, 8)}...)`))

      // Check for required databases
      for (const dbName of REQUIRED_DATABASES) {
        if (foundDatabases[dbName]) {
          databases[dbName] = foundDatabases[dbName]
        } else {
          missing.push(dbName)
        }
      }

      // If all databases found, update user_settings
      if (missing.length === 0) {
        await supabase
          .from("user_settings")
          .update({
            notion_databases: databases,
          })
          .eq("user_id", user.id)
      }

      // Try to verify template page exists if we have a template_page_id
      if (settings.notion_template_page_id) {
        try {
          const templatePage = await notion.pages.retrieve({
            page_id: settings.notion_template_page_id,
          })
          console.log("[Authority] Template page verified:", templatePage.id)
        } catch (templateError: any) {
          console.warn("[Authority] Template page verification failed:", templateError.message)
        }
      }

      const verified = missing.length === 0

      return NextResponse.json({
        verified,
        message: verified
          ? "All required Notion databases are configured!"
          : `Missing databases: ${missing.join(", ")}. Please duplicate the Authority template.`,
        missing,
        databases,
        allFoundDatabases: allFoundDatabases, // Include all databases found for debugging
        workspaceId: settings.notion_workspace_id,
        workspaceName: settings.notion_workspace_name,
        templatePageId: settings.notion_template_page_id,
        foundCount: Object.keys(databases).length,
        requiredCount: REQUIRED_DATABASES.length,
        totalDatabasesFound: allFoundDatabases.length,
      })
    } catch (notionError: any) {
      console.error("[Authority] Notion API error:", notionError)
      return NextResponse.json(
        {
          verified: false,
          message: `Notion API error: ${notionError.message || "Failed to verify databases"}`,
          missing: REQUIRED_DATABASES,
          databases: {},
        },
        { status: 200 },
      )
    }
  } catch (error: any) {
    console.error("[Authority] Template verification error:", error)
    return NextResponse.json(
      {
        verified: false,
        message: error.message || "Failed to verify Notion template",
        missing: REQUIRED_DATABASES,
        databases: {},
      },
      { status: 500 },
    )
  }
}

// POST endpoint to manually trigger verification and update settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call the GET logic to verify
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_workspace_id, notion_databases, notion_template_page_id")
      .eq("user_id", user.id)
      .single()

    // Prefer personal integration token over OAuth token
    const notionToken = settings?.notion_token || settings?.notion_access_token

    if (!settings || !notionToken) {
      return NextResponse.json(
        {
          verified: false,
          message: "Notion not connected. Please add your Notion integration token in settings.",
          suggestion: "Create a personal integration at notion.so/my-integrations",
        },
        { status: 200 },
      )
    }

    const notion = new Client({
      auth: notionToken,
    })

    const databases: Record<string, string> = {}
    const missing: string[] = []

    // Search for all content (databases are included in search results)
    // Note: Notion API doesn't support filtering by "database" - we filter client-side
    const searchResponse = await notion.search({})

    const foundDatabases: Record<string, string> = {}
    for (const result of searchResponse.results) {
      if (result.object === "database") {
        if ("title" in result && Array.isArray(result.title)) {
          const title = result.title.map((t: any) => t.plain_text).join("")
          if (title) {
            foundDatabases[title] = result.id
          }
        }
      }
    }

    // Check for required databases
    for (const dbName of REQUIRED_DATABASES) {
      if (foundDatabases[dbName]) {
        databases[dbName] = foundDatabases[dbName]
      } else {
        missing.push(dbName)
      }
    }

    // Update user_settings with found databases
    await supabase
      .from("user_settings")
      .update({
        notion_databases: databases,
      })
      .eq("user_id", user.id)

    const verified = missing.length === 0

    return NextResponse.json({
      verified,
      message: verified
        ? "All required Notion databases are configured!"
        : `Missing databases: ${missing.join(", ")}. Please duplicate the Authority template.`,
      missing,
      databases,
      foundCount: Object.keys(databases).length,
      requiredCount: REQUIRED_DATABASES.length,
    })
  } catch (error: any) {
    console.error("[Authority] Template verification POST error:", error)
    return NextResponse.json(
      {
        verified: false,
        message: error.message || "Failed to verify Notion template",
        missing: REQUIRED_DATABASES,
        databases: {},
      },
      { status: 500 },
    )
  }
}

