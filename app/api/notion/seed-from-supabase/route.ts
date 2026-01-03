import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"
import { queryNotionDatabase } from "@/lib/notion/query-database"
import { rateLimitedCall } from "@/lib/notion/rate-limiter"
import { getCachedSchema, cacheSchema } from "@/lib/notion/get-cached-schema"

// Map Forge types to Supabase sync table names
// Note: Magic Systems, Factions, Lore, and Chapters use notion_pages_sync with database_name filter
const FORGE_TO_TABLE_MAP: Record<string, string> = {
  character: "notion_characters_sync",
  world: "notion_worlds_sync",
  story: "notion_stories_sync",
  chapter: "notion_pages_sync",
  "magic-system": "notion_pages_sync",
  faction: "notion_pages_sync",
  lore: "notion_pages_sync",
}

// Map Forge types to Notion database names (from user_settings)
const FORGE_TO_DATABASE_MAP: Record<string, string> = {
  character: "Characters",
  world: "Worlds",
  story: "Stories",
  chapter: "Chapters",
  "magic-system": "Magic Systems",
  faction: "Factions & Organizations",
  lore: "Lore & History",
}

// Property name mappings: seed data property names -> Notion schema property names
// Based on actual Authority template database schemas
const PROPERTY_NAME_MAPPINGS: Record<string, Record<string, string>> = {
  story: {
    "Synopsis": "Premise", // Maps to "Premise" in schema
    "Word Count": "Target Word Count", // Maps to "Target Word Count"
    "Tags": "Main Themes", // Maps to "Main Themes" (multi_select)
    "Main Characters": "Main Themes", // Also maps to "Main Themes" (will be merged)
  },
  world: {
    "History": "History Timeline", // Maps to "History Timeline" in schema
  },
  "magic-system": {
    "Type": "Concept", // Maps to "Concept" in schema
    "Users": "User Requirements", // Maps to "User Requirements"
    "Source": "Power Source", // Maps to "Power Source"
    "Limitations": "Rules & Limitations", // Maps to "Rules & Limitations"
  },
  faction: {
    "Influence": "Power Level", // Maps to Power Level
    "Size": "Size", // Try exact match first, then fuzzy
    "History": "History", // Try exact match first, then fuzzy
    "Members": "Members", // Try exact match first, then fuzzy
    "Alignment": "Alignment", // Try exact match first, then fuzzy
    "Type": "Type", // Try exact match first, then fuzzy
    "Goals": "Goals", // Try exact match first, then fuzzy
  },
  lore: {
    "Date": "Time Period", // Maps to "Time Period"
    "Details": "Overview", // Maps to "Overview"
    "Consequences": "Overview", // May map to Overview
    "Related Events": "Overview", // May map to Overview
  },
}

