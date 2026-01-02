"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, Mail, Lock, CheckCircle2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function PasswordAuth({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login")
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (activeTab === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setMessage("Check your email for the confirmation link!")
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push("/")
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleAuth()
    }
  }

  return (
    <div className={`space-y-4 ${compact ? "" : "w-full max-w-md"}`}>
      {!compact && (
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="relative h-12 w-12">
              <Image
                src="/assets/icons/authority-icon_no_background_upscaled.png"
                alt="Authority"
                width={48}
                height={48}
                className="object-contain opacity-80"
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
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">Email & Password</h3>
          </div>
          <p className="text-sm text-zinc-500">Traditional authentication method</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="login" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Login
          </TabsTrigger>
          <TabsTrigger value="signup" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Sign Up
          </TabsTrigger>
        </TabsList>

        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-200 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:ring-red-600"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-200 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-red-600 focus:ring-red-600"
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleAuth}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg transition-all"
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : activeTab === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </div>
      </Tabs>

      {error && (
        <Alert variant="destructive" className="bg-red-950/50 border-red-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert className="bg-green-950/50 border-green-900 text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
