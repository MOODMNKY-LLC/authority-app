import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getNotionPageBlocksFDW } from "@/lib/notion/fdw-helpers"

/**
 * Extract Notion page content for RAG (Retrieval Augmented Generation)
 * Uses FDW to get all blocks from a page, perfect for creating vector embeddings
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
    const { page_id, extract_type = "full" } = body

    if (!page_id) {
      return NextResponse.json(
        {
          success: false,
          error: "page_id required",
        },
        { status: 400 },
      )
    }

    // Get blocks via FDW
    const result = await getNotionPageBlocksFDW(user.id, page_id)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.error?.includes("FDW not available")
            ? "FDW requires wrappers extension. Use sync tables or Notion API as fallback."
            : "Failed to extract content",
        },
        { status: 500 },
      )
    }

    const blocks = result.blocks || []

    // Extract content based on type
    let extractedContent: string = ""
    let metadata: any = {}

    if (extract_type === "full") {
      // Extract all text content
      extractedContent = blocks
        .map((block) => {
          // Try to get plain text from various block types
          if (block.content) {
            return block.content
          }
          // Fallback: extract from attrs
          if (block.attrs?.plain_text) {
            return block.attrs.plain_text
          }
          if (block.type === "paragraph" && block.attrs?.paragraph?.rich_text) {
            return block.attrs.paragraph.rich_text
              .map((t: any) => t.plain_text)
              .join("")
          }
          if (block.type === "heading_1" && block.attrs?.heading_1?.rich_text) {
            return block.attrs.heading_1.rich_text.map((t: any) => t.plain_text).join("")
          }
          if (block.type === "heading_2" && block.attrs?.heading_2?.rich_text) {
            return block.attrs.heading_2.rich_text.map((t: any) => t.plain_text).join("")
          }
          if (block.type === "heading_3" && block.attrs?.heading_3?.rich_text) {
            return block.attrs.heading_3.rich_text.map((t: any) => t.plain_text).join("")
          }
          return ""
        })
        .filter((text) => text.trim().length > 0)
        .join("\n\n")
    } else if (extract_type === "structured") {
      // Extract structured content with block types
      extractedContent = JSON.stringify(
        blocks.map((block) => ({
          type: block.type,
          content: block.content || block.attrs?.plain_text || "",
          id: block.id,
        })),
        null,
        2,
      )
    }

    // Extract metadata
    metadata = {
      total_blocks: blocks.length,
      block_types: [...new Set(blocks.map((b) => b.type))],
      page_id: page_id,
      extracted_at: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      content: extractedContent,
      metadata,
      blocks_count: blocks.length,
      source: "fdw",
    })
  } catch (error: any) {
    console.error("[Authority] Error extracting Notion content:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to extract content",
      },
      { status: 500 },
    )
  }
}




