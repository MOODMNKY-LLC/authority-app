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
} from "lucide-react"
import { NotionSyncIndicator } from "@/components/notion-sync-indicator"
import { NotionSyncButton } from "@/components/notion-sync-button"
import { UserAvatarUpload } from "@/components/user-avatar-upload"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"

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

export function NotionSection() {
  const { toast } = useToast()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [integrationToken, setIntegrationToken] = useState("")
  const [savingToken, setSavingToken] = useState(false)
  const [syncedDatabases, setSyncedDatabases] = useState<Record<string, SyncedDatabase>>({})
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDisplayName, setProfileDisplayName] = useState("")
  const [profileBio, setProfileBio] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

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
      
      // Fetch synced databases from sync endpoint to get full details
      if (data.canSync) {
        try {
          const syncResponse = await fetch("/api/notion/sync-databases", { method: "POST" })
          const syncData = await syncResponse.json()
          if (syncData.success && syncData.databases) {
            const formatted: Record<string, SyncedDatabase> = {}
            Object.entries(syncData.databases).forEach(([name, info]: [string, any]) => {
              const isCore = ALL_CORE_DATABASES.includes(name)
              formatted[name] = {
                id: info.id,
                name: name,
                pageCount: info.pageCount,
                samplePages: syncData.databaseContents?.[name]?.samplePages,
                isCore: isCore,
                status: "synced" as const,
                lastSynced: new Date().toISOString(),
              }
            })
            setSyncedDatabases(formatted)
          }
        } catch (syncErr) {
          console.error("[Authority] Error fetching sync data:", syncErr)
        }
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
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Not Authenticated",
          description: "Please log in first",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            notion_token: integrationToken.trim(),
          },
          {
            onConflict: "user_id",
          },
        )

      if (error) throw error

      toast({
        title: "Token Saved",
        description: "Integration token saved successfully",
      })

      setIntegrationToken("")
      await fetchConnectionStatus()
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
      let origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin
      if (origin.includes("0.0.0.0")) {
        origin = origin.replace("0.0.0.0", "localhost")
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "notion" as any,
        options: {
          redirectTo: `${origin}/auth/callback?next=/admin`,
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
  const syncedCount = Object.keys(syncedDatabases).length
  const showTokenInput = !conn?.oauth.connected || !conn?.token.valid

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

          {/* Integration Token Input - Inline */}
          {showTokenInput && (
            <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/50 space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="integration-token" className="text-sm font-medium text-white">
                  Integration Token (Optional)
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

      {/* Database Sync */}
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-red-500" />
              Database Sync
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Database Sync</p>
                <p className="text-xs">
                  Syncs databases from your duplicated Authority template. These databases power character creation, world-building, story tracking, and chat history storage in the app.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription>
            Sync databases from your duplicated Authority template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotionSyncButton
            onSyncComplete={async () => {
              await fetchConnectionStatus()
            }}
          />

          {/* Synced Databases Table */}
          {syncedCount > 0 && (
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-medium text-zinc-300">
                  Synced Databases ({syncedCount})
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-zinc-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Synced Databases</p>
                    <p className="text-xs">
                      These databases from your Authority template are synced and ready for use. They power character creation, world-building, story tracking, and chat history storage.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="rounded-lg border border-zinc-800/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-950/50 border-b border-zinc-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Database Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Pages
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Database ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {Object.values(syncedDatabases).map((db) => {
                        const isCore = db.isCore ?? ALL_CORE_DATABASES.includes(db.name)
                        const status = db.status || "synced"
                        return (
                          <tr
                            key={db.id}
                            className="hover:bg-zinc-950/30 transition-colors"
                          >
                            {/* Status Indicator */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <NotionSyncIndicator synced={status === "synced"} />
                                <span
                                  className={cn(
                                    "text-xs font-medium",
                                    status === "synced"
                                      ? "text-green-400"
                                      : status === "pending"
                                        ? "text-yellow-400"
                                        : "text-red-400",
                                  )}
                                >
                                  {status === "synced"
                                    ? "Synced"
                                    : status === "pending"
                                      ? "Pending"
                                      : "Error"}
                                </span>
                              </div>
                            </td>
                            {/* Database Name */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">{db.name}</span>
                                {isCore && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 bg-blue-900/20 border-blue-700 text-blue-400"
                                  >
                                    Core
                                  </Badge>
                                )}
                              </div>
                            </td>
                            {/* Page Count */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {db.pageCount !== undefined ? (
                                <span className="text-sm text-zinc-300">
                                  {db.pageCount.toLocaleString()} {db.pageCount === 1 ? "page" : "pages"}
                                </span>
                              ) : (
                                <span className="text-sm text-zinc-500">—</span>
                              )}
                            </td>
                            {/* Database ID */}
                            <td className="px-4 py-3">
                              <code className="text-xs text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded font-mono">
                                {db.id.substring(0, 8)}...
                              </code>
                            </td>
                            {/* Type */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  isCore
                                    ? "bg-blue-900/20 border-blue-700 text-blue-400"
                                    : "bg-zinc-900/50 border-zinc-700 text-zinc-400",
                                )}
                              >
                                {isCore ? "Core" : "Custom"}
                              </Badge>
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={`https://notion.so/${db.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-400 transition-colors"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="text-xs">Open</span>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Open in Notion</p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
