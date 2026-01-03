import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * Fetch Image Gallery data from Notion sync table
 * Combines both Supabase generated_images and Notion Image Gallery
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const source = searchParams.get("source") // "notion", "supabase", or "all"

    const results: any[] = []

    // Fetch from Notion Image Gallery sync table
    if (!source || source === "notion" || source === "all") {
      const { data: notionImages, error: notionError } = await supabase
        .from("notion_pages_sync")
        .select("*")
        .eq("user_id", user.id)
        .eq("database_name", "Image Gallery")
        .order("updated_at", { ascending: false })

      if (notionError) {
        console.error("[Authority] Error fetching Notion images:", notionError)
      } else if (notionImages) {
        // Extract image data from properties
        const processedNotionImages = notionImages.map((page) => {
          const props = page.properties || {}
          
          // Extract image URL from properties (could be in Image File or Image URL property)
          let imageUrl = null
          if (props["Image URL"]?.url) {
            imageUrl = props["Image URL"].url
          } else if (props["Image File"]?.files?.[0]?.file?.url) {
            imageUrl = props["Image File"].files[0].file.url
          } else if (props["Image"]?.files?.[0]?.file?.url) {
            imageUrl = props["Image"].files[0].file.url
          }

          return {
            id: page.id,
            notion_page_id: page.notion_page_id,
            notion_database_id: page.notion_database_id,
            source: "notion",
            title: page.title || props["Name"] || props["Title"] || "Untitled Image",
            description: props["Description"] || props["Description"]?.rich_text?.[0]?.plain_text || "",
            prompt: props["Prompt"] || props["Prompt"]?.rich_text?.[0]?.plain_text || "",
            url: imageUrl,
            tags: props["Tags"]?.multi_select || props["Tags"] || [],
            model: props["Model"] || props["Model"]?.select?.name || "",
            created_at: page.created_at,
            updated_at: page.updated_at,
            last_synced_at: page.last_synced_at,
            properties: props,
          }
        }).filter((img) => img.url) // Only include images with URLs

        results.push(...processedNotionImages)
      }
    }

    // Fetch from Supabase generated_images table
    if (!source || source === "supabase" || source === "all") {
      let query = supabase
        .from("generated_images")
        .select("*")
        .order("created_at", { ascending: false })

      if (projectId) {
        query = query.eq("project_id", projectId)
      }

      const { data: supabaseImages, error: supabaseError } = await query

      if (supabaseError) {
        console.error("[Authority] Error fetching Supabase images:", supabaseError)
      } else if (supabaseImages) {
        const processedSupabaseImages = supabaseImages.map((img) => ({
          id: img.id,
          source: "supabase",
          title: img.prompt || "Generated Image",
          description: "",
          prompt: img.prompt,
          url: img.url,
          tags: [],
          model: img.model || "",
          project_id: img.project_id,
          chat_id: img.chat_id,
          created_at: img.created_at,
          updated_at: img.created_at,
        }))

        results.push(...processedSupabaseImages)
      }
    }

    // Sort by created_at descending
    results.sort((a, b) => {
      const dateA = new Date(a.created_at || a.updated_at).getTime()
      const dateB = new Date(b.created_at || b.updated_at).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      images: results,
      count: results.length,
      sources: {
        notion: results.filter((img) => img.source === "notion").length,
        supabase: results.filter((img) => img.source === "supabase").length,
      },
    })
  } catch (error: any) {
    console.error("[Authority] Error fetching image gallery:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch image gallery",
      },
      { status: 500 },
    )
  }
}



