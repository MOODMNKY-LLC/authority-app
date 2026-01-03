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
      // Ensure we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error("Cannot authenticate: not in browser environment")
      }

      // Get origin - prioritize window.location.origin as it's always available in browser
      let origin = window.location.origin
      
      // Fallback: construct from protocol and host if origin is somehow undefined
      if (!origin || origin === 'undefined' || origin === 'null') {
        origin = `${window.location.protocol}//${window.location.host}`
      }
      
      // Normalize: replace 0.0.0.0 with localhost
      if (origin.includes("0.0.0.0")) {
        origin = origin.replace("0.0.0.0", "localhost")
      }
      
      // Ensure HTTPS is used if the page is loaded over HTTPS (for dev:https)
      // This is critical - redirect_uri must match the protocol used
      if (window.location.protocol === 'https:' && origin.startsWith('http:')) {
        origin = origin.replace('http:', 'https:')
      }
      
      // Ensure we have a valid origin
      if (!origin || !origin.startsWith('http')) {
        console.error("[Authority] Invalid origin:", origin)
        // Use HTTPS for local dev if we're in HTTPS mode, otherwise HTTP
        const protocol = window.location.protocol || 'https:'
        origin = `${protocol}//localhost:3000`
      }
      
      const redirectTo = `${origin}/auth/callback`
      
      console.log("[Authority] Notion OAuth - Redirect URL:", {
        origin,
        redirectTo,
        windowOrigin: window.location.origin,
        windowProtocol: window.location.protocol,
        windowHost: window.location.host,
        environment: process.env.NODE_ENV,
      })

      // Validate redirectTo before passing to Supabase
      if (!redirectTo || redirectTo.includes('undefined')) {
        throw new Error(`Invalid redirect URL: ${redirectTo}`)
      }

      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: "notion" as any,
        options: {
          redirectTo,
          // Explicitly pass query parameters that Notion might need
          queryParams: {
            // Ensure redirect_uri is included in the OAuth request
            // Supabase will handle the actual redirect_uri to its callback,
            // but we can add custom params if needed
          },
        },
      })
      
      // Log the OAuth URL if available (for debugging)
      if (data?.url) {
        console.log("[Authority] Notion OAuth URL:", data.url)
        // Check if redirect_uri is in the URL
        const urlObj = new URL(data.url)
        const redirectUriParam = urlObj.searchParams.get('redirect_uri')
        console.log("[Authority] Redirect URI in OAuth URL:", redirectUriParam)
      }
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
