import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(projects || [])
  } catch (error) {
    console.error("[v0] Error fetching projects:", error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        name: body.name || "New Project",
        description: body.description || "",
        icon: body.icon || "📝",
        color: body.color || "#DC2626",
        custom_instructions: body.custom_instructions || "",
        system_prompt: body.system_prompt || "You are Authority (nickname: \"Authy\"), an AI-assisted world building system. Authority uses \"it\" or \"she\" pronouns.",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(project)
  } catch (error) {
    console.error("[v0] Error creating project:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body

    const { data: project, error } = await supabase
      .from("projects")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(project)
  } catch (error) {
    console.error("[v0] Error updating project:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 })
    }

    const { error } = await supabase.from("projects").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting project:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
