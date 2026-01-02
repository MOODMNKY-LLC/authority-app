import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const type = searchParams.get("type") // 'normal' or 'project'

    let query = supabase.from("chats").select("*").order("last_message_at", { ascending: false })

    if (type === "normal") {
      // Get chats not associated with any project (include both temporary and permanent)
      query = query.is("project_id", null).eq("is_project_chat", false)
    } else if (type === "project" && projectId) {
      // Get chats for a specific project
      query = query.eq("project_id", projectId).eq("is_project_chat", true)
    } else if (projectId) {
      // Legacy: get all chats for a project
      query = query.eq("project_id", projectId)
    }

    const { data: chats, error } = await query

    if (error) throw error

    return NextResponse.json(chats || [])
  } catch (error) {
    console.error("[v0] Error fetching chats:", error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: chat, error } = await supabase
      .from("chats")
      .insert({
        project_id: body.project_id || null,
        title: body.title || "New Chat",
        is_temporary: body.is_temporary || false,
        is_project_chat: body.is_project_chat || false,
        system_prompt: body.system_prompt || null,
        model: body.model || "openai/gpt-4o-mini",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(chat)
  } catch (error) {
    console.error("[v0] Error creating chat:", error)
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id, ...updates } = body

    const { data: chat, error } = await supabase
      .from("chats")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(chat)
  } catch (error) {
    console.error("[v0] Error updating chat:", error)
    return NextResponse.json({ error: "Failed to update chat" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Chat ID required" }, { status: 400 })
    }

    const { error } = await supabase.from("chats").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting chat:", error)
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 })
  }
}
