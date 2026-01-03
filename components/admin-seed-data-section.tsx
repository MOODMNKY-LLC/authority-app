"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Database, CheckCircle2, XCircle, Sparkles, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

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

export function AdminSeedDataSection() {
  const [status, setStatus] = useState<SeedDataStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [checking, setChecking] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setChecking(true)
    try {
      const response = await fetch("/api/admin/seed-data")
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

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const response = await fetch("/api/admin/seed-data", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Seed Data Created",
          description: `Successfully created seed data for all databases`,
          duration: 5000,
        })
        // Refresh status
        await checkStatus()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create seed data",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[Authority] Error seeding data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create seed data",
        variant: "destructive",
      })
    } finally {
      setSeeding(false)
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
          description: data.message || `Successfully synced ${data.totalSynced || 0} items to Notion`,
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

  return (
    <Card className="backdrop-blur-md backdrop-saturate-150 bg-black/30 border border-zinc-800/50 shadow-lg shadow-black/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Seed Database Data
            </CardTitle>
            <CardDescription>
              Populate your Forge databases with sample world-building content
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
              "Refresh Status"
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

            <div className="space-y-3 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSeed}
                  disabled={seeding || syncing}
                  className="backdrop-blur-md bg-red-600/20 hover:bg-red-600/30 border border-red-800/50 text-red-400"
                >
                  {seeding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Seed Data
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSyncToNotion}
                  disabled={seeding || syncing || !status || !Object.values(status.counts).some(count => count > 0)}
                  className="backdrop-blur-md bg-blue-600/20 hover:bg-blue-600/30 border border-blue-800/50 text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Sync to Notion
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-400">
                <strong>Create Seed Data:</strong> Creates sample entries in Supabase for Characters, Worlds, Stories, Magic Systems,
                Factions, and Lore. Existing entries with the same name will be skipped.
                <br />
                <strong>Sync to Notion:</strong> Pulls seed data from Supabase and creates corresponding pages in your Notion databases. 
                {(!status || !Object.values(status.counts).some(count => count > 0)) && (
                  <span className="text-yellow-400"> (Create seed data first)</span>
                )}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

