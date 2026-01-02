import { createClient } from "@/lib/supabase/server"

/**
 * Get Notion API token for a user
 * PRIORITIZES OAuth token - this is what users authenticate with
 * Falls back to integration token if OAuth not available
 * 
 * @param userId - The authenticated user's ID
 * @returns Notion API token or null if not configured
 */
export async function getNotionToken(userId: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notion_token, notion_access_token")
    .eq("user_id", userId)
    .single()

  if (!settings) {
    return null
  }

  // PRIORITIZE OAuth token - this is what users authenticate with
  // Fall back to integration token if OAuth not available
  return settings.notion_access_token || settings.notion_token || null
}

/**
 * Get Notion token with user authentication check
 * Convenience function that gets user and token in one call
 * 
 * @returns Object with user and token, or error
 */
export async function getNotionTokenWithUser(): Promise<{
  user: { id: string } | null
  token: string | null
  error?: string
}> {
  const supabase = await createClient()
  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      user: null,
      token: null,
      error: "Not authenticated",
    }
  }

  const token = await getNotionToken(user.id)

  if (!token) {
    return {
      user,
      token: null,
      error: "Notion integration not configured",
    }
  }

  return {
    user,
    token,
  }
}

