import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

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
          message: "Not authenticated",
        },
        { status: 401 },
      )
    }

    // Get user settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select(
        "notion_access_token, notion_token, notion_workspace_id, notion_workspace_name, notion_databases, notion_template_page_id, updated_at",
      )
      .eq("user_id", user.id)
      .single()

    // Get auth provider info and user data
    const { data: authData } = await supabase.auth.getUser()
    const authProvider = authData?.user?.app_metadata?.provider
    const identities = authData?.user?.identities || []
    const notionIdentity = identities.find((id: any) => id.provider === "notion")
    
    // Get user profile data for display
    const userEmail = authData?.user?.email
    const userName = authData?.user?.user_metadata?.name || authData?.user?.user_metadata?.full_name
    const userAvatar = authData?.user?.user_metadata?.avatar_url || authData?.user?.user_metadata?.picture

    const hasOAuthToken = !!settings?.notion_access_token
    const hasIntegrationToken = !!settings?.notion_token
    const hasAnyToken = hasOAuthToken || hasIntegrationToken

    // Test token validity if we have one
    let tokenValid = false
    let tokenTestError: string | null = null
    let workspaceInfo: any = null

    if (hasAnyToken) {
      try {
        const notion = new Client({
          auth: settings?.notion_access_token || settings?.notion_token,
        })

        // Try a simple API call to verify token
        const searchResponse = await notion.search({ page_size: 1 })
        tokenValid = true

        // Try to get workspace info if we have OAuth token
        if (hasOAuthToken && settings?.notion_workspace_id) {
          workspaceInfo = {
            id: settings.notion_workspace_id,
            name: settings.notion_workspace_name || "Unknown",
          }
        }
      } catch (error: any) {
        tokenValid = false
        tokenTestError = error.message || "Token validation failed"
      }
    }

    // Get database sync status
    const databases = settings?.notion_databases || {}
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
    const databaseStatus = REQUIRED_DATABASES.reduce(
      (acc, dbName) => {
        acc[dbName] = {
          synced: !!databases[dbName],
          id: databases[dbName] || null,
        }
        return acc
      },
      {} as Record<string, { synced: boolean; id: string | null }>,
    )

    const syncedCount = Object.values(databaseStatus).filter((s) => s.synced).length

    return NextResponse.json({
      authenticated: true,
      user: {
        email: userEmail || null,
        name: userName || null,
        avatar: userAvatar || null,
        id: user?.id || null,
      },
      connection: {
        oauth: {
          connected: hasOAuthToken,
          provider: authProvider === "notion" ? "notion" : null,
          hasIdentity: !!notionIdentity,
          workspaceId: settings?.notion_workspace_id || null,
          workspaceName: settings?.notion_workspace_name || null,
          identityData: notionIdentity ? {
            provider: notionIdentity.provider,
            id: notionIdentity.id,
            createdAt: notionIdentity.created_at,
            updatedAt: notionIdentity.updated_at,
          } : null,
        },
        integration: {
          connected: hasIntegrationToken,
        },
        token: {
          type: hasOAuthToken ? "oauth" : hasIntegrationToken ? "integration" : null,
          valid: tokenValid,
          error: tokenTestError,
        },
        lastUpdated: settings?.updated_at || null,
      },
      databases: {
        status: databaseStatus,
        syncedCount,
        totalCount: REQUIRED_DATABASES.length,
        allDatabases: databases,
      },
      template: {
        pageId: settings?.notion_template_page_id || null,
      },
      canSync: hasAnyToken && tokenValid,
    })
  } catch (error: any) {
    console.error("[Authority] Connection status error:", error)
    return NextResponse.json(
      {
        authenticated: false,
        error: error.message || "Failed to get connection status",
      },
      { status: 500 },
    )
  }
}

