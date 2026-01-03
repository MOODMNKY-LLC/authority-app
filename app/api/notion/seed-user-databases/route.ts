import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

// Seed data for each Forge type
const SEED_DATA = {
  character: [
    {
      name: "Aria Shadowweaver",
      description: "A mysterious rogue with a hidden past, skilled in shadow magic",
      role: "Protagonist",
      age: 28,
      background: "Orphaned at a young age, raised by thieves",
      motivation: "Seek revenge against those who destroyed her family",
      arc: "Redemption",
    },
    {
      name: "Thorin Ironforge",
      description: "A stoic dwarf warrior with a heart of gold",
      role: "Companion",
      age: 145,
      background: "Noble dwarf clan member",
      motivation: "Protect his people and honor",
      arc: "Growth",
    },
  ],
  world: [
    {
      name: "Eldoria",
      description: "A vast continent with diverse climates and cultures",
      geography: "Mountain ranges in the north, forests in the center, deserts in the south",
      climate: "Temperate",
      cultures: ["Human kingdoms", "Elven enclaves", "Dwarven holds"],
      history: "Ancient empire fell 1000 years ago, leaving scattered kingdoms",
    },
    {
      name: "The Shadowlands",
      description: "A dark realm corrupted by ancient magic",
      geography: "Twisted landscapes, perpetual twilight",
      climate: "Cold and dark",
      cultures: ["Cultists", "Dark creatures"],
      history: "Created by a failed ritual 500 years ago",
    },
  ],
  story: [
    {
      title: "The Shadow's Redemption",
      description: "Aria must confront her past to save Eldoria",
      genre: "Fantasy",
      status: "In Progress",
      theme: "Redemption and forgiveness",
    },
    {
      title: "The Iron Forge Chronicles",
      description: "Thorin's journey to unite the dwarf clans",
      genre: "Epic Fantasy",
      status: "Planning",
      theme: "Unity and honor",
    },
  ],
  magic_system: [
    {
      name: "Shadow Weaving",
      description: "Manipulation of shadows and darkness",
      source: "Innate magical ability",
      limitations: "Requires darkness or shadows to function",
      cost: "Mental exhaustion",
    },
    {
      name: "Elemental Mastery",
      description: "Control over fire, water, earth, and air",
      source: "Connection to natural elements",
      limitations: "Requires training and focus",
      cost: "Physical stamina",
    },
  ],
  faction: [
    {
      name: "The Shadow Guild",
      description: "Secretive organization of rogues and assassins",
      type: "Criminal Organization",
      alignment: "Neutral",
      goals: "Maintain balance through selective intervention",
    },
    {
      name: "The Iron Guard",
      description: "Elite dwarven warriors",
      type: "Military Order",
      alignment: "Lawful Good",
      goals: "Protect dwarf holds and honor",
    },
  ],
  lore: [
    {
      title: "The Fall of the Ancient Empire",
      description: "The great empire that once ruled Eldoria collapsed due to internal strife",
      category: "History",
      significance: "Shaped the current political landscape",
    },
    {
      title: "The First Shadow Weavers",
      description: "Legendary figures who first discovered shadow magic",
      category: "Legend",
      significance: "Foundation of shadow magic tradition",
    },
  ],
}

