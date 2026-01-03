import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"

const FORGE_TO_DATABASE_MAP: Record<string, string> = {
  character: "Characters",
  world: "Worlds",
  storyline: "Stories",
  story: "Stories",
  magic: "Magic Systems",
  faction: "Factions & Organizations",
  lore: "Lore & History",
}

/**
 * Save/update a Forge item with all properties to Notion
 * Dynamically maps form data to Notion property format
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { forgeType, formData, databaseId, notionPageId } = body

    if (!forgeType || !formData || !databaseId) {
      return NextResponse.json(
        {
          success: false,
          error: "forgeType, formData, and databaseId are required",
        },
        { status: 400 },
      )
    }

    const databaseName = FORGE_TO_DATABASE_MAP[forgeType]
    if (!databaseName) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown forgeType: ${forgeType}`,
        },
        { status: 400 },
      )
    }

    // Get user's Notion settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("notion_access_token, notion_token, notion_databases")
      .eq("user_id", user.id)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not connected",
        },
        { status: 200 },
      )
    }

    const notionToken = settings.notion_access_token || settings.notion_token
    if (!notionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion token not found",
        },
        { status: 200 },
      )
    }

    // Get database schema to map properties correctly
    const notion = new Client({
      auth: notionToken,
    })

    let database
    try {
      database = await notion.databases.retrieve({
        database_id: databaseId,
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to retrieve database: ${error.message}`,
        },
        { status: 200 },
      )
    }

    // Map form data to Notion property format
    const notionProperties: Record<string, any> = {}

    Object.entries(formData).forEach(([propertyName, value]) => {
      if (value === null || value === undefined || value === "") {
        return // Skip empty values
      }

      const property = database.properties[propertyName]
      if (!property) {
        return // Skip properties that don't exist in schema
      }

      switch (property.type) {
        case "title":
          notionProperties[propertyName] = {
            title: [{ text: { content: String(value) } }],
          }
          break

        case "rich_text":
          notionProperties[propertyName] = {
            rich_text: [{ text: { content: String(value) } }],
          }
          break

        case "number":
          notionProperties[propertyName] = {
            number: parseFloat(String(value)) || null,
          }
          break

        case "select":
          notionProperties[propertyName] = {
            select: { name: String(value) },
          }
          break

        case "multi_select":
          if (Array.isArray(value) && value.length > 0) {
            notionProperties[propertyName] = {
              multi_select: value.map((v: string) => ({ name: v })),
            }
          }
          break

        case "date":
          if (typeof value === "object" && value.start) {
            notionProperties[propertyName] = {
              date: {
                start: value.start,
                end: value.end || null,
              },
            }
          } else if (typeof value === "string") {
            notionProperties[propertyName] = {
              date: { start: value },
            }
          }
          break

        case "checkbox":
          notionProperties[propertyName] = {
            checkbox: Boolean(value),
          }
          break

        case "url":
          notionProperties[propertyName] = {
            url: String(value),
          }
          break

        case "email":
          notionProperties[propertyName] = {
            email: String(value),
          }
          break

        case "phone_number":
          notionProperties[propertyName] = {
            phone_number: String(value),
          }
          break

        default:
          // Fallback to rich_text for unknown types
          notionProperties[propertyName] = {
            rich_text: [{ text: { content: String(value) } }],
          }
      }
    })

    try {
      let pageId: string

      if (notionPageId) {
        // Update existing page
        await notion.pages.update({
          page_id: notionPageId,
          properties: notionProperties,
        })
        pageId = notionPageId
      } else {
        // Create new page
        const response = await notion.pages.create({
          parent: {
            database_id: databaseId,
          },
          properties: notionProperties,
        })
        pageId = response.id
      }

      return NextResponse.json({
        success: true,
        notion_page_id: pageId,
        databaseId,
        databaseName,
        forgeType,
        message: notionPageId ? "Item updated successfully" : "Item created successfully",
      })
    } catch (notionError: any) {
      console.error("[Authority] Error saving to Notion:", notionError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to save to Notion: ${notionError.message}`,
        },
        { status: 200 },
      )
    }
  } catch (error: any) {
    console.error("[Authority] Error in save-item:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save item",
      },
      { status: 500 },
    )
  }
}



