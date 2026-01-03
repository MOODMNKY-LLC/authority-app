"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle, ExternalLink, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NotionSyncIndicator } from "@/components/notion-sync-indicator"
import { createBrowserClient } from "@/lib/supabase/client"

interface DatabaseInfo {
  id: string
  name: string
  pageCount?: number
}

interface DatabaseContent {
  totalPages: number
  samplePages: Array<{
    id: string
    title: string
    lastEdited: string
    url: string
  }>
}

interface SyncResult {
  success: boolean
  databases?: Record<string, DatabaseInfo>
  databaseContents?: Record<string, DatabaseContent>
  missing?: string[]
  message?: string
  error?: string
}

interface NotionSyncButtonProps {
  onSyncComplete?: () => void | Promise<void>
}

export function NotionSyncButton({ onSyncComplete }: NotionSyncButtonProps) {
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [oauthStatus, setOauthStatus] = useState<any>(null)
  const [checkingOAuth, setCheckingOAuth] = useState(true)

  // Check OAuth status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/notion/check-oauth")
        const status = await response.json()
        setOauthStatus(status)
      } catch (error) {
        console.error("[Authority] Error checking OAuth status:", error)
      } finally {
        setCheckingOAuth(false)
      }
    }
    checkStatus()
  }, [])

  const handleNotionOAuth = async () => {
    try {
      const supabase = createBrowserClient()
      let origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || 
                   (typeof window !== 'undefined' ? window.location.origin : '')
      
      // Fallback if origin is still undefined
      if (!origin || origin === 'undefined') {
        origin = typeof window !== 'undefined' 
          ? `${window.location.protocol}//${window.location.host}`
          : 'http://localhost:3000'
      }
      
      if (origin.includes("0.0.0.0")) {
        origin = origin.replace("0.0.0.0", "localhost")
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "notion" as any,
        options: {
          redirectTo: `${origin}/auth/callback?next=/admin`,
          queryParams: {
            // Request additional scopes if needed
            owner: "user",
          },
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

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)

    try {
      // First check OAuth status
      const oauthCheck = await fetch("/api/notion/check-oauth")
      const oauthStatus = await oauthCheck.json()

      if (!oauthStatus.canSync) {
        setSyncResult({
          success: false,
          error: oauthStatus.message || "Notion not connected. Please authenticate with Notion OAuth first.",
          action: "authenticate",
        })
        toast({
          title: "Notion Not Connected",
          description: "Please authenticate with Notion OAuth or add an integration token",
          variant: "destructive",
        })
        setSyncing(false)
        return
      }

      const response = await fetch("/api/notion/sync-databases", {
        method: "POST",
      })

      const data: SyncResult = await response.json()

      if (data.success) {
        setSyncResult(data)
        toast({
          title: "Sync Successful",
          description: data.message || "Databases synced successfully!",
        })
        // Notify parent component to refresh sync status
        if (onSyncComplete) {
          onSyncComplete()
        }
      } else {
        setSyncResult(data)
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync databases",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[Authority] Sync error:", error)
      setSyncResult({
        success: false,
        error: error.message || "Failed to sync databases",
      })
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing databases",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const databases = syncResult?.databases || {}
  const databaseContents = syncResult?.databaseContents || {}
  const missing = syncResult?.missing || []

  // Show authentication prompt if no token available
  if (!checkingOAuth && oauthStatus && !oauthStatus.canSync) {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${
          oauthStatus.needsReAuth 
            ? "bg-blue-900/20 border-blue-900/30" 
            : "bg-yellow-900/20 border-yellow-900/30"
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`h-5 w-5 mt-0.5 ${
              oauthStatus.needsReAuth ? "text-blue-400" : "text-yellow-400"
            }`} />
            <div className="flex-1 space-y-3">
              <div>
                <h4 className={`text-sm font-medium mb-1 ${
                  oauthStatus.needsReAuth ? "text-blue-400" : "text-yellow-400"
                }`}>
                  {oauthStatus.needsReAuth 
                    ? "Notion OAuth Token Not Accessible" 
                    : "Notion Not Connected"}
                </h4>
                <p className={`text-sm ${
                  oauthStatus.needsReAuth ? "text-blue-300/80" : "text-yellow-300/80"
                }`}>
                  {oauthStatus.message || "To sync databases, you need to authenticate with Notion OAuth or add an integration token."}
                </p>
                {oauthStatus.needsReAuth && (
                  <p className="text-xs text-blue-300/70 mt-2">
                    Supabase Auth may not expose provider tokens. Using an integration token is recommended for reliable access.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {!oauthStatus.isNotionAuth && (
                  <>
                    <Button
                      onClick={handleNotionOAuth}
                      className="bg-white hover:bg-zinc-100 text-black font-medium"
                    >
                      <img src="/notion-logo.svg" alt="Notion" className="w-4 h-4 mr-2" />
                      Authenticate with Notion OAuth
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-700" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-zinc-900 px-2 text-zinc-500">Or</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="text-xs text-zinc-400 space-y-2">
                  <p className="font-medium text-zinc-300">Add Integration Token (Recommended):</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>
                      Create integration at{" "}
                      <a
                        href="https://www.notion.so/my-integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                      >
                        notion.so/my-integrations
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Grant permissions: <strong>Read content</strong>, <strong>Update content</strong>, <strong>Insert content</strong></li>
                    <li>Copy your integration token (starts with <code className="bg-zinc-800 px-1 rounded">secret_</code>)</li>
                    <li>Add it in the "Advanced: Manual Integration Token" section below</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSync}
          disabled={syncing || checkingOAuth}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {syncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : checkingOAuth ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync with Notion
            </>
          )}
        </Button>

        {syncResult && (
          <div className="flex items-center gap-2">
            {syncResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm text-zinc-400">
              {syncResult.success
                ? `${Object.keys(databases).length} databases synced`
                : syncResult.error}
            </span>
          </div>
        )}
      </div>

      {/* Show success message if all core databases are found */}
      {missing.length === 0 && Object.keys(databases).length > 0 && (
        <div className="p-3 rounded-lg bg-green-900/20 border border-green-900/30 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm text-green-400 font-medium">All Core Databases Found</p>
            <p className="text-xs text-green-300">
              All {Object.keys(databases).length} core databases are synced and ready. Your Authority template is fully configured for character creation, world-building, story tracking, chat history, and all other features.
            </p>
          </div>
        </div>
      )}

      {/* Show informational message if some core databases are missing */}
      {missing.length > 0 && Object.keys(databases).length > 0 && (
        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-900/30 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm text-blue-400 font-medium">Core Databases Status</p>
            <p className="text-xs text-blue-300">
              {Object.keys(databases).length} database{Object.keys(databases).length !== 1 ? "s" : ""} synced. 
              {missing.length > 0 && (
                <> {missing.length} core database{missing.length !== 1 ? "s" : ""} not found: <strong>{missing.join(", ")}</strong>.</>
              )}
            </p>
            <p className="text-xs text-blue-300/80 mt-1">
              Missing databases may limit some features. All synced databases are working and ready to use.
            </p>
          </div>
        </div>
      )}

      {/* Only show troubleshooting if NO databases are synced */}
      {Object.keys(databases).length === 0 && syncResult && syncResult.success === false && (
        <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-900/30 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-sm text-yellow-400 font-medium">No Databases Synced</p>
              <p className="text-xs text-yellow-300 mt-1">
                No databases were found in your workspace. This could mean:
              </p>
              <ul className="text-xs text-yellow-300/70 mt-1 list-disc list-inside space-y-1 ml-2">
                <li>You haven't duplicated the Authority template yet</li>
                <li>Your integration doesn't have access to the databases</li>
                <li>The databases are in a nested page that needs to be shared with your integration</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
