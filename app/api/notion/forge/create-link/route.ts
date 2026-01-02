import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"
import { getNotionToken } from "@/lib/notion/get-token"

/**
 * Create new Notion page and link to Forge content
 * Maps Forge data to Notion database properties
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

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
    const {
      forgeType,
      databaseId,
      forgeData,
      linkToSupabase = false,
      supabaseRecordId,
    } = body

    if (!forgeType || !databaseId) {
      return NextResponse.json(
        {
          success: false,
          error: "forgeType and databaseId are required",
        },
        { status: 400 },
      )
    }

    // Get Notion token
    const notionToken = await getNotionToken(user.id)
    if (!notionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not configured. Please connect your Notion workspace.",
        },
        { status: 400 },
      )
    }

    const notion = new Client({ auth: notionToken })

    // Map Forge data to Notion properties based on type
    let notionProperties: Record<string, any> = {
      "User ID": {
        rich_text: [{ text: { content: user.id } }],
      },
    }

    switch (forgeType) {
      case "character": {
        notionProperties["Character Name"] = {
          title: [{ text: { content: forgeData.characterName || "Untitled Character" } }],
        }
        if (forgeData.characterDescription) {
          notionProperties["Description"] = {
            rich_text: [{ text: { content: forgeData.characterDescription.slice(0, 2000) } }],
          }
        }
        if (forgeData.characterAge) {
          notionProperties["Age"] = {
            number: parseInt(forgeData.characterAge) || undefined,
          }
        }
        if (forgeData.characterRole) {
          notionProperties["Role"] = {
            select: { name: forgeData.characterRole },
          }
        }
        break
      }

      case "world": {
        notionProperties["World Name"] = {
          title: [{ text: { content: forgeData.worldName || "Untitled World" } }],
        }
        if (forgeData.worldConcept) {
          notionProperties["Concept/Premise"] = {
            rich_text: [{ text: { content: forgeData.worldConcept.slice(0, 2000) } }],
          }
        }
        if (forgeData.worldTechLevel) {
          notionProperties["Technology Level"] = {
            select: { name: forgeData.worldTechLevel },
          }
        }
        if (forgeData.worldTheme) {
          notionProperties["Theme"] = {
            multi_select: [{ name: forgeData.worldTheme }],
          }
        }
        break
      }

      case "storyline":
      case "story": {
        notionProperties["Story Title"] = {
          title: [{ text: { content: forgeData.storyTitle || "Untitled Story" } }],
        }
        if (forgeData.storyPremise) {
          notionProperties["Premise"] = {
            rich_text: [{ text: { content: forgeData.storyPremise.slice(0, 2000) } }],
          }
        }
        if (forgeData.storyGenre) {
          notionProperties["Genre"] = {
            select: { name: forgeData.storyGenre },
          }
        }
        if (forgeData.storyTone) {
          notionProperties["Tone"] = {
            select: { name: forgeData.storyTone },
          }
        }
        break
      }

      case "magic": {
        notionProperties["Name"] = {
          title: [{ text: { content: forgeData.magicName || "Untitled Magic System" } }],
        }
        if (forgeData.magicConcept) {
          notionProperties["Concept"] = {
            rich_text: [{ text: { content: forgeData.magicConcept.slice(0, 2000) } }],
          }
        }
        if (forgeData.magicSource) {
          notionProperties["Power Source"] = {
            select: { name: forgeData.magicSource },
          }
        }
        if (forgeData.magicCost) {
          notionProperties["Cost/Limitation"] = {
            rich_text: [{ text: { content: forgeData.magicCost.slice(0, 2000) } }],
          }
        }
        break
      }

      case "faction": {
        notionProperties["Name"] = {
          title: [{ text: { content: forgeData.factionName || "Untitled Faction" } }],
        }
        if (forgeData.factionPurpose) {
          notionProperties["Purpose"] = {
            rich_text: [{ text: { content: forgeData.factionPurpose.slice(0, 2000) } }],
          }
        }
        if (forgeData.factionType) {
          notionProperties["Type"] = {
            select: { name: forgeData.factionType },
          }
        }
        if (forgeData.factionPower) {
          notionProperties["Power Level"] = {
            select: { name: forgeData.factionPower },
          }
        }
        break
      }

      case "lore": {
        notionProperties["Name"] = {
          title: [{ text: { content: forgeData.loreName || "Untitled Lore" } }],
        }
        if (forgeData.loreOverview) {
          notionProperties["Overview"] = {
            rich_text: [{ text: { content: forgeData.loreOverview.slice(0, 2000) } }],
          }
        }
        if (forgeData.loreTimePeriod) {
          notionProperties["Time Period"] = {
            select: { name: forgeData.loreTimePeriod },
          }
        }
        if (forgeData.loreSignificance) {
          notionProperties["Significance"] = {
            rich_text: [{ text: { content: forgeData.loreSignificance.slice(0, 2000) } }],
          }
        }
        break
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported forgeType: ${forgeType}`,
          },
          { status: 400 },
        )
    }

    // Create Notion page
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: notionProperties,
    })

    const notionPageId = response.id

    // If linking to Supabase record, update it
    let supabaseId = supabaseRecordId
    if (linkToSupabase && supabaseRecordId) {
      // Update Supabase record with notion_page_id
      const tableMap: Record<string, string> = {
        character: "characters",
        world: "worlds",
        storyline: "stories",
        story: "stories",
      }

      const tableName = tableMap[forgeType]
      if (tableName) {
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ notion_page_id: notionPageId })
          .eq("id", supabaseRecordId)

        if (updateError) {
          console.error("[Authority] Error updating Supabase record:", updateError)
          // Continue even if Supabase update fails
        }
      }
    } else if (linkToSupabase && !supabaseRecordId) {
      // Create new Supabase record
      const tableMap: Record<string, string> = {
        character: "characters",
        world: "worlds",
        storyline: "stories",
        story: "stories",
      }

      const tableName = tableMap[forgeType]
      if (tableName) {
        const insertData: any = {
          notion_page_id: notionPageId,
        }

        // Map Forge data to Supabase columns
        if (forgeType === "character") {
          insertData.name = forgeData.characterName
          insertData.description = forgeData.characterDescription
          insertData.role = forgeData.characterRole
          if (forgeData.characterAge) {
            insertData.age = parseInt(forgeData.characterAge)
          }
        } else if (forgeType === "world") {
          insertData.name = forgeData.worldName
          insertData.description = forgeData.worldConcept
        } else if (forgeType === "storyline" || forgeType === "story") {
          insertData.title = forgeData.storyTitle
          insertData.description = forgeData.storyPremise
          insertData.genre = forgeData.storyGenre
        }

        const { data: newRecord, error: insertError } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single()

        if (insertError) {
          console.error("[Authority] Error creating Supabase record:", insertError)
        } else {
          supabaseId = newRecord.id
        }
      }
    }

    return NextResponse.json({
      success: true,
      notion_page_id: notionPageId,
      notion_database_id: databaseId,
      supabase_id: supabaseId,
      message: "Notion page created and linked successfully",
    })
  } catch (error: any) {
    console.error("[Authority] Error creating Notion link:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create Notion page",
      },
      { status: 500 },
    )
  }
}

