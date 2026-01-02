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
    <div
      className="min-h-screen flex items-center justify-center bg-black p-4"
      style={{
        backgroundImage: "url('/assets/backgrounds/authority-bg-1.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative w-full max-w-md z-10 space-y-4">
        <PasswordAuth />
        <SocialAuth />
      </div>
    </div>
  )
}