// Map Forge types to Notion database names (must match REQUIRED_DATABASES)
const FORGE_TO_DATABASE_MAP: Record<string, string> = {
  character: "Characters",
  world: "Worlds",
  story: "Stories",
  magic_system: "Magic Systems",
  faction: "Factions & Organizations",
  lore: "Lore & History",
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

    // Check if user has already been seeded
    const { data: settings } = await supabase
      .from("user_settings")
      .select("seeded_at, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (settings?.seeded_at) {
      return NextResponse.json(
        {
          message: "User databases have already been seeded",
          seeded_at: settings.seeded_at,
        },
        { status: 200 }
      )
    }

    // Get Notion token (prioritize OAuth token)
    const notionToken = settings?.notion_access_token || settings?.notion_token
    if (!notionToken) {
      return NextResponse.json(
        { error: "Notion token not found. Please connect Notion first." },
        { status: 400 }
      )
    }

    // Get database IDs
    const notionDatabases = settings?.notion_databases
    if (!notionDatabases || typeof notionDatabases !== "object") {
      return NextResponse.json(
        { error: "Notion databases not found. Please sync databases first." },
        { status: 400 }
      )
    }

    const notion = new Client({ auth: notionToken })
    const seededCounts: Record<string, number> = {}

    // Seed each database
    for (const [forgeType, databaseName] of Object.entries(FORGE_TO_DATABASE_MAP)) {
      const databaseId = notionDatabases[databaseName as keyof typeof notionDatabases]
      if (!databaseId || typeof databaseId !== "string") {
        console.warn(`[Seed] Database ${databaseName} not found for user ${user.id}`)
        continue
      }

      const seedItems = SEED_DATA[forgeType as keyof typeof SEED_DATA]
      if (!seedItems || !Array.isArray(seedItems)) {
        console.warn(`[Seed] No seed data found for ${forgeType}`)
        continue
      }

      try {
        // Get database schema to map properties correctly
        const database = await notion.databases.retrieve({ database_id: databaseId })
        const properties = database.properties

        // Create pages for each seed item
        let created = 0
        for (const item of seedItems) {
          try {
            // Map seed item properties to Notion API format
            const notionProperties: Record<string, any> = {}

            // Handle title property (usually "Name" or "Title")
            const titleProp = Object.keys(properties).find(
              (key) => properties[key].type === "title"
            )
            if (titleProp) {
              const titleValue = item.Name || item.Title || item.name || item.title
              if (titleValue) {
                notionProperties[titleProp] = {
                  title: [{ text: { content: String(titleValue) } }],
                }
              }
            }

            // Map other properties based on their types
            for (const [key, value] of Object.entries(item)) {
              // Skip title/name properties (already handled) and null/undefined values
              if (key === "Name" || key === "Title" || key === "name" || key === "title") continue
              if (value === null || value === undefined || value === "") continue

              // Try to find property by exact name first, then case-insensitive
              let prop = properties[key]
              if (!prop) {
                // Try case-insensitive match
                const propKey = Object.keys(properties).find(
                  (p) => p.toLowerCase() === key.toLowerCase()
                )
                if (propKey) prop = properties[propKey]
              }

              if (!prop) {
                console.warn(`[Seed] Property "${key}" not found in database schema for ${databaseName}`)
                continue
              }

              switch (prop.type) {
                case "rich_text":
                  notionProperties[prop.id || key] = {
                    rich_text: [{ text: { content: String(value) } }],
                  }
                  break
                case "select":
                  if (prop.select?.options) {
                    // Try to find matching option (case-insensitive)
                    const option = prop.select.options.find(
                      (opt: any) => opt.name.toLowerCase() === String(value).toLowerCase()
                    )
                    if (option) {
                      notionProperties[prop.id || key] = { select: { name: option.name } }
                    } else {
                      // Option doesn't exist, skip or create if possible
                      console.warn(`[Seed] Select option "${value}" not found for property "${key}" in ${databaseName}`)
                    }
                  }
                  break
                case "multi_select":
                  if (Array.isArray(value) && value.length > 0 && prop.multi_select?.options) {
                    const selectedOptions = value
                      .map((v: string) => {
                        const option = prop.multi_select.options.find(
                          (opt: any) => opt.name.toLowerCase() === String(v).toLowerCase()
                        )
                        return option ? option.name : null
                      })
                      .filter((v: string | null) => v !== null)
                    if (selectedOptions.length > 0) {
                      notionProperties[prop.id || key] = {
                        multi_select: selectedOptions.map((name: string) => ({ name })),
                      }
                    }
                  }
                  break
                case "number":
                  if (typeof value === "number") {
                    notionProperties[prop.id || key] = { number: value }
                  } else if (!isNaN(Number(value))) {
                    notionProperties[prop.id || key] = { number: Number(value) }
                  }
                  break
                case "checkbox":
                  notionProperties[prop.id || key] = { checkbox: Boolean(value) }
                  break
                case "date":
                  if (value instanceof Date) {
                    notionProperties[prop.id || key] = { date: { start: value.toISOString() } }
                  } else if (typeof value === "string") {
                    // Try to parse date string
                    const dateValue = new Date(value)
                    if (!isNaN(dateValue.getTime())) {
                      notionProperties[prop.id || key] = { date: { start: dateValue.toISOString() } }
                    }
                  }
                  break
                default:
                  // Fallback to rich_text for unknown types
                  notionProperties[prop.id || key] = {
                    rich_text: [{ text: { content: String(value) } }],
                  }
              }
            }

            await notion.pages.create({
              parent: { database_id: databaseId },
              properties: notionProperties,
            })

            created++
          } catch (error: any) {
            console.error(`[Seed] Error creating item in ${databaseName}:`, error.message)
            // Continue with next item
          }
        }

        seededCounts[databaseName] = created
        console.log(`[Seed] Created ${created} items in ${databaseName}`)
      } catch (error: any) {
        console.error(`[Seed] Error seeding ${databaseName}:`, error.message)
        seededCounts[databaseName] = 0
      }
    }

    // Update seeded_at timestamp
    await supabase
      .from("user_settings")
      .update({ seeded_at: new Date().toISOString() })
      .eq("user_id", user.id)

    return NextResponse.json({
      message: "User databases seeded successfully",
      seeded_at: new Date().toISOString(),
      counts: seededCounts,
    })
  } catch (error: any) {
    console.error("[Seed] Error:", error)
    return NextResponse.json(
      { error: "Failed to seed user databases", details: error.message },
      { status: 500 }
    )
  }
}

