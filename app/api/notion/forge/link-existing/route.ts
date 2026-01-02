import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { Client } from "@notionhq/client"
import { getNotionToken } from "@/lib/notion/get-token"

/**
 * Link existing Notion page to Forge content/Supabase record
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
    const { forgeType, notionPageId, supabaseRecordId } = body

    if (!forgeType || !notionPageId) {
      return NextResponse.json(
        {
          success: false,
          error: "forgeType and notionPageId are required",
        },
        { status: 400 },
      )
    }

    // Verify Notion page exists and belongs to user
    const notionToken = await getNotionToken(user.id)
    if (!notionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Notion not configured",
        },
        { status: 400 },
      )
    }

    const notion = new Client({ auth: notionToken })

    try {
      const page = await notion.pages.retrieve({ page_id: notionPageId })
      
      // Verify page is in a database (has parent.database_id)
      if (!("parent" in page) || page.parent.type !== "database_id") {
        return NextResponse.json(
          {
            success: false,
            error: "Page is not in a database",
          },
          { status: 400 },
        )
      }
    } catch (error: any) {
      if (error.code === "object_not_found") {
        return NextResponse.json(
          {
            success: false,
            error: "Notion page not found",
          },
          { status: 404 },
        )
      }
      throw error
    }

    // Update Supabase record if provided
    let supabaseId = supabaseRecordId
    if (supabaseRecordId) {
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
          return NextResponse.json(
            {
              success: false,
              error: updateError.message || "Failed to update Supabase record",
            },
            { status: 500 },
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      notion_page_id: notionPageId,
      supabase_id: supabaseId,
      message: "Successfully linked to existing Notion page",
    })
  } catch (error: any) {
    console.error("[Authority] Error linking existing Notion page:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to link Notion page",
      },
      { status: 500 },
    )
  }
}

