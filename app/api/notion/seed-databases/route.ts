import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * API endpoint to seed Forge databases with sample data
 * Available to all authenticated users (not just admins)
 * This verifies connectivity between Supabase and Notion
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

    // Call the seed function - try UUID wrapper first, fallback to TEXT version
    let data, error
    try {
      // Try UUID wrapper function (handles type conversion automatically)
      const result = await supabase.rpc("seed_forge_data_uuid", {
        target_user_id: user.id, // Pass UUID directly
      })
      data = result.data
      error = result.error
    } catch (uuidError: any) {
      // If UUID wrapper doesn't exist, try TEXT version
      console.log("[Authority] UUID wrapper not available, using TEXT version...")
      const result = await supabase.rpc("seed_forge_data", {
        target_user_id: String(user.id),
      })
      data = result.data
      error = result.error
    }

    if (error) {
      console.error("[Authority] Error seeding data:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to seed data",
          details: error,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Seed data created successfully",
      counts: data || {},
    })
  } catch (error: any) {
    console.error("[Authority] Error in seed-databases endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to seed data",
      },
      { status: 500 },
    )
  }
}

/**
 * GET endpoint to check if user already has seed data
 */
export async function GET(request: NextRequest) {
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

    // Check for existing data in each table
    const [characters, worlds, stories, magic, factions, lore] = await Promise.all([
      supabase
        .from("notion_characters_sync")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("notion_worlds_sync")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("notion_stories_sync")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("notion_pages_sync")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("database_name", "Magic Systems"),
      supabase
        .from("notion_pages_sync")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("database_name", "Factions & Organizations"),
      supabase
        .from("notion_pages_sync")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("database_name", "Lore & History"),
    ])

    return NextResponse.json({
      success: true,
      hasData: {
        characters: (characters.count || 0) > 0,
        worlds: (worlds.count || 0) > 0,
        stories: (stories.count || 0) > 0,
        magic: (magic.count || 0) > 0,
        factions: (factions.count || 0) > 0,
        lore: (lore.count || 0) > 0,
      },
      counts: {
        characters: characters.count || 0,
        worlds: worlds.count || 0,
        stories: stories.count || 0,
        magic: magic.count || 0,
        factions: factions.count || 0,
        lore: lore.count || 0,
      },
    })
  } catch (error: any) {
    console.error("[Authority] Error checking seed data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check seed data",
      },
      { status: 500 },
    )
  }
}

