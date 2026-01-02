import { NotionAuth } from "@/components/auth/notion-auth"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function LoginPage() {
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
        backgroundImage: "url('/assets/backgrounds/authority-bg-2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative w-full max-w-md z-10">
        <NotionAuth />
      </div>
    </div>
  )
}
