import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ profile: null })
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) throw error

    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: user.id,
          email: user.email || "",
          display_name: user.email?.split("@")[0] || "User",
          avatar_url: null,
          bio: null,
        })
        .select()
        .single()

      if (insertError) {
        console.error("[v0] Error creating default profile:", insertError)
        return NextResponse.json({ profile: null })
      }

      return NextResponse.json({ profile: newProfile })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("[v0] Error fetching user profile:", error)
    return NextResponse.json({ profile: null })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const body = await request.json()

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: body.user_id,
        email: body.email,
        display_name: body.display_name,
        avatar_url: body.avatar_url,
        bio: body.bio,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("[v0] Error updating user profile:", error)
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 })
  }
}
