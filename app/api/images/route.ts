import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    let query = supabase.from("generated_images").select("*").order("created_at", { ascending: false })

    if (projectId) {
      query = query.eq("project_id", projectId)
    }

    const { data: images, error } = await query

    if (error) throw error

    return NextResponse.json(images || [])
  } catch (error) {
    console.error("[v0] Error fetching images:", error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: image, error } = await supabase
      .from("generated_images")
      .insert({
        project_id: body.project_id,
        chat_id: body.chat_id,
        prompt: body.prompt,
        url: body.url,
        model: body.model,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(image)
  } catch (error) {
    console.error("[v0] Error saving image:", error)
    return NextResponse.json({ error: "Failed to save image" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Image ID required" }, { status: 400 })
    }

    const { error } = await supabase.from("generated_images").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting image:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}
