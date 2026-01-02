import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
          message: "Not authenticated. Please log in first.",
        },
        { status: 401 },
      )
    }

    // Check if user has Notion OAuth token
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_workspace_id")
      .eq("user_id", user.id)
      .single()

    const hasOAuthToken = !!settings?.notion_access_token
    const hasIntegrationToken = !!settings?.notion_token
    const hasAnyToken = hasOAuthToken || hasIntegrationToken

    // Check if user authenticated with Notion provider
    const { data: authData } = await supabase.auth.getUser()
    const authProvider = authData?.user?.app_metadata?.provider
    const isNotionAuth = authProvider === "notion"
    
    // Check identities to see if user has Notion identity linked
    const identities = authData?.user?.identities || []
    const notionIdentity = identities.find((id: any) => id.provider === "notion")

    // Note: Supabase does NOT persist provider tokens in the database
    // They're only available in the session object during the OAuth callback
    // If token wasn't captured during callback, user needs to add integration token
    const needsReAuth = isNotionAuth && !hasOAuthToken && !hasIntegrationToken

    return NextResponse.json({
      authenticated: true,
      hasOAuthToken,
      hasIntegrationToken,
      hasAnyToken,
      authProvider,
      isNotionAuth,
      hasNotionIdentity: !!notionIdentity,
      needsReAuth,
      canSync: hasAnyToken,
      message: hasAnyToken
        ? "Ready to sync databases"
        : needsReAuth && isNotionAuth
          ? "Notion OAuth completed, but access token wasn't captured during callback. Please add an integration token (recommended) or re-authenticate."
          : "Please authenticate with Notion OAuth or add an integration token",
    })
  } catch (error: any) {
    console.error("[Authority] OAuth check error:", error)
    return NextResponse.json(
      {
        authenticated: false,
        error: error.message || "Failed to check OAuth status",
      },
      { status: 500 },
    )
  }
}

