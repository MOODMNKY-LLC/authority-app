"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, XCircle, Clock, ExternalLink, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
// Simple date formatting helper
const formatTimeAgo = (date: string) => {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

interface LinkStatusBadgeProps {
  notionPageId?: string
  lastSyncedAt?: string
  status: "synced" | "pending" | "error" | "not_linked"
  onRefresh?: () => void
  refreshing?: boolean
}

export function LinkStatusBadge({
  notionPageId,
  lastSyncedAt,
  status,
  onRefresh,
  refreshing = false,
}: LinkStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "synced":
        return {
          icon: CheckCircle2,
          color: "bg-green-500/20 text-green-400 border-green-500/30",
          text: "Synced",
        }
      case "pending":
        return {
          icon: Clock,
          color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
          text: "Pending",
        }
      case "error":
        return {
          icon: XCircle,
          color: "bg-red-500/20 text-red-400 border-red-500/30",
          text: "Error",
        }
      default:
        return {
          icon: null,
          color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
          text: "Not Linked",
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const handleOpenInNotion = () => {
    if (notionPageId) {
      const pageId = notionPageId.replace(/-/g, "")
      window.open(`https://notion.so/${pageId}`, "_blank")
    }
  }

  const getTooltipContent = () => {
    if (status === "synced" && lastSyncedAt) {
      const timeAgo = formatTimeAgo(lastSyncedAt)
      return `Synced ${timeAgo}. Click to open in Notion.`
    }
    if (status === "pending") {
      return "Sync in progress..."
    }
    if (status === "error") {
      return "Sync failed. Click refresh to retry."
    }
    return "Not linked to Notion. Generate content to create a link."
  }

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 text-xs font-medium",
              config.color
            )}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {config.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>

      {notionPageId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleOpenInNotion}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Open in Notion</p>
          </TooltipContent>
        </Tooltip>
      )}

      {onRefresh && status !== "not_linked" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Refresh sync status</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