// Helper function to find the best matching property name in schema
const findSchemaPropertyName = (
  seedPropertyName: string,
  schema: Record<string, any>,
  forgeType: string,
): string | null => {
  const schemaKeys = Object.keys(schema)
  
  // First, check explicit mappings
  const mappings = PROPERTY_NAME_MAPPINGS[forgeType] || {}
  if (mappings[seedPropertyName]) {
    const mappedName = mappings[seedPropertyName]
    if (schema[mappedName]) {
      return mappedName
    }
    // If mapped name doesn't exist, try to find similar
    const mappedMatch = schemaKeys.find(
      (name) => name.toLowerCase() === mappedName.toLowerCase(),
    )
    if (mappedMatch) {
      return mappedMatch
    }
  }

  // Try exact match (case-insensitive)
  const exactMatch = schemaKeys.find(
    (name) => name.toLowerCase() === seedPropertyName.toLowerCase(),
  )
  if (exactMatch) {
    return exactMatch
  }

  // Try partial match (contains) - more flexible
  const partialMatch = schemaKeys.find(
    (name) => {
      const nameLower = name.toLowerCase()
      const seedLower = seedPropertyName.toLowerCase()
      return nameLower.includes(seedLower) || seedLower.includes(nameLower)
    }
  )
  if (partialMatch) {
    return partialMatch
  }

  // Try fuzzy matching on key words - enhanced
  const seedWords = seedPropertyName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const fuzzyMatch = schemaKeys.find((name) => {
    const nameWords = name.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    // Check if any seed word matches any schema word (or vice versa)
    return seedWords.some((word) =>
      nameWords.some((nw) => {
        // Exact word match
        if (nw === word) return true
        // One contains the other (for compound words)
        if (nw.includes(word) || word.includes(nw)) return true
        // Check for common abbreviations/synonyms
        const synonyms: Record<string, string[]> = {
          "size": ["scale", "scope", "magnitude"],
          "history": ["background", "timeline", "past", "backstory"],
          "members": ["people", "personnel", "roster", "roster"],
          "alignment": ["morality", "ethics", "stance"],
          "type": ["category", "kind", "classification"],
          "goals": ["objectives", "aims", "purposes"],
        }
        const seedSynonyms = synonyms[word] || []
        const nameSynonyms = synonyms[nw] || []
        return seedSynonyms.includes(nw) || nameSynonyms.includes(word)
      })
    )
  })
  if (fuzzyMatch) {
    return fuzzyMatch
  }

  // Log available schema properties for debugging
  console.log(
    `[Authority]   → 🔍 No match found for "${seedPropertyName}" (${forgeType}). Available schema properties:`,
    schemaKeys.join(", "),
  )

  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: "Failed to load user settings" },
        { status: 500 },
      )
    }

    const notionToken = settings.notion_access_token || settings.notion_token
    if (!notionToken) {
      return NextResponse.json(
        { error: "Notion token not found. Please connect Notion first." },
        { status: 400 },
      )
    }

    const notionDatabases = settings.notion_databases || {}
    if (typeof notionDatabases === "string") {
      try {
        JSON.parse(notionDatabases)
      } catch {
        // If parsing fails, treat as empty
      }
    }

    // Initialize Notion client
    const notion = new Client({ auth: notionToken })

    // Validate token
    try {
      await notion.users.me({})
    } catch (tokenError: any) {
      return NextResponse.json(
        { error: `Invalid Notion token: ${tokenError.message}` },
        { status: 401 },
      )
    }

    const results: Record<string, { synced: number; errors: number }> = {}

    // Helper function to normalize rich_text properties from plain_text to text.content format
    const normalizeRichText = (propValue: any): any => {
      if (propValue && typeof propValue === 'object' && Array.isArray(propValue.rich_text)) {
        return {
          ...propValue,
          rich_text: propValue.rich_text.map((item: any) => {
            // If it has plain_text but no text, convert it
            if (item.plain_text && !item.text) {
              return {
                text: {
                  content: item.plain_text,
                },
              }
            }
            // If it already has text, use as-is
            if (item.text) {
              return item
            }
            // Fallback: try to extract text from any format
            return {
              text: {
                content: item.plain_text || item.content || String(item),
              },
            }
          }),
        }
      }
      return propValue
    }

    // Helper function to convert property value to match schema type
    const convertPropertyToSchemaType = (value: any, expectedType: string): any => {
      if (!value || value === null || value === undefined) {
        return null
      }

      // If value is already in correct format, return as-is
      if (value[expectedType]) {
        return value
      }

      // Convert based on expected type
      switch (expectedType) {
        case "multi_select":
          // Convert select to multi_select
          if (value.select && value.select.name) {
            return { multi_select: [{ name: value.select.name }] }
          }
          // Convert rich_text to multi_select (extract text and split if comma-separated)
          if (value.rich_text && Array.isArray(value.rich_text)) {
            const textContent = value.rich_text
              .map((item: any) => item.text?.content || item.plain_text || item.content || String(item))
              .join(' ')
              .trim()
            if (textContent) {
              // Check if it contains commas (likely comma-separated list)
              if (textContent.includes(',')) {
                const items = textContent.split(',').map((item: string) => item.trim()).filter(Boolean)
                return { multi_select: items.map((item: string) => ({ name: item })) }
              }
              // Single value
              return { multi_select: [{ name: textContent }] }
            }
          }
          // If already array, wrap in multi_select format
          if (Array.isArray(value)) {
            return { multi_select: value.map((v: any) => 
              typeof v === 'string' ? { name: v } : (v.name ? { name: v.name } : v)
            ) }
          }
          // If string, check if it's comma-separated and split it
          if (typeof value === 'string') {
            // Check if it contains commas (likely comma-separated list)
            if (value.includes(',')) {
              const items = value.split(',').map((item: string) => item.trim()).filter(Boolean)
              return { multi_select: items.map((item: string) => ({ name: item })) }
            }
            // Single string value
            return { multi_select: [{ name: value }] }
          }
          // If number, convert to string
          if (typeof value === 'number') {
            return { multi_select: [{ name: String(value) }] }
          }
          break

        case "select":
          // Convert multi_select to select (take first)
          if (value.multi_select && Array.isArray(value.multi_select) && value.multi_select.length > 0) {
            const first = value.multi_select[0]
            return { select: { name: typeof first === 'string' ? first : (first.name || first) } }
          }
          // If value is already in {number: X} format, extract the number
          if (value.number !== undefined && typeof value.number === 'number') {
            return { select: { name: String(value.number) } }
          }
          // If number, convert to string for select
          if (typeof value === 'number') {
            return { select: { name: String(value) } }
          }
          // If string, convert to select
          if (typeof value === 'string') {
            return { select: { name: value } }
          }
          // If already select, return as-is
          if (value.select) {
            return value
          }
          break

        case "rich_text":
          // Convert select to rich_text
          if (value.select && value.select.name) {
            return { rich_text: [{ text: { content: value.select.name } }] }
          }
          // Convert multi_select to rich_text (join with comma)
          if (value.multi_select && Array.isArray(value.multi_select)) {
            const text = value.multi_select.map((v: any) => 
              typeof v === 'string' ? v : (v.name || v)
            ).join(", ")
            return { rich_text: [{ text: { content: text } }] }
          }
          // If string, convert to rich_text
          if (typeof value === 'string') {
            return { rich_text: [{ text: { content: value } }] }
          }
          // If already rich_text, normalize it
          if (value.rich_text) {
            return normalizeRichText(value)
          }
          break

        case "number":
          // Extract number from various formats
          if (typeof value === 'number') {
            return { number: value }
          }
          if (value.number !== undefined) {
            return { number: value.number }
          }
          if (typeof value === 'string' && !isNaN(Number(value))) {
            return { number: Number(value) }
          }
          break

        case "checkbox":
          if (typeof value === 'boolean') {
            return { checkbox: value }
          }
          if (value.checkbox !== undefined) {
            return { checkbox: value.checkbox }
          }
          break
      }

      // If no conversion possible, return value as-is (might fail validation, but better than nothing)
      return value
    }

    // Process each Forge type
    for (const [forgeType, tableName] of Object.entries(FORGE_TO_TABLE_MAP)) {
      const databaseName = FORGE_TO_DATABASE_MAP[forgeType]
      const databaseId = notionDatabases[databaseName]

      if (!databaseId) {
        console.log(
          `[Authority] Skipping ${forgeType}: database "${databaseName}" not found in settings`,
        )
        results[forgeType] = { synced: 0, errors: 0 }
        continue
      }

      console.log(
        `[Authority] Syncing ${forgeType} to database "${databaseName}" (ID: ${databaseId})`,
      )

      // Get database schema - try cached first, then fetch from Notion
      let schema: Record<string, any> = {}
      let databaseUrl: string | null = null
      let parentInfo: string = ""
      
      // Try to get cached schema first
      const cachedSchema = await getCachedSchema(user.id, databaseId, databaseName)
      if (cachedSchema && Object.keys(cachedSchema).length > 0) {
        schema = cachedSchema
        console.log(
          `[Authority] ✅ Using cached schema for "${databaseName}": ${Object.keys(schema).length} properties`,
        )
        console.log(
          `[Authority]   → Database ID: ${databaseId}`,
        )
        console.log(
          `[Authority]   → Schema properties: ${Object.keys(schema).join(", ")}`,
        )
      } else {
        // Cache miss - fetch from Notion API
        console.log(
          `[Authority] ⚠️ No cached schema found for "${databaseName}" - fetching from Notion API...`,
        )
        try {
          const dbDetails = await rateLimitedCall(
            () => notion.databases.retrieve({
              database_id: databaseId,
            }),
            `Get schema for ${databaseName}`,
          )
          schema = dbDetails.properties || {}
          
          // Get parent information to help locate the database
          if (dbDetails.parent?.type === "page_id") {
            const parentPageId = dbDetails.parent.page_id
            databaseUrl = `https://notion.so/${parentPageId.replace(/-/g, "")}`
            parentInfo = `Parent Page: ${parentPageId}`
          } else if (dbDetails.parent?.type === "workspace") {
            databaseUrl = `https://notion.so/${databaseId.replace(/-/g, "")}`
            parentInfo = "Parent: Workspace"
          } else if (dbDetails.parent?.type === "block_id") {
            parentInfo = `Parent Block: ${dbDetails.parent.block_id}`
          }
          
          // Cache the schema for future use
          if (Object.keys(schema).length > 0) {
            await cacheSchema(user.id, databaseId, databaseName, schema)
            console.log(
              `[Authority] ✅ Cached schema for "${databaseName}" for future use`,
            )
          }
          
          console.log(
            `[Authority] Database "${databaseName}" schema retrieved successfully`,
          )
          console.log(
            `[Authority]   → Database ID: ${databaseId}`,
          )
          if (parentInfo) {
            console.log(
              `[Authority]   → ${parentInfo}`,
            )
          }
          console.log(
            `[Authority]   → Database URL: ${databaseUrl || "N/A"}`,
          )
          console.log(
            `[Authority]   → Schema properties count: ${Object.keys(schema).length}`,
          )
          
          if (Object.keys(schema).length === 0) {
            console.error(
              `[Authority] ⚠️ WARNING: Database schema is empty! Properties may not map correctly.`,
            )
            console.error(
              `[Authority]   → Full database details:`,
              JSON.stringify({
                id: dbDetails.id,
                title: dbDetails.title,
                properties: dbDetails.properties,
                parent: dbDetails.parent,
              }, null, 2),
            )
          }
        } catch (schemaError: any) {
          console.error(
            `[Authority] Failed to get schema for ${databaseName} (ID: ${databaseId}):`,
            schemaError.message,
          )
          // Continue with empty schema (will only send title)
          schema = {}
        }
      }
      
      // If schema is still empty after trying cache and API, log warning
      if (Object.keys(schema).length === 0) {
        console.warn(
          `[Authority] ⚠️ WARNING: No schema available for "${databaseName}" - only title will be sent`,
        )
      }

      // Query Supabase for items without notion_page_id
      // For notion_pages_sync, filter by database_name
      let query = supabase
        .from(tableName)
        .select("*")
        .is("notion_page_id", null)
        .eq("user_id", user.id)
      
      // For Magic Systems, Factions, Lore, and Chapters, filter by database_name
      if (tableName === "notion_pages_sync") {
        query = query.eq("database_name", databaseName)
      }
      
      const { data: items, error: queryError } = await query

      if (queryError) {
        console.error(
          `[Authority] Failed to query ${tableName}:`,
          queryError.message,
        )
        results[forgeType] = { synced: 0, errors: 0 }
        continue
      }

      if (!items || items.length === 0) {
        console.log(`[Authority] No items to sync for ${forgeType}`)
        results[forgeType] = { synced: 0, errors: 0 }
        continue
      }

      console.log(
        `[Authority] Found ${items.length} items to sync for ${forgeType}`,
      )

      let synced = 0
      let errors = 0

      // Process each item
      for (const item of items) {
        try {
          const itemName = item.name || item.title || item.id
          console.log(
            `[Authority] Processing ${forgeType} item: "${itemName}" (${item.id})`,
          )
          console.log(
            `[Authority]   → Database schema has ${Object.keys(schema).length} properties:`,
            Object.keys(schema).join(", "),
          )

          // Map Supabase row to Notion properties
          const properties: Record<string, any> = {}

          // Extract title/name based on table type
          let titleValue: string | null = null
          if (tableName === "notion_characters_sync" || tableName === "notion_worlds_sync") {
            titleValue = item.name || null
          } else if (tableName === "notion_stories_sync") {
            titleValue = item.title || null
          } else if (tableName === "notion_pages_sync") {
            titleValue = item.title || null
          }

          console.log(
            `[Authority]   → Extracted title: "${titleValue || "N/A"}"`,
          )

          // If item has a properties JSONB field, use that as the source
          const itemProperties = item.properties && typeof item.properties === 'object' ? item.properties : {}
          
          console.log(
            `[Authority]   → Item properties JSONB keys:`,
            Object.keys(itemProperties).length > 0 ? Object.keys(itemProperties).join(", ") : "none",
          )
          console.log(
            `[Authority]   → Item direct fields:`,
            Object.keys(item).filter(k => !['id', 'user_id', 'created_at', 'updated_at', 'last_synced_at', 'content_hash'].includes(k)).join(", "),
          )

          // If schema is empty, try to infer it from existing pages in the database
          if (Object.keys(schema).length === 0) {
            console.log(
              `[Authority]   → ⚠️ Schema is empty - attempting to infer from existing pages`,
            )
            
            try {
              // Try to query the database to get an existing page and infer schema
              const queryResult = await rateLimitedCall(
                () => queryNotionDatabase(notion, databaseId, {
                  page_size: 1,
                }, notionToken),
                `Infer schema for ${databaseName}`,
              )
              
              console.log(
                `[Authority]   → Query result: ${queryResult.results?.length || 0} pages found`,
              )
              
              if (queryResult.results && queryResult.results.length > 0) {
                const samplePage = queryResult.results[0] as any
                console.log(
                  `[Authority]   → Sample page has properties:`,
                  samplePage.properties ? Object.keys(samplePage.properties).length : 0,
                )
                
                if (samplePage.properties && Object.keys(samplePage.properties).length > 0) {
                  // Infer schema from sample page properties - extract just the type info
                  const inferredSchema: Record<string, any> = {}
                  Object.keys(samplePage.properties).forEach((propName) => {
                    const prop = samplePage.properties[propName]
                    inferredSchema[propName] = {
                      type: prop.type,
                      // Include type-specific info if available
                      ...(prop.type === 'select' && prop.select ? { select: { options: [] } } : {}),
                      ...(prop.type === 'multi_select' && prop.multi_select ? { multi_select: { options: [] } } : {}),
                    }
                  })
                  
                  schema = inferredSchema
                  console.log(
                    `[Authority]   → ✅ Inferred schema from existing page: ${Object.keys(schema).length} properties`,
                    Object.keys(schema).join(", "),
                  )
                  
                  // Cache the inferred schema for future use
                  await cacheSchema(user.id, databaseId, databaseName, schema)
                  console.log(
                    `[Authority]   → ✅ Cached inferred schema for "${databaseName}"`,
                  )
                } else {
                  console.warn(
                    `[Authority]   → ⚠️ Sample page has no properties - database may not be shared with integration`,
                  )
                }
              } else {
                console.warn(
                  `[Authority]   → ⚠️ Database has no pages yet - cannot infer schema. Add a page to the database or share it with your Notion integration.`,
                )
              }
            } catch (inferError: any) {
              console.error(
                `[Authority]   → ⚠️ Could not infer schema from existing pages:`,
                inferError.message,
              )
              console.error(
                `[Authority]   → Error details:`,
                inferError.code || inferError.status || "Unknown",
              )
              
              // If it's a permissions error, provide helpful guidance
              if (inferError.code === 'object_not_found' || inferError.status === 404) {
                console.error(
                  `[Authority]   → 💡 Tip: Make sure the "${databaseName}" database is shared with your Notion integration at notion.so/my-integrations`,
                )
              }
            }
          }
          
          // If schema is still empty after inference attempt, only send title property
          // This prevents validation errors from sending properties that don't exist
          if (Object.keys(schema).length === 0) {
            console.error(
              `[Authority]   → ❌ CRITICAL: Cannot read database schema. This may be a permissions issue.`,
            )
            console.error(
              `[Authority]   → → The integration may not have 'Read content' permission for this database.`,
            )
            console.error(
              `[Authority]   → → Only title property will be sent. Other properties will be skipped.`,
            )
            console.error(
              `[Authority]   → → To fix: Ensure the integration has access to the database and 'Read content' capability.`,
            )
            
            // Don't copy properties - only send title
            // Properties will be handled by the schema mapping loop below (which will skip since schema is empty)
          } else {
            // Schema is available - map properties from item to schema
            // Only send properties that exist in the schema
            console.log(
              `[Authority]   → ✅ Schema available (${Object.keys(schema).length} properties) - mapping item properties to schema`,
            )
            
            // Map item properties to schema properties
            // First, iterate through seed data properties and map them to schema properties
            // Track which schema properties have been mapped to handle merging
            const schemaPropertySources: Record<string, Array<{ seedProp: string; value: any }>> = {}
            
            for (const [seedPropName, seedValue] of Object.entries(itemProperties)) {
              if (seedValue === null || seedValue === undefined) {
                continue
              }

              // Find the matching schema property name
              const schemaPropName = findSchemaPropertyName(
                seedPropName,
                schema,
                forgeType,
              )

              if (!schemaPropName) {
                // Log available schema properties for debugging
                const availableProps = Object.keys(schema).map(name => {
                  const propType = (schema[name] as any).type
                  return `${name} (${propType})`
                }).join(", ")
                console.log(
                  `[Authority]   → ⚠️ No schema match found for seed property "${seedPropName}"`,
                )
                console.log(
                  `[Authority]   → → Available schema properties: ${availableProps || "none"}`,
                )
                continue
              }

              const propSchema = schema[schemaPropName]
              const propType = (propSchema as any).type

              // Skip system properties
              if (
                schemaPropName === "id" ||
                schemaPropName === "created_at" ||
                schemaPropName === "updated_at"
              ) {
                continue
              }

              // Skip title - it will be handled separately
              if (propType === "title") {
                continue
              }

              // Track this mapping for potential merging
              if (!schemaPropertySources[schemaPropName]) {
                schemaPropertySources[schemaPropName] = []
              }
              schemaPropertySources[schemaPropName].push({
                seedProp: seedPropName,
                value: seedValue,
              })
            }

            // Now process each schema property, handling merging for multi_select
            for (const [schemaPropName, sources] of Object.entries(schemaPropertySources)) {
              const propSchema = schema[schemaPropName]
              const propType = (propSchema as any).type

              // For multi_select, merge all values from multiple seed properties
              if (propType === "multi_select" && sources.length > 1) {
                const allValues: any[] = []
                for (const source of sources) {
                  const converted = convertPropertyToSchemaType(source.value, propType)
                  if (converted?.multi_select && Array.isArray(converted.multi_select)) {
                    allValues.push(...converted.multi_select)
                  }
                }
                // Deduplicate by name
                const uniqueValues = Array.from(
                  new Map(allValues.map((v: any) => [v.name || v, v])).values()
                )
                if (uniqueValues.length > 0) {
                  properties[schemaPropName] = { multi_select: uniqueValues }
                  console.log(
                    `[Authority]   → ✅ Merged ${sources.length} seed properties → "${schemaPropName}" (multi_select): ${uniqueValues.map((v: any) => v.name || v).join(", ")}`,
                  )
                }
              } else {
                // Single source or non-mergeable type - use first source
                const source = sources[0]
                const convertedValue = convertPropertyToSchemaType(source.value, propType)
                if (convertedValue !== null && convertedValue !== undefined) {
                  properties[schemaPropName] = convertedValue
                  console.log(
                    `[Authority]   → ✅ Mapped seed property "${source.seedProp}" → schema property "${schemaPropName}" (${propType})`,
                  )
                }
              }
            }

            // Also check for any schema properties that might have direct matches we missed
            for (const [propName, propSchema] of Object.entries(schema)) {
              const propType = (propSchema as any).type

              // Skip if already mapped
              if (properties[propName]) {
                continue
              }

              // Skip system properties
              if (
                propName === "id" ||
                propName === "created_at" ||
                propName === "updated_at"
              ) {
                continue
              }

              // Skip title - it will be handled separately
              if (propType === "title") {
                continue
              }

              // Try direct match from item properties
              const value = itemProperties[propName]
              if (value !== null && value !== undefined) {
                const convertedValue = convertPropertyToSchemaType(value, propType)
                if (convertedValue !== null && convertedValue !== undefined) {
                  properties[propName] = convertedValue
                }
              }
            }
            
            console.log(
              `[Authority]   → ✅ Mapped ${Object.keys(properties).length} properties from item to schema`,
            )
          }

          // Iterate through schema properties and map from item
          // Only do this if schema is available (not empty)
          let propertiesProcessed = 0
          let propertiesSkipped = 0
          const skippedReasons: string[] = []
          
          // Only map properties if schema is available
          // When schema is empty, we skip property mapping to avoid validation errors
          if (Object.keys(schema).length > 0) {
            for (const [propName, propSchema] of Object.entries(schema)) {
            const propType = (propSchema as any).type

            // Skip system properties
            if (propName === "id" || propName === "created_at" || propName === "updated_at") {
              continue
            }

            // Get value from item (try properties JSONB first, then direct fields)
            let value = itemProperties[propName] || item[propName] || item[propName.toLowerCase()] || item[propName.replace(/\s+/g, "_").toLowerCase()]
            
            // For title property, use extracted titleValue
            if (propType === "title" && titleValue) {
              value = titleValue
            }

            // Handle different property types
            if (value === null || value === undefined) {
              skippedReasons.push(`${propName} (${propType}): value is null/undefined`)
              propertiesSkipped++
              continue
            }
            
            const valueBeforeProcessing = JSON.stringify(value).substring(0, 100)

            switch (propType) {
              case "title":
                // Use titleValue if available, otherwise use value
                const titleToUse = titleValue || value
                if (typeof titleToUse === "string" && titleToUse.trim()) {
                  properties[propName] = {
                    title: [{ text: { content: titleToUse } }],
                  }
                }
                break

              case "rich_text":
                // Handle values that are already in Notion format
                if (value && typeof value === "object" && Array.isArray(value.rich_text)) {
                  // Normalize rich_text array - convert plain_text to text.content
                  properties[propName] = normalizeRichText(value)
                } else if (typeof value === "string") {
                  // Plain string - convert to Notion format
                  properties[propName] = {
                    rich_text: [{ text: { content: value } }],
                  }
                } else if (value && typeof value === "object" && value.plain_text) {
                  // Extract plain_text from nested structure
                  properties[propName] = {
                    rich_text: [{ text: { content: value.plain_text } }],
                  }
                }
                break

              case "number":
                if (typeof value === "number") {
                  properties[propName] = { number: value }
                } else if (typeof value === "string" && !isNaN(Number(value))) {
                  properties[propName] = { number: Number(value) }
                }
                break

              case "select":
                // Handle values that are already in Notion format
                if (value && typeof value === "object" && value.select) {
                  // Already in Notion format: {"select": {"name": "Elf"}}
                  properties[propName] = value
                } else {
                  // Handle string values or nested select objects from properties JSONB
                  let selectValue: string | null = null
                  if (typeof value === "string") {
                    selectValue = value
                  } else if (value && typeof value === "object" && value.name) {
                    selectValue = value.name
                  }
                  
                  if (selectValue) {
                    // Check if value exists in select options
                    const options = (propSchema as any).select?.options || []
                    const optionExists = options.some(
                      (opt: any) => opt.name === selectValue,
                    )
                    if (optionExists) {
                      properties[propName] = { select: { name: selectValue } }
                    } else {
                      console.log(
                        `[Authority]   → ⚠️ Select option "${selectValue}" not found in schema for "${propName}"`,
                      )
                    }
                  }
                }
                break

              case "multi_select":
                // Handle values that are already in Notion format
                if (value && typeof value === "object" && value.multi_select) {
                  // Already in Notion format: {"multi_select": [{"name": "Shadow Magic"}]}
                  properties[propName] = value
                } else {
                  // Handle both arrays and nested multi_select objects from properties JSONB
                  let multiSelectValues: string[] = []
                  if (Array.isArray(value)) {
                    // Extract names if objects, otherwise use strings directly
                    multiSelectValues = value.map((v) => 
                      typeof v === "string" ? v : (v.name || v)
                    )
                  } else if (typeof value === "string") {
                    // Try to parse as comma-separated
                    multiSelectValues = value.split(",").map((v) => v.trim())
                  }
                  
                  if (multiSelectValues.length > 0) {
                    const options = (propSchema as any).multi_select?.options || []
                    const validOptions = multiSelectValues
                      .filter((v) =>
                        options.some((opt: any) => opt.name === v),
                      )
                      .map((v) => ({ name: v }))
                    if (validOptions.length > 0) {
                      properties[propName] = { multi_select: validOptions }
                    } else {
                      console.log(
                        `[Authority]   → ⚠️ Multi-select values not found in schema for "${propName}"`,
                      )
                    }
                  }
                }
                break

              case "checkbox":
                if (typeof value === "boolean") {
                  properties[propName] = { checkbox: value }
                } else if (typeof value === "string") {
                  properties[propName] = {
                    checkbox: value.toLowerCase() === "true" || value === "1",
                  }
                }
                break

              case "date":
                if (value) {
                  const dateValue = typeof value === "string" ? new Date(value) : value
                  if (!isNaN(dateValue.getTime())) {
                    properties[propName] = {
                      date: {
                        start: dateValue.toISOString().split("T")[0],
                      },
                    }
                  }
                }
                break

              case "url":
                if (typeof value === "string" && value.startsWith("http")) {
                  properties[propName] = { url: value }
                }
                break

              case "email":
                if (typeof value === "string" && value.includes("@")) {
                  properties[propName] = { email: value }
                }
                break

              case "phone_number":
                if (typeof value === "string") {
                  properties[propName] = { phone_number: value }
                }
                break
            }
            
            // Log if property was successfully added
            if (properties[propName]) {
              propertiesProcessed++
              console.log(
                `[Authority]   → ✅ Mapped property "${propName}" (${propType})`,
              )
            } else {
              skippedReasons.push(`${propName} (${propType}): mapping failed (value: ${valueBeforeProcessing})`)
              propertiesSkipped++
            }
          }
          
            console.log(
              `[Authority]   → Property mapping summary: ${propertiesProcessed} mapped, ${propertiesSkipped} skipped`,
            )
            if (skippedReasons.length > 0 && propertiesProcessed === 0) {
              console.error(
                `[Authority]   → ⚠️ All properties were skipped! Reasons:`,
                skippedReasons.slice(0, 5).join("; "),
              )
            }
          } else {
            console.log(
              `[Authority]   → ⚠️ Schema is empty - skipping property mapping. Only title will be sent.`,
            )
          }

          // Final normalization pass: ensure all rich_text properties are in correct format
          for (const [propName, propValue] of Object.entries(properties)) {
            if (propValue && typeof propValue === 'object' && Array.isArray(propValue.rich_text)) {
              properties[propName] = normalizeRichText(propValue)
            }
          }

          // Log properties being sent
          const propertyKeys = Object.keys(properties)
          console.log(
            `[Authority]   → Properties to send to Notion (${propertyKeys.length}):`,
            propertyKeys.join(", "),
          )
          
          // Find the actual title property name from the database
          let titlePropName: string | null = null
          
          if (Object.keys(schema).length > 0) {
            // Schema is available - find title property from schema
            titlePropName = Object.keys(schema).find(
              name => (schema[name] as any).type === "title"
            ) || null
          } else {
            // Schema is empty - try to infer title property name from existing pages
            try {
              const queryResult = await rateLimitedCall(
                () => queryNotionDatabase(notion, databaseId, {
                  page_size: 1,
                }, notionToken),
                `Find title property for ${databaseName}`,
              )
              
              if (queryResult.results && queryResult.results.length > 0) {
                const samplePage = queryResult.results[0] as any
                if (samplePage.properties) {
                  // Find the title property (it's the one with type "title")
                  titlePropName = Object.keys(samplePage.properties).find(
                    (name) => samplePage.properties[name]?.type === "title"
                  ) || null
                  
                  if (titlePropName) {
                    console.log(
                      `[Authority]   → ✅ Found title property name from database: "${titlePropName}"`,
                    )
                  }
                }
              }
            } catch (titleError: any) {
              console.error(
                `[Authority]   → ⚠️ Could not find title property name:`,
                titleError.message,
              )
            }
          }
          
          // Fallback: try common title property names
          if (!titlePropName) {
            const possibleTitleNames = ["Name", "Title", "name", "title"]
            // Check schema first
            if (Object.keys(schema).length > 0) {
              titlePropName = possibleTitleNames.find(name => 
                Object.keys(schema).includes(name)
              ) || null
            }
            // Then check item properties
            if (!titlePropName && Object.keys(itemProperties).length > 0) {
              titlePropName = possibleTitleNames.find(name => 
                Object.keys(itemProperties).includes(name)
              ) || null
            }
            // Last resort: use "Name"
            if (!titlePropName) {
              titlePropName = "Name"
            }
          }
          
          const hasTitleProperty = propertyKeys.some(key => {
            const prop = properties[key]
            return prop && prop.title && Array.isArray(prop.title) && prop.title.length > 0
          })
          
          if (!hasTitleProperty && titleValue && titlePropName) {
            // Only set title property - don't overwrite existing properties
            if (!properties[titlePropName]) {
              properties[titlePropName] = {
                title: [{ text: { content: titleValue } }],
              }
              console.log(
                `[Authority]   → ✅ Added title property "${titlePropName}" with value "${titleValue}"`,
              )
            }
          } else if (!hasTitleProperty && titleValue) {
            console.error(
              `[Authority] ⚠️ WARNING: Could not determine title property name!`,
            )
          }
          
          if (propertyKeys.length === 0 && !hasTitleProperty) {
            console.error(
              `[Authority] ⚠️ ERROR: No properties to send! This will create a blank page.`,
            )
            console.error(
              `[Authority]   → Item data:`,
              JSON.stringify({
                name: item.name,
                title: item.title,
                description: item.description,
                properties: item.properties,
              }, null, 2),
            )
            console.error(
              `[Authority]   → Schema properties:`,
              JSON.stringify(
                Object.entries(schema).map(([name, schema]) => ({
                  name,
                  type: (schema as any).type,
                })),
                null,
                2,
              ),
            )
            // Don't create blank pages - skip this item
            errors++
            console.error(
              `[Authority] ❌ Skipping item ${item.id} - no properties to set`,
            )
            continue
          } else {
            // Log sample of properties being sent (first 3)
            const sampleProps = Object.entries(properties).slice(0, 3).map(([name, value]) => ({
              name,
              value: JSON.stringify(value).substring(0, 100),
            }))
            console.log(
              `[Authority]   → Sample properties:`,
              JSON.stringify(sampleProps, null, 2),
            )
          }

          // Create Notion page
          console.log(
            `[Authority]   → Creating Notion page in database ${databaseId}...`,
          )
          const notionPage = await rateLimitedCall(
            () => notion.pages.create({
              parent: { database_id: databaseId },
              properties,
            }),
            `Create page for ${titleValue || forgeType}`,
          )
          
          console.log(
            `[Authority]   → ✅ Notion page created: ${notionPage.id}`,
          )
          
          // Verify properties were set by checking the created page
          const createdPageProperties = notionPage.properties || {}
          const createdPropertyKeys = Object.keys(createdPageProperties)
          console.log(
            `[Authority]   → ✅ Page has ${createdPropertyKeys.length} properties after creation:`,
            createdPropertyKeys.join(", "),
          )
          
          // Check if title was set
          const titleProp = Object.entries(createdPageProperties).find(
            ([_, prop]: [string, any]) => prop.type === "title"
          )
          if (titleProp) {
            const titleContent = (titleProp[1] as any).title
              ?.map((t: any) => t.plain_text)
              .join("") || ""
            console.log(
              `[Authority]   → ✅ Title property set: "${titleContent}"`,
            )
          } else {
            console.error(
              `[Authority] ⚠️ WARNING: No title property found in created page!`,
            )
          }
          
          // Log all properties from created page for debugging
          console.log(
            `[Authority]   → Created page properties:`,
            JSON.stringify(
              Object.entries(createdPageProperties).map(([name, prop]: [string, any]) => ({
                name,
                type: prop.type,
                hasContent: prop.type === "title" 
                  ? (prop.title?.length > 0)
                  : prop.type === "rich_text"
                  ? (prop.rich_text?.length > 0)
                  : prop.type === "select"
                  ? (prop.select !== null)
                  : true,
              })),
              null,
              2,
            ),
          )

          // Construct Notion page URL
          const notionPageUrl = `https://notion.so/${notionPage.id.replace(/-/g, "")}`

          // Update Supabase sync table with notion_page_id
          // For notion_pages_sync (Magic Systems, Factions, Lore, Chapters), also filter by database_name to ensure correct update
          let updateQuery = supabase
            .from(tableName)
            .update({ notion_page_id: notionPage.id })
            .eq("id", item.id)
            .eq("user_id", user.id)
          
          if (tableName === "notion_pages_sync") {
            updateQuery = updateQuery.eq("database_name", databaseName)
          }
          
          await updateQuery

          // Verify the page was created successfully
          try {
            const verifyPage = await rateLimitedCall(
              () => notion.pages.retrieve({
                page_id: notionPage.id,
              }),
              `Verify page ${notionPage.id.substring(0, 8)}...`,
            )
            console.log(
              `[Authority] ✅ Verified: Page exists in Notion and is accessible`,
            )
          } catch (verifyError: any) {
            console.error(
              `[Authority] ⚠️ Warning: Created page ${notionPage.id} but verification failed:`,
              verifyError.message,
            )
          }

          // Final confirmation
          const finalPropertyCount = Object.keys(createdPageProperties).length
          const hasContent = finalPropertyCount > 0 && titleProp
          
          if (hasContent) {
            synced++
            const itemName = item.name || item.title || item.id
            console.log(
              `[Authority] ✅✅✅ SUCCESS: Synced ${forgeType} "${itemName}" to Notion`,
            )
            console.log(
              `[Authority]   → Database: ${databaseName} (${databaseId})`,
            )
            console.log(
              `[Authority]   → Notion Page ID: ${notionPage.id}`,
            )
            console.log(
              `[Authority]   → Properties set: ${finalPropertyCount}`,
            )
            console.log(
              `[Authority]   → Notion URL: ${notionPageUrl}`,
            )
            console.log(
              `[Authority]   → ✅ CONFIRMED: Page created with content - open URL to verify`,
            )
          } else {
            errors++
            console.error(
              `[Authority] ❌ FAILED: Page created but appears blank (${finalPropertyCount} properties)`,
            )
            console.error(
              `[Authority]   → Notion Page ID: ${notionPage.id}`,
            )
            console.error(
              `[Authority]   → Notion URL: ${notionPageUrl}`,
            )
          }
        } catch (itemError: any) {
          errors++
          console.error(
            `[Authority] ❌ Failed to sync ${forgeType} item ${item.id}:`,
            itemError.message,
          )
        }
      }

      results[forgeType] = { synced, errors }
    }

    const totalSynced = Object.values(results).reduce(
      (sum, r) => sum + r.synced,
      0,
    )
    const totalErrors = Object.values(results).reduce(
      (sum, r) => sum + r.errors,
      0,
    )

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced} items to Notion${totalErrors > 0 ? ` (${totalErrors} errors)` : ""}`,
      results,
      totalSynced,
      totalErrors,
    })
  } catch (error: any) {
    console.error("[Authority] Error seeding from Supabase:", error)
    return NextResponse.json(
      { error: error.message || "Failed to seed from Supabase" },
      { status: 500 },
    )
  }
}

