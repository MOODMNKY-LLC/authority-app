"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Check, Cloud } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface NotionSyncButtonProps {
  contentType: "character" | "world" | "story" | "chat"
  contentId: string
  notionPageId?: string | null
  notionToken?: string
}

export function NotionSyncButton({ contentType, contentId, notionPageId, notionToken }: NotionSyncButtonProps) {
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(!!notionPageId)
  const { toast } = useToast()

  const handleSync = async () => {
    if (!notionToken) {
      toast({
        title: "Notion Not Connected",
        description: "Please add your Notion integration token in Admin Settings first.",
        variant: "destructive",
      })
      return
    }

    setSyncing(true)

    try {
      const response = await fetch("/api/notion/add-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          notionToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync to Notion")
      }

      setSynced(true)
      toast({
        title: "Synced to Notion!",
        description: "Your content has been added to your Notion workspace.",
      })
    } catch (error: any) {
      console.error("[v0] Notion sync error:", error)
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync content to Notion.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  if (synced) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 bg-transparent">
        <Check className="h-4 w-4 text-green-500" />
        Synced to Notion
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2 bg-transparent">
      {syncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4" />
          Add to Notion
        </>
      )}
    </Button>
  )
}
