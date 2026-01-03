"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Database,
  Key,
  Clock,
  Info,
  HelpCircle,
  User,
  Edit2,
  Save,
  X,
  ArrowRight,
  Settings,
} from "lucide-react"
import { NotionSyncIndicator } from "@/components/notion-sync-indicator"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { getNotionCapabilities } from "@/lib/notion/capabilities"
import { Switch } from "@/components/ui/switch"

const ALL_CORE_DATABASES = [
  "Chat Sessions",
  "Characters",
  "Worlds",
  "Stories",
  "Chapters",
  "Magic Systems",
  "Factions & Organizations",
  "Lore & History",
  "Locations",
  "Projects",
  "Image Gallery",
  "Integration Keys",
  "Voice Profiles",
]

interface ConnectionStatus {
  authenticated: boolean
  user?: {
    email: string | null
    name: string | null
    avatar: string | null
    id: string | null
  }
  connection?: {
    oauth: {
      connected: boolean
      provider: string | null
      hasIdentity: boolean
      workspaceId: string | null
      workspaceName: string | null
      identityData?: {
        provider: string
        id: string
        createdAt: string
        updatedAt: string
      } | null
    }
    integration: {
      connected: boolean
    }
    token: {
      type: "oauth" | "integration" | null
      valid: boolean
      error: string | null
    }
    lastUpdated: string | null
  }
  databases?: {
    status: Record<string, { synced: boolean; id: string | null }>
    syncedCount: number
    totalCount: number
    allDatabases: Record<string, string>
  }
  template?: {
    pageId: string | null
  }
  canSync?: boolean
  error?: string
}

interface SyncedDatabase {
  id: string
  name: string
  pageCount?: number
  samplePages?: Array<{
    id: string
    title: string
    lastEdited: string
    url: string
  }>
  isCore?: boolean
  lastSynced?: string
  status?: "synced" | "pending" | "error"
  description?: string
}

