/**
 * Get cached Notion database schema from Supabase
 * 
 * @param userId - User ID
 * @param databaseId - Notion database ID
 * @param databaseName - Notion database name (optional, for fallback lookup)
 * @returns Cached schema or null if not found
 */

import { createClient } from "@/lib/supabase/server"

export async function getCachedSchema(
  userId: string,
  databaseId: string,
  databaseName?: string,
): Promise<Record<string, any> | null> {
  try {
    const supabase = await createClient()

    // Try lookup by database_id first
    let { data, error } = await supabase
      .from("notion_database_schemas")
      .select("schema_json")
      .eq("user_id", userId)
      .eq("database_id", databaseId)
      .single()

    // If not found and databaseName provided, try by name
    if (error && databaseName) {
      const { data: nameData, error: nameError } = await supabase
        .from("notion_database_schemas")
        .select("schema_json")
        .eq("user_id", userId)
        .eq("database_name", databaseName)
        .single()

      if (!nameError && nameData) {
        data = nameData
        error = null
      }
    }

    if (error || !data) {
      return null
    }

    return data.schema_json as Record<string, any>
  } catch (err) {
    console.error("[Authority] Error fetching cached schema:", err)
    return null
  }
}

/**
 * Store Notion database schema in Supabase cache
 * 
 * @param userId - User ID
 * @param databaseId - Notion database ID
 * @param databaseName - Notion database name
 * @param schema - Schema object from Notion API
 */
export async function cacheSchema(
  userId: string,
  databaseId: string,
  databaseName: string,
  schema: Record<string, any>,
): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("notion_database_schemas")
      .upsert(
        {
          user_id: userId,
          database_id: databaseId,
          database_name: databaseName,
          schema_json: schema,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "user_id,database_id",
        },
      )

    if (error) {
      console.error("[Authority] Error caching schema:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("[Authority] Error caching schema:", err)
    return false
  }
}


