/**
 * Notion OAuth Helper
 * Ensures we properly capture and store Notion OAuth tokens for MCP use
 */

import { createClient } from "@/lib/supabase/server"

/**
 * Store Notion OAuth token from OAuth callback
 * This should be called during the OAuth callback flow
 */
export async function storeNotionOAuthToken(
  userId: string,
  accessToken: string,
  workspaceId?: string
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        notion_access_token: accessToken,
        notion_workspace_id: workspaceId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

  console.log("[Notion OAuth] Stored OAuth token for MCP use")
}

/**
 * Check if we have a proper OAuth token stored
 * Returns true if we have an OAuth token (not integration token)
 */
export async function hasNotionOAuthToken(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { analyzeNotionToken } = await import("./notion-token-detector")

  const { data: settings } = await supabase
    .from("user_settings")
    .select("notion_access_token")
    .eq("user_id", userId)
    .single()

  if (!settings?.notion_access_token) {
    return false
  }

  const analysis = analyzeNotionToken(settings.notion_access_token)
  return analysis.type === "oauth"
}

/**
 * Get guidance for user based on their token situation
 */
export async function getNotionMCPGuidance(userId: string): Promise<{
  canUseRemote: boolean
  canUseLocal: boolean
  recommendation: string
  steps: string[]
}> {
  const supabase = await createClient()
  const { analyzeNotionToken, verifyTokenWithNotionAPI } = await import("./notion-token-detector")

  const { data: settings } = await supabase
    .from("user_settings")
    .select("notion_access_token, notion_token")
    .eq("user_id", userId)
    .single()

  const oauthToken = settings?.notion_access_token
  const integrationToken = settings?.notion_token

  let canUseRemote = false
  let canUseLocal = false
  let recommendation = ""
  let steps: string[] = []

  if (oauthToken) {
    const analysis = analyzeNotionToken(oauthToken)
    if (analysis.type === "oauth") {
      const isValid = await verifyTokenWithNotionAPI(oauthToken)
      if (isValid) {
        canUseRemote = true
        recommendation = "You have a valid OAuth token. Remote MCP server is ready to use."
        steps = ["Toggle Notion MCP ON in settings"]
      } else {
        recommendation = "OAuth token is expired. Please re-authenticate with Notion OAuth."
        steps = ["Go to Notion section", "Click 'Connect with Notion'", "Complete OAuth flow"]
      }
    }
  }

  if (integrationToken) {
    // Would need to decrypt first, but for guidance we can check if it exists
    canUseLocal = true
    if (!canUseRemote) {
      recommendation = "You have an integration token. Set up local MCP server or authenticate via OAuth."
      steps = [
        "Option A: Authenticate via Notion OAuth (recommended)",
        "Option B: Set up local MCP server (see docs/NOTION_MCP_LOCAL_SERVER_SETUP.md)",
      ]
    }
  }

  if (!oauthToken && !integrationToken) {
    recommendation = "No Notion token found. Please authenticate or add integration token."
    steps = [
      "Go to Notion section in settings",
      "Either: Connect via OAuth OR add integration token",
    ]
  }

  return {
    canUseRemote,
    canUseLocal,
    recommendation,
    steps,
  }
}


