import { PasswordAuth } from "@/components/auth/password-auth"
import { SocialAuth } from "@/components/auth/social-auth"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function SignUpPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 p-4">
      <div className="w-full max-w-md space-y-4">
        <PasswordAuth />
        <SocialAuth />
      </div>
    </div>
  )
}
