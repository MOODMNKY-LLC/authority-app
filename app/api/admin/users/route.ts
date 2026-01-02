import { createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Get all users with their auth info
    const { data: profiles, error } = await supabase
      .from("user_profiles")
      .select("id, user_id, email, display_name, avatar_url, role, created_at, updated_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[Authority] Error fetching users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get auth users for additional info
    const { data: authUsers } = await supabase.auth.admin.listUsers()

    // Merge profile data with auth data
    const users = profiles.map((profile) => {
      const authUser = authUsers?.users.find((u) => u.id === profile.user_id)
      return {
        ...profile,
        last_sign_in_at: authUser?.last_sign_in_at,
        email_confirmed_at: authUser?.email_confirmed_at,
      }
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("[Authority] Error in GET /api/admin/users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/users/[userId]/role
 * Update user role (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json({ error: "userId and role are required" }, { status: 400 })
    }

    if (!["pending", "user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role. Must be pending, user, or admin" }, { status: 400 })
    }

    // Prevent self-demotion (admins can't remove their own admin role)
    if (userId === user.id && role !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role" },
        { status: 400 },
      )
    }

    // Update user role
    const { data: updatedProfile, error: updateError } = await supabase
      .from("user_profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select()
      .single()

    if (updateError) {
      console.error("[Authority] Error updating user role:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`[Authority] ✅ User ${userId} role updated to ${role}`)

    return NextResponse.json({ user: updatedProfile })
  } catch (error: any) {
    console.error("[Authority] Error in PATCH /api/admin/users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


