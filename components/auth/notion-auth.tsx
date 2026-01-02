"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, ChevronDown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PasswordAuth } from "./password-auth"

export function NotionAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const supabase = createBrowserClient()

  const handleNotionAuth = async () => {
    setLoading(true)
    setError(null)

    try {
      // Use environment variable if available (for production consistency)
      // Otherwise normalize window.location.origin (replace 0.0.0.0 with localhost)
      // In production, NEXT_PUBLIC_SITE_URL should be set in Vercel environment variables
      let origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin
      if (origin.includes("0.0.0.0")) {
        origin = origin.replace("0.0.0.0", "localhost")
      }
      
      // Ensure HTTPS in production
      if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
        origin = origin.replace(/^http:/, "https:")
      }
      
      console.log("[Authority] Notion OAuth - Redirect URL:", {
        origin,
        redirectTo: `${origin}/auth/callback`,
        environment: process.env.NODE_ENV,
        hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      })

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "notion" as any,
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <Card className="w-full border-red-900/30 bg-zinc-950/90 backdrop-blur-xl shadow-2xl">
      <CardHeader className="space-y-3 pb-8">
        <div className="flex flex-col items-center justify-center mb-2 gap-4">
          <div className="relative h-20 w-20">
            <Image
              src="/assets/icons/authority-icon_no_background_upscaled.png"
              alt="Authority"
              width={80}
              height={80}
              className="object-contain drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              priority
              unoptimized={false}
              onError={(e) => {
                // Fallback to SVG if PNG fails
                const target = e.target as HTMLImageElement
                if (!target.src.includes('.svg')) {
                  target.src = '/assets/icons/authority-icon_no_background_upscaled.svg'
                }
              }}
            />
            <div className="absolute inset-0 bg-red-600/20 blur-2xl rounded-full -z-10" />
          </div>
          <div className="text-5xl font-black bg-gradient-to-r from-red-500 via-red-600 to-red-500 bg-clip-text text-transparent tracking-tight">
            AUTHORITY
          </div>
        </div>
        <CardTitle className="text-2xl text-center text-white font-semibold">Welcome to Authority</CardTitle>
        <CardDescription className="text-center text-zinc-400">AI-Assisted World Building System</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Button
            onClick={handleNotionAuth}
            className="w-full bg-transparent hover:bg-white/10 border-2 border-white/20 hover:border-white/40 text-white font-semibold shadow-lg transition-all h-14 text-lg group backdrop-blur-sm"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <img
                  src="/notion-logo.svg"
                  alt="Notion"
                  className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform"
                />
                Continue with Notion
              </>
            )}
          </Button>

          <p className="text-xs text-center text-zinc-500 leading-relaxed px-4">
            Connect your Notion workspace to sync all your creative work
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-950/50 border-red-900">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-zinc-950 px-4 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                >
                  <span className="text-xs uppercase">Advanced Options</span>
                  <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="space-y-4">
            <PasswordAuth compact />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2 pt-2">
        <p className="text-xs text-center text-zinc-500 leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </CardFooter>
    </Card>
  )
}
