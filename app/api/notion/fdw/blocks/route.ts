import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * Get Notion page blocks via FDW for RAG content extraction
 * This uses the Foreign Data Wrapper to query Notion directly
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
    const { page_id } = body

    if (!page_id) {
      return NextResponse.json(
        {
          success: false,
          error: "page_id required",
        },
        { status: 400 },
      )
    }

    // Query blocks via FDW
    const { data: blocks, error } = await supabase.rpc("get_notion_page_blocks_fdw", {
      p_user_id: user.id,
      p_page_id: page_id,
    })

    if (error) {
      console.error("[Authority] Error querying blocks via FDW:", error)
      
      // If FDW not available, provide helpful error message
      if (error.message?.includes("does not exist") || error.message?.includes("wrappers")) {
        return NextResponse.json(
          {
            success: false,
            error: "FDW not available",
            message: "Notion FDW requires wrappers extension. Please ensure it's enabled in your Supabase project.",
            fallback: "You can use sync tables or direct Notion API instead.",
          },
          { status: 503 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to query blocks",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      blocks: blocks || [],
      count: blocks?.length || 0,
      source: "fdw",
    })
  } catch (error: any) {
    console.error("[Authority] Error in FDW blocks endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get blocks",
      },
      { status: 500 },
    )
  }
}




