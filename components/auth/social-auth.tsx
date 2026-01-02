"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function SocialAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const handleNotionAuth = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "notion" as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-950/90 px-2 text-zinc-500">Or continue with</span>
        </div>
      </div>

      <Button
        onClick={handleNotionAuth}
        variant="outline"
        className="w-full border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 backdrop-blur-xl"
        disabled={loading}
        size="lg"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16v16H4z" />
            </svg>
            Sign in with Notion
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive" className="bg-red-950/50 border-red-900">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
