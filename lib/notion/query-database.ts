import { Client } from "@notionhq/client"

/**
 * Helper function to query a Notion database with fallback to raw HTTP
 * if the SDK's query method is missing (Next.js/Turbopack bundling issue)
 * 
 * @param notion - Notion Client instance
 * @param databaseId - Database ID to query
 * @param options - Query options (page_size, start_cursor, sorts)
 * @param token - Optional auth token (if not provided, will try to extract from client)
 */
export async function queryNotionDatabase(
  notion: Client,
  databaseId: string,
  options: {
    page_size?: number
    start_cursor?: string
    sorts?: Array<{
      timestamp?: "last_edited_time" | "created_time"
      direction?: "ascending" | "descending"
    }>
  } = {},
  token?: string
): Promise<any> {
  // Try SDK method first
  if (notion?.databases?.query && typeof notion.databases.query === 'function') {
    try {
      return await notion.databases.query({
        database_id: databaseId,
        ...options,
      })
    } catch (error: any) {
      // If it's not a "not a function" error, throw it
      if (!error.message?.includes('query is not a function') && !error.message?.includes('not a function')) {
        throw error
      }
      // Otherwise fall through to raw HTTP
    }
  }

  // Fallback to raw HTTP API call
  // Extract token from Client instance if not provided
  let authToken: string | null = token || null
  
  if (!authToken) {
    try {
      // Try multiple ways to access the token from Client instance
      const clientAny = notion as any
      authToken = clientAny.auth || 
                  clientAny.token || 
                  clientAny._options?.auth ||
                  clientAny.options?.auth ||
                  clientAny.client?.auth ||
                  null
      
      // If still no token, try to access it via the constructor options
      if (!authToken && clientAny._clientOptions) {
        authToken = clientAny._clientOptions.auth
      }
    } catch (e) {
      // Ignore access errors
    }
  }
  
  if (!authToken) {
    throw new Error("Notion client missing auth token for raw HTTP fallback. Cannot query database. Please pass token as third parameter.")
  }

  const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_size: options.page_size || 100,
      start_cursor: options.start_cursor,
      sorts: options.sorts,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Notion API error: ${error.message || response.statusText}`)
  }

  return await response.json()
}