interface UserProfile {
  id: string
  user_id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

interface NotionSectionProps {
  onNavigateToSync?: () => void
}

export function NotionSection({ onNavigateToSync }: NotionSectionProps = {}) {
  const { toast } = useToast()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [integrationToken, setIntegrationToken] = useState("")
  const [savingToken, setSavingToken] = useState(false)
  const [syncedCount, setSyncedCount] = useState(0)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [savingAutoSync, setSavingAutoSync] = useState(false)

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user-profile")
      const data = await response.json()
      if (data.profile) {
        setUserProfile(data.profile)
        setProfileDisplayName(data.profile.display_name || "")
        setProfileBio(data.profile.bio || "")
      }
    } catch (error) {
      console.error("[Authority] Error fetching user profile:", error)
    }
  }

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch("/api/notion/connection-status")
      const data = await response.json()
      setConnectionStatus(data)
      
      // Only fetch synced count for lightweight display
      if (data.canSync && data.databases) {
        setSyncedCount(data.databases.syncedCount || 0)
      }
      
      // Fetch auto sync setting
      if (data.autoSyncEnabled !== undefined) {
        setAutoSyncEnabled(data.autoSyncEnabled)
      }
    } catch (error: any) {
      console.error("[Authority] Error fetching connection status:", error)
      setConnectionStatus({
        authenticated: false,
        error: error.message || "Failed to fetch connection status",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchConnectionStatus()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchConnectionStatus()
  }

  const handleToggleAutoSync = async (enabled: boolean) => {
    setSavingAutoSync(true)
    try {
      const response = await fetch("/api/settings/auto-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        setAutoSyncEnabled(enabled)
        toast({
          title: enabled ? "Auto Sync Enabled" : "Auto Sync Disabled",
          description: enabled 
            ? "Your databases will sync automatically every 15 minutes via cron jobs."
            : "Automatic syncing is now disabled. Use manual sync buttons to sync your databases.",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update auto sync setting",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[Authority] Error updating auto sync:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update auto sync setting",
        variant: "destructive",
      })
    } finally {
      setSavingAutoSync(false)
    }
  }

  const handleSaveIntegrationToken = async () => {
    if (!integrationToken.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter an integration token",
        variant: "destructive",
      })
      return
    }

    setSavingToken(true)
    try {
      // Save and verify token via API (which handles encryption)
      const response = await fetch("/api/integrations/notion-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: integrationToken.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Token Saved & Verified",
          description: data.verified
            ? `Integration token verified successfully${data.userInfo?.name ? ` (${data.userInfo.name})` : ""}`
            : "Token saved but verification failed. Please check your token.",
          variant: data.verified ? "default" : "destructive",
        })

        setIntegrationToken("")
        await fetchConnectionStatus()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to save token")
      }
    } catch (error: any) {
      console.error("[Authority] Error saving integration token:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save integration token",
        variant: "destructive",
      })
    } finally {
      setSavingToken(false)
    }
  }

  const handleNotionOAuth = async () => {
    try {
      const supabase = createClient()
      let origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || 
                   (typeof window !== 'undefined' ? window.location.origin : '')
      
      // Fallback if origin is still undefined
      if (!origin || origin === 'undefined') {
        origin = typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.host}`
          : 'https://localhost:3000'
      }
      
      // Normalize: replace 0.0.0.0 with localhost
      if (origin.includes("0.0.0.0")) {
        origin = origin.replace("0.0.0.0", "localhost")
      }
      
      // Ensure HTTPS is used if the page is loaded over HTTPS (for dev:https)
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && origin.startsWith('http:')) {
        origin = origin.replace('http:', 'https:')
      }

      const redirectTo = `${origin}/auth/callback?next=/admin`
      
      console.log("[Authority] Notion OAuth (Settings) - Redirect URL:", {
        origin,
        redirectTo,
        windowProtocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
        environment: process.env.NODE_ENV,
      })

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "notion" as any,
        options: {
          redirectTo,
        },
      })
      if (error) throw error
    } catch (err: any) {
      toast({
        title: "OAuth Error",
        description: err.message || "Failed to start Notion OAuth",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!connectionStatus?.authenticated) {
    return (
      <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/30">
        <p className="text-red-400">Not authenticated. Please log in first.</p>
      </div>
    )
  }

  const conn = connectionStatus.connection
  const user = connectionStatus.user
  // Always show integration token input - users can add it even if OAuth is connected
  const showTokenInput = true

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
        <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
          <Database className="h-6 w-6 text-red-500" />
          Notion Integration
        </h2>
        <p className="text-zinc-400 text-sm">
          Connect your Notion workspace and sync databases for world-building, character management, story tracking, and RAG capabilities.
        </p>
      </div>

      {/* Quick Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connection Status */}
        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Connection</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-zinc-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Connection Status</p>
                    <p className="text-xs">
                      OAuth connection allows Authority to access your Notion workspace. Used for syncing databases and creating content like characters, worlds, and stories.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {conn?.token.valid ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
            </div>
            <p className="text-lg font-semibold text-white">
              {conn?.token.valid ? "Connected" : "Not Connected"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {conn?.token.type === "oauth" ? "OAuth" : conn?.token.type === "integration" ? "Integration Token" : "No token"}
            </p>
          </CardContent>
        </Card>

        {/* Databases Synced */}
        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Databases Synced</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-zinc-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Synced Databases</p>
                    <p className="text-xs">
                      These databases from your duplicated Authority template are synced and ready for use. They power character creation, world-building, story tracking, and chat history storage.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Database className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-lg font-semibold text-white">
              {syncedCount}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {syncedCount > 0 ? "from template" : "none synced"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Details */}
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">Connection Details</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Connection Details</p>
                  <p className="text-xs">
                    OAuth provides seamless access to your Notion workspace. Integration tokens offer more reliable access and are recommended as a backup or primary method.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
          <CardDescription>OAuth session and authentication status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* OAuth Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  conn?.oauth.connected ? "bg-green-500 animate-pulse" : "bg-gray-500",
                )}
              />
              <div>
                <p className="text-sm font-medium text-white">OAuth Connection</p>
                <p className="text-xs text-zinc-500">
                  {conn?.oauth.connected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            {conn?.oauth.connected ? (
              <Badge variant="outline" className="bg-green-900/20 border-green-700 text-green-400">
                Active
              </Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={handleNotionOAuth}>
                Connect OAuth
              </Button>
            )}
          </div>

          {/* Integration Token Input - Enhanced with Feature Explanation */}
          {/* Always show integration token input for users to add their personal token */}
          {showTokenInput && !conn?.integration.connected && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-900/30">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Key className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-1">Enhanced Features with Integration Token</h4>
                    <p className="text-xs text-zinc-400 mb-3">
                      Adding an integration token unlocks additional capabilities and improves reliability.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                        <span className="text-zinc-300">More reliable API access</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                        <span className="text-zinc-300">Access to private pages</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                        <span className="text-zinc-300">Better rate limits</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                        <span className="text-zinc-300">Webhook management</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                        <span className="text-zinc-300">Link preview/unfurl support</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                        <span className="text-zinc-300">Advanced sync features</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="integration-token" className="text-sm font-medium text-white">
                    Integration Token
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-zinc-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-1">Integration Token</p>
                      <p className="text-xs mb-2">
                        Personal integration tokens provide more reliable access than OAuth. Create one at notion.so/my-integrations and share your databases with the integration.
                      </p>
                      <p className="text-xs text-zinc-300">
                        Recommended if OAuth token is not accessible or as a backup authentication method.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="integration-token"
                    type="password"
                    value={integrationToken}
                    onChange={(e) => setIntegrationToken(e.target.value)}
                    placeholder="secret_..."
                    className="bg-zinc-900 border-zinc-800 font-mono text-sm"
                  />
                  <Button
                    onClick={handleSaveIntegrationToken}
                    disabled={savingToken || !integrationToken.trim()}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                  >
                    {savingToken ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-zinc-500">
                  Create integration:{" "}
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    className="text-red-400 hover:underline inline-flex items-center gap-1"
                    rel="noreferrer"
                  >
                    notion.so/my-integrations
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Integration Token Status (if configured) */}
          {conn?.integration.connected && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-white">Integration Token</p>
                  <p className="text-xs text-zinc-500">Configured</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-900/20 border-green-700 text-green-400">
                Active
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Sync Details Button */}
      {syncedCount > 0 && onNavigateToSync && (
        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Sync Management</h3>
                <p className="text-sm text-zinc-400">
                  View detailed sync progress, manage seed data, configure webhooks, and more.
                </p>
              </div>
              <Button
                onClick={onNavigateToSync}
                className="bg-red-600 hover:bg-red-700 text-white shrink-0"
              >
                View Sync Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto Sync Toggle */}
      {connectionStatus?.canSync && (
        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-400" />
              Automatic Syncing
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Enable automatic syncing via cron jobs (runs every 15 minutes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="auto-sync" className="text-sm font-medium text-white cursor-pointer">
                    Enable Auto Sync
                  </Label>
                  {autoSyncEnabled && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-900/20 border-green-700 text-green-400">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  {autoSyncEnabled 
                    ? "Your databases will sync automatically every 15 minutes. You can still use manual sync buttons at any time."
                    : "Automatic syncing is disabled. Use manual sync buttons to sync your databases."}
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={autoSyncEnabled}
                onCheckedChange={handleToggleAutoSync}
                disabled={savingAutoSync || loading}
                className="shrink-0"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
