"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, CheckCircle2, XCircle, Database, Sparkles, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SeedDataStatus {
  hasData: {
    characters: boolean
    worlds: boolean
    stories: boolean
    magic: boolean
    factions: boolean
    lore: boolean
  }
  counts: {
    characters: number
    worlds: number
    stories: number
    magic: number
    factions: number
    lore: number
  }
}

export function NotionSeedSection() {
  const [status, setStatus] = useState<SeedDataStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [checking, setChecking] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setChecking(true)
    try {
      const response = await fetch("/api/notion/seed-databases")
      const data = await response.json()

      if (data.success) {
        setStatus(data)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to check seed data status",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[Authority] Error checking seed status:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to check seed data status",
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  const handleSyncToNotion = async () => {
    setSyncing(true)
    try {
      const response = await fetch("/api/notion/seed-from-supabase", {
        method: "POST",
      })
      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Synced to Notion",
          description: data.message || `Successfully synced ${data.totalSynced || 0} items to Notion. Your seed data is now available in your Forge pages.`,
          duration: 5000,
        })
        // Refresh status
        await checkStatus()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to sync seed data to Notion",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[Authority] Error syncing to Notion:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to sync seed data to Notion",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const databaseStatus = [
    { name: "Characters", key: "characters", icon: "👤" },
    { name: "Worlds", key: "worlds", icon: "🌍" },
    { name: "Stories", key: "stories", icon: "📖" },
    { name: "Magic Systems", key: "magic", icon: "✨" },
    { name: "Factions", key: "factions", icon: "⚔️" },
    { name: "Lore", key: "lore", icon: "📜" },
  ]

  const hasAnyData = status && Object.values(status.counts).some(count => count > 0)
  const allSeeded = status && Object.values(status.hasData).every(hasData => hasData)
  const totalCount = status ? Object.values(status.counts).reduce((sum, count) => sum + count, 0) : 0

  return (
    <Card className="backdrop-blur-md backdrop-saturate-150 bg-black/30 border border-zinc-800/50 shadow-lg shadow-black/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Seed Data & Notion Sync
            </CardTitle>
            <CardDescription>
              View your Supabase seed data and sync it to Notion databases
            </CardDescription>
          </div>
          <Button
            onClick={checkStatus}
            variant="outline"
            size="sm"
            disabled={checking}
            className="backdrop-blur-md bg-black/20 border-zinc-800/50"
          >
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {checking ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {/* Status Summary */}
            {hasAnyData ? (
              <div className="p-3 rounded-lg bg-green-900/20 border border-green-800/50 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-400">Seed data ready in Supabase</p>
                  <p className="text-xs text-zinc-400">
                    {totalCount} sample entries found. Ready to sync to Notion.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-800/50 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400">No seed data found</p>
                  <p className="text-xs text-zinc-400">
                    Seed data is created automatically when you sync databases. If you don't see any data, try refreshing or syncing your databases again.
                  </p>
                </div>
              </div>
            )}

            {/* Database Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {databaseStatus.map((db) => {
                const hasData = status?.hasData[db.key as keyof typeof status.hasData] || false
                const count = status?.counts[db.key as keyof typeof status.counts] || 0

                return (
                  <div
                    key={db.key}
                    className={cn(
                      "p-3 rounded-lg border backdrop-blur-sm",
                      hasData
                        ? "bg-green-900/20 border-green-800/50"
                        : "bg-black/20 border-zinc-800/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{db.icon}</span>
                        <span className="text-sm font-medium">{db.name}</span>
                      </div>
                      {hasData ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Items:</span>
                      <Badge
                        variant={hasData ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          hasData
                            ? "bg-green-600/20 text-green-400 border-green-600/30"
                            : ""
                        )}
                      >
                        {count}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Primary Action */}
            <div className="space-y-3 pt-4 border-t border-zinc-800/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSyncToNotion}
                    disabled={syncing || !hasAnyData}
                    className={cn(
                      "w-full backdrop-blur-md border text-white",
                      hasAnyData
                        ? "bg-blue-600/20 hover:bg-blue-600/30 border-blue-800/50 text-blue-400"
                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing to Notion...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Sync Seed Data to Notion
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Sync Seed Data to Notion</p>
                  <p className="text-xs">
                    {hasAnyData
                      ? "Pulls seed data from Supabase and creates corresponding pages in your Notion databases. This verifies your Notion connection and makes seed entries available in your Forge pages."
                      : "Seed data must exist in Supabase first. Seed data is created automatically when you sync databases."}
                  </p>
                </TooltipContent>
              </Tooltip>
              <p className="text-xs text-zinc-400">
                <strong>How it works:</strong> Seed data is automatically created in Supabase when you sync your databases. 
                Click "Sync Seed Data to Notion" to push this data to your Notion databases. Once synced, these entries will appear 
                in your Forge pages (Characters, Worlds, Stories, etc.) for you to review and edit.
                {!hasAnyData && (
                  <span className="text-yellow-400 block mt-1">
                    ⚠️ No seed data found. Seed data is created automatically during database sync. Try refreshing or syncing your databases again.
                  </span>
                )}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
