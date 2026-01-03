/**
 * Helper functions for Notion FDW operations
 * These provide convenient wrappers around FDW queries
 */

import { createServerClient } from "@/lib/supabase/server"

/**
 * Ensure FDW is set up for a user
 * Creates FDW server and tables if they don't exist
 */
export async function ensureNotionFDW(userId: string): Promise<{
  success: boolean
  server?: string
  schema?: string
  error?: string
}> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase.rpc("create_user_notion_fdw_tables", {
      p_user_id: userId,
    })

    if (error) {
      // Check if wrappers extension is available
      if (error.message?.includes("does not exist") || error.message?.includes("wrappers")) {
        return {
          success: false,
          error: "FDW not available. Wrappers extension may not be enabled.",
        }
      }

      return {
        success: false,
        error: error.message || "Failed to setup FDW",
      }
    }

    // Get server and schema names
    const { data: settings } = await supabase
      .from("user_settings")
      .select("notion_fdw_server, notion_fdw_schema")
      .eq("user_id", userId)
      .single()

    return {
      success: true,
      server: settings?.notion_fdw_server,
      schema: settings?.notion_fdw_schema,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to ensure FDW",
    }
  }
}

/**
 * Get blocks from a Notion page via FDW
 * Perfect for RAG content extraction
 */
export async function getNotionPageBlocksFDW(
  userId: string,
  pageId: string,
): Promise<{
  success: boolean
  blocks?: Array<{
    id: string
    type: string
    content: string
    attrs: any
  }>
  error?: string
}> {
  try {
    const supabase = await createServerClient()

    const { data: blocks, error } = await supabase.rpc("get_notion_page_blocks_fdw", {
      p_user_id: userId,
      p_page_id: pageId,
    })

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to get blocks",
      }
    }

    return {
      success: true,
      blocks: blocks || [],
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get blocks",
    }
  }
}

/**
 * Query a Notion page via FDW for fresh data
 */
export async function queryNotionPageFDW(
  userId: string,
  pageId: string,
): Promise<{
  success: boolean
  page?: any
  error?: string
}> {
  try {
    const supabase = await createServerClient()

    const { data: pageData, error } = await supabase.rpc("query_notion_page_fdw", {
      p_user_id: userId,
      p_page_id: pageId,
    })

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to query page",
      }
    }

    return {
      success: true,
      page: pageData,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to query page",
    }
  }
}




