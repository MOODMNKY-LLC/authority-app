import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * Get Notion page data via FDW for fresh on-demand queries
 * This bypasses sync tables to get absolutely fresh data
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

    // Query page via FDW
    const { data: pageData, error } = await supabase.rpc("query_notion_page_fdw", {
      p_user_id: user.id,
      p_page_id: page_id,
    })

    if (error) {
      console.error("[Authority] Error querying page via FDW:", error)
      
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
          error: error.message || "Failed to query page",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      page: pageData,
      source: "fdw",
    })
  } catch (error: any) {
    console.error("[Authority] Error in FDW page endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get page",
      },
      { status: 500 },
    )
  }
}




