"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Link as LinkIcon, Loader2, Check, ExternalLink, Info, HelpCircle, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

// Hardcoded Discord bot client ID (from .env)
// Use DISCORD_APPLICATION_ID if NEXT_PUBLIC_DISCORD_CLIENT_ID is not set
// Also check DISCORD_CLIENT_ID as fallback
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID || ""
// Discord bot permissions: SEND_MESSAGES (2048) + MANAGE_WEBHOOKS (536870912) + READ_MESSAGES (1024)
const DISCORD_PERMISSIONS = "536875024" // Combined permissions for bot functionality
// Scopes: bot (required) + applications.commands (for slash commands, optional but recommended)
const DISCORD_SCOPES = "bot%20applications.commands"
const DISCORD_BOT_INVITE_URL = DISCORD_CLIENT_ID
  ? `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${DISCORD_PERMISSIONS}&scope=${DISCORD_SCOPES}`
  : null

export function DiscordSection() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/integrations/discord")
      if (response.ok) {
        const data = await response.json()
        // Webhook URL is encrypted, show masked if exists
        setWebhookUrl(data.webhookUrl ? "••••••••" : "")
        setVerified(data.verified || false)
      }
    } catch (error) {
      console.error("Failed to load Discord settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    const isMaskedUrl = webhookUrl === "••••••••"
    
    if (!webhookUrl && !isMaskedUrl) {
      toast({
        title: "Webhook URL Required",
        description: "Please enter your Discord webhook URL first.",
        variant: "destructive",
      })
      return
    }

    setVerifying(true)
    try {
      // If URL is masked (saved), send empty body to use saved URL; otherwise send the new URL
      const response = await fetch("/api/integrations/discord/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isMaskedUrl ? {} : { webhookUrl }),
      })

      const data = await response.json()

      if (data.verified) {
        setVerified(true)
        toast({
          title: "Webhook Verified",
          description: data.message || "Discord webhook verified successfully. Check your Discord channel for the test message.",
        })
        await loadSettings() // Reload to get updated status
      } else {
        setVerified(false)
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid webhook URL",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify webhook URL",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = async () => {
    const isMaskedUrl = webhookUrl === "••••••••"
    
    // If URL is masked, user hasn't entered a new one - don't save
    if (!webhookUrl || isMaskedUrl) {
      toast({
        title: "Webhook URL Required",
        description: isMaskedUrl 
          ? "Click on the webhook URL field to enter a new URL, or use the Re-verify button to test the existing one."
          : "Please enter your Discord webhook URL.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Save the webhook URL
      const saveResponse = await fetch("/api/integrations/discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: webhookUrl || null,
        }),
      })

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json()
        throw new Error(errorData.error || "Failed to save settings")
      }

      // Verify the webhook URL
      const verifyResponse = await fetch("/api/integrations/discord/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }), // Pass the URL explicitly for verification
      })

      const verifyData = await verifyResponse.json()

      if (verifyData.verified) {
        setVerified(true)
        toast({
          title: "Discord settings saved & verified",
          description: verifyData.message || "Webhook URL verified successfully. Check your Discord channel for the test message.",
        })
      } else {
        setVerified(false)
        toast({
          title: "Settings saved but verification failed",
          description: verifyData.error || "Invalid webhook URL",
          variant: "destructive",
        })
      }

      await loadSettings()
    } catch (error: any) {
      console.error("[Discord] Save error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save Discord settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-900/20 to-zinc-900/20 border border-indigo-900/30">
        <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-indigo-400" />
          Discord Integration
        </h2>
        <p className="text-zinc-400 text-sm">
          Connect Authority to your Discord server for notifications and bot interactions. The Authority bot is exclusive to this application.
        </p>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            Bot Invitation
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Authority Discord Bot</p>
                <p className="text-xs">
                  The Authority bot is exclusive to this application. Click the invite link to add it to your Discord server.
                  The bot requires permission to send messages in channels where you configure webhooks.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Invite Authority bot to your Discord server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DISCORD_BOT_INVITE_URL ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-indigo-950/30 border border-indigo-800/50">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white mb-1">Invite Authority Bot</h4>
                  <p className="text-xs text-zinc-400 mb-3">
                    Add the Authority bot to your Discord server to enable notifications and integrations.
                  </p>
                  <a
                    href={DISCORD_BOT_INVITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Invite Bot to Server
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              
              <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
                <p className="text-xs font-medium text-zinc-300 mb-2">Bot Permissions & Scopes:</p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-300 font-medium">Send Messages</p>
                      <p className="text-xs text-zinc-500">Post notifications to Discord channels</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-300 font-medium">Manage Webhooks</p>
                      <p className="text-xs text-zinc-500">Create and manage webhooks for notifications</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-300 font-medium">Read Messages</p>
                      <p className="text-xs text-zinc-500">Read channel messages for context</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-300 font-medium">Application Commands</p>
                      <p className="text-xs text-zinc-500">Enable slash commands (optional)</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-800/50">
                  <strong>Note:</strong> This bot invite uses Discord's bot authorization flow (no OAuth2 code grant required). 
                  The bot will be added to your server with the permissions listed above.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-md bg-yellow-900/20 border border-yellow-800/50">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-200 font-medium mb-1">
                    Bot Not Configured
                  </p>
                  <p className="text-xs text-yellow-300/80">
                    Discord bot client ID is not configured. Contact your administrator to set up the Authority Discord bot.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            Webhook Configuration
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Discord Webhooks</p>
                <p className="text-xs">
                  Webhooks allow Authority to send notifications directly to your Discord channels. Create a webhook in your Discord server settings (Server Settings → Integrations → Webhooks), then paste the URL here.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Configure Discord webhook for notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook_url" className="flex items-center gap-2">
              Webhook URL
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Your Discord webhook URL. This is stored securely and used to send notifications.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-2">
              <Input
                id="webhook_url"
                type="url"
                value={webhookUrl}
                onChange={(e) => {
                  if (e.target.value !== "••••••••") {
                    setWebhookUrl(e.target.value)
                  }
                }}
                onFocus={(e) => {
                  // Clear masked value when user focuses to enter new URL
                  if (webhookUrl === "••••••••") {
                    setWebhookUrl("")
                  }
                }}
                placeholder={webhookUrl === "••••••••" ? "Webhook URL saved (click to change)" : "https://discord.com/api/webhooks/..."}
                className="bg-zinc-950 border-zinc-800"
                disabled={webhookUrl === "••••••••"}
              />
              {(webhookUrl === "••••••••" || (webhookUrl && webhookUrl !== "••••••••")) && (
                <Button
                  onClick={handleVerify}
                  disabled={verifying}
                  variant="outline"
                  className="shrink-0 border-zinc-800 hover:bg-zinc-800"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {webhookUrl === "••••••••" ? "Re-verify" : "Verify"}
                    </>
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Create a webhook in your Discord server settings (Server Settings → Integrations → Webhooks) and paste the URL here.
              The webhook URL is stored securely and encrypted.
            </p>
          </div>

          {/* Verification Status */}
          {verified && (
            <div className="p-3 rounded-md bg-green-900/20 border border-green-800/50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-400 mb-1">Webhook Verified</p>
                  <p className="text-xs text-green-300/80">
                    Your Discord webhook is active and ready to receive notifications.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Save Discord Settings
          </>
        )}
      </Button>
    </div>
  )
}
