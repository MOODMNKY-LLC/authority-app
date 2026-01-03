/**
 * Notion OAuth Token Exchange
 * Properly exchanges OAuth authorization code for Notion access token
 * This ensures we have a valid OAuth token for Notion MCP
 */

/**
 * Exchange Notion OAuth authorization code for access token
 * This is the proper way to get Notion OAuth tokens for MCP
 */
export async function exchangeNotionOAuthCode(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string
  token_type: string
  workspace_id: string
  workspace_name?: string
  bot_id: string
}> {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Notion OAuth credentials not configured")
  }

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(`Notion OAuth token exchange failed: ${error.error || response.statusText}`)
  }

  const data = await response.json()
  return data
}

/**
 * Get Notion OAuth token from Supabase session or exchange code
 * This ensures we have a proper OAuth token for MCP
 */
export async function getNotionOAuthToken(userId: string): Promise<string | null> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()

  // Try to get from current session first
  const { data: { session } } = await supabase.auth.getSession()
  
  // Check if session has provider_token (Notion OAuth token)
  if (session?.provider_token) {
    // Verify it's a valid Notion token
    const isValid = await verifyNotionToken(session.provider_token)
    if (isValid) {
      return session.provider_token
    }
  }

  // Check stored OAuth token
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notion_access_token")
    .eq("user_id", userId)
    .single()

  if (settings?.notion_access_token) {
    const isValid = await verifyNotionToken(settings.notion_access_token)
    if (isValid) {
      return settings.notion_access_token
    }
  }

  return null
}

async function verifyNotionToken(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    })
    return response.ok
  } catch {
    return false
  }
}


