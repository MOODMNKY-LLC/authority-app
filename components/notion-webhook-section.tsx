"use client"

import { useState, useEffect } from "react"
import { Webhook, Loader2, CheckCircle2, XCircle, Info, ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getNotionCapabilities } from "@/lib/notion/capabilities"
import { cn } from "@/lib/utils"

interface WebhookStatus {
  database_id: string
  database_name: string
  webhook_id: string | null
  active: boolean
  created_at: string | null
}

export function NotionWebhookSection() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [webhooks, setWebhooks] = useState<WebhookStatus[]>([])
  const [capabilities, setCapabilities] = useState<any>(null)
  const [syncedDatabases, setSyncedDatabases] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load capabilities
      const settingsResponse = await fetch("/api/settings")
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        const caps = getNotionCapabilities({
          notion_access_token: settings.notionAccessToken,
          notion_token: settings.notionToken,
        })
        setCapabilities(caps)
        setSyncedDatabases(settings.notionDatabases || {})
      }

      // Load webhooks
      const webhooksResponse = await fetch("/api/notion/webhooks/list")
      if (webhooksResponse.ok) {
        const data = await webhooksResponse.json()
        setWebhooks(data.webhooks || [])
      }
    } catch (error) {
      console.error("Failed to load webhook data:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleWebhook = async (databaseId: string, enabled: boolean) => {
    try {
      if (enabled) {
        // Create webhook
        const response = await fetch("/api/notion/webhooks/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId }),
        })

        if (response.ok) {
          toast({
            title: "Webhook enabled",
            description: "Real-time sync is now active for this database.",
          })
          loadData()
        } else {
          const error = await response.json()
          throw new Error(error.message || "Failed to enable webhook")
        }
      } else {
        // Delete webhook
        const response = await fetch(`/api/notion/webhooks/delete?database_id=${databaseId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          toast({
            title: "Webhook disabled",
            description: "Real-time sync has been disabled for this database.",
          })
          loadData()
        } else {
          throw new Error("Failed to disable webhook")
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update webhook",
        variant: "destructive",
      })
    }
  }

  // Don't show if integration token not available
  if (capabilities && !capabilities.canUseWebhooks) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Webhook className="h-5 w-5 text-purple-400" />
            Real-time Webhooks
          </CardTitle>
          <CardDescription>
            Enable instant bidirectional sync with Notion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-800/50">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-yellow-200 font-medium mb-1">
                  Integration Token Required
                </p>
                <p className="text-xs text-yellow-300/80">
                  Webhooks require a Notion integration token for reliable operation. Add an integration token in the Integration Token section above to unlock real-time sync.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Webhook className="h-5 w-5 text-purple-400" />
          Real-time Webhooks
        </CardTitle>
        <CardDescription>
          Enable instant bidirectional sync. Changes in Notion update Authority automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : Object.keys(syncedDatabases).length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No databases synced yet. Sync your databases first to enable webhooks.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(syncedDatabases).map(([databaseName, databaseId]) => {
              const webhook = webhooks.find((w) => w.database_id === databaseId)
              const isActive = webhook?.active || false

              return (
                <div
                  key={databaseId}
                  className="flex items-center justify-between p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor={`webhook-${databaseId}`} className="text-sm font-medium text-white cursor-pointer">
                        {databaseName}
                      </Label>
                      {isActive && (
                        <Badge variant="outline" className="text-xs bg-green-900/20 text-green-400 border-green-800/50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    {isActive && webhook?.created_at && (
                      <p className="text-xs text-zinc-500">
                        Enabled {new Date(webhook.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Switch
                          id={`webhook-${databaseId}`}
                          checked={isActive}
                          onCheckedChange={(checked) => toggleWebhook(databaseId, checked)}
                          disabled={loading}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {isActive
                            ? "Disable real-time sync for this database"
                            : "Enable real-time sync for this database"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="p-3 rounded-md bg-blue-900/20 border border-blue-800/50">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-blue-300 font-medium mb-1">How it works</p>
              <p className="text-xs text-blue-300/80">
                When enabled, changes made in Notion automatically sync to Authority within seconds.
                No manual refresh needed. Webhooks work best with integration tokens for reliable delivery.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



