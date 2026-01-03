/**
 * Notion Token Manager
 * Handles token retrieval, validation, and refresh for Notion MCP
 */

import { createClient } from "@/lib/supabase/server"
import { decryptApiKey } from "@/lib/encryption"

interface TokenInfo {
  token: string
  source: "session" | "oauth_stored" | "integration"
  isValid: boolean
}

/**
 * Verify Notion token is valid by making a test API call
 */
export async function verifyNotionToken(token: string): Promise<boolean> {
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

/**
 * Get the best available Notion token for a user
 * Priority:
 * 1. Session provider token (most fresh, from Supabase Auth)
 * 2. Stored OAuth token (from user_settings)
 * 3. Integration token (from user_settings, decrypted)
 * 
 * Also validates token before returning
 */
export async function getBestNotionToken(userId: string): Promise<TokenInfo | null> {
  const supabase = await createClient()

  // Priority 1: Try to get token from current session (most reliable)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.provider_token) {
    const isValid = await verifyNotionToken(session.provider_token)
    if (isValid) {
      return {
        token: session.provider_token,
        source: "session",
        isValid: true,
      }
    }
    console.warn("[Notion Token] Session provider token is invalid")
  }

  // Priority 2: Get stored OAuth token
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notion_access_token, notion_token")
    .eq("user_id", userId)
    .single()

  if (settings?.notion_access_token) {
    const isValid = await verifyNotionToken(settings.notion_access_token)
    if (isValid) {
      return {
        token: settings.notion_access_token,
        source: "oauth_stored",
        isValid: true,
      }
    }
    console.warn("[Notion Token] Stored OAuth token is invalid or expired")
  }

  // Priority 3: Try integration token as last resort
  if (settings?.notion_token) {
    try {
      const decrypted = await decryptApiKey(settings.notion_token)
      const isValid = await verifyNotionToken(decrypted)
      if (isValid) {
        return {
          token: decrypted,
          source: "integration",
          isValid: true,
        }
      }
      console.warn("[Notion Token] Integration token is invalid")
    } catch (error) {
      console.error("[Notion Token] Failed to decrypt integration token:", error)
    }
  }

  return null
}

/**
 * Refresh OAuth token if possible
 * Note: Supabase Auth handles OAuth token refresh automatically
 * This function checks if we can get a fresh token from the session
 */
export async function refreshNotionToken(userId: string): Promise<string | null> {
  const supabase = await createClient()

  // Try to get fresh token from session
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.provider_token) {
    const isValid = await verifyNotionToken(session.provider_token)
    if (isValid) {
      // Update stored token with fresh session token
      await supabase
        .from("user_settings")
        .update({
          notion_access_token: session.provider_token,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      return session.provider_token
    }
  }

  // If session token unavailable, check if stored token is still valid
  const tokenInfo = await getBestNotionToken(userId)
  if (tokenInfo?.isValid) {
    return tokenInfo.token
  }

  return null
}

/**
 * Get Notion token with automatic refresh if needed
 */
export async function getNotionTokenWithRefresh(userId: string): Promise<string | null> {
  const tokenInfo = await getBestNotionToken(userId)
  
  if (tokenInfo?.isValid) {
    return tokenInfo.token
  }

  // Try to refresh
  console.log("[Notion Token] Token invalid, attempting refresh...")
  const refreshed = await refreshNotionToken(userId)
  
  if (refreshed) {
    console.log("[Notion Token] Successfully refreshed token")
    return refreshed
  }

  console.error("[Notion Token] Unable to get valid token")
  return null
}


