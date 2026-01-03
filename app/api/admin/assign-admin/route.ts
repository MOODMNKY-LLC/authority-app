import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * API endpoint to manually assign admin role to current user
 * Useful for debugging and fixing admin access issues
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

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!existingProfile) {
      // Create profile with admin role
      const { data: newProfile, error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: user.id,
          email: user.email || "",
          display_name: user.email?.split("@")[0] || "User",
          role: "admin",
        })
        .select()
        .single()

      if (insertError) {
        console.error("[Authority] Error creating admin profile:", insertError)
        return NextResponse.json(
          {
            success: false,
            error: insertError.message || "Failed to create profile",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Admin profile created",
        profile: newProfile,
      })
    }

    // Update existing profile to admin
    const { data: updatedProfile, error: updateError } = await supabase
      .from("user_profiles")
      .update({ role: "admin" })
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("[Authority] Error updating admin role:", updateError)
      return NextResponse.json(
        {
          success: false,
          error: updateError.message || "Failed to update role",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Admin role assigned",
      profile: updatedProfile,
    })
  } catch (error: any) {
    console.error("[Authority] Error in assign-admin endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to assign admin role",
      },
      { status: 500 },
    )
  }
}



