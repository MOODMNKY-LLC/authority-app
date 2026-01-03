"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const FORGE_TO_DATABASE_MAP: Record<string, string> = {
  character: "Characters",
  world: "Worlds",
  storyline: "Stories",
  story: "Stories",
  magic: "Magic Systems",
  faction: "Factions & Organizations",
  lore: "Lore & History",
}

interface DatabaseStatus {
  accessible: boolean
  id: string | null
  error?: string
  name?: string
}

interface VerifyDatabasesResponse {
  authenticated: boolean
  connected: boolean
  databases: Record<string, DatabaseStatus>
  accessibleCount: number
  inaccessibleCount: number
  totalCount: number
  allAccessible: boolean
  error?: string
}

interface ForgeConnectionStatusProps {
  forgeType: string
  className?: string
}

export function ForgeConnectionStatus({ forgeType, className }: ForgeConnectionStatusProps) {
  const [status, setStatus] = useState<VerifyDatabasesResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const databaseName = FORGE_TO_DATABASE_MAP[forgeType] || "Unknown"

  useEffect(() => {
    checkConnection()
  }, [forgeType])

  const checkConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/notion/verify-databases")
      const data = await response.json()

      if (!response.ok) {
        console.error("[Authority] Verify databases API error:", response.status, data)
        setStatus({
          authenticated: data.authenticated || false,
          connected: false,
          error: data.error || `HTTP ${response.status}: ${data.message || 'Unknown error'}`,
          databases: data.databases || {},
          accessibleCount: data.accessibleCount || 0,
          inaccessibleCount: data.inaccessibleCount || 0,
          totalCount: data.totalCount || 13,
          allAccessible: false,
        })
        return
      }

      setStatus(data)
    } catch (error: any) {
      console.error("[Authority] Error verifying Notion databases:", error)
      setStatus({
        authenticated: false,
        connected: false,
        error: error.message || "Connection failed. Check your Notion integration.",
        databases: {},
        accessibleCount: 0,
        inaccessibleCount: 0,
        totalCount: 13,
        allAccessible: false,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Badge variant="outline" className={cn("border-zinc-700 text-zinc-400", className)}>
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Checking...
      </Badge>
    )
  }

  if (!status) {
    return null
  }

  // Get status for this specific database
  const databaseStatus = status.databases[databaseName]
  const isAuthenticated = status.authenticated
  const isConnected = status.connected
  const isAccessible = databaseStatus?.accessible || false
  const hasError = status.error || databaseStatus?.error

  const getStatusConfig = () => {
    if (!isAuthenticated || !isConnected || hasError) {
      return {
        icon: XCircle,
        color: "bg-red-600/20 text-red-400 border-red-600/50 hover:bg-red-600/30",
        text: "Not Linked",
        tooltip: hasError || "Notion connection failed. Go to Settings → Notion to connect.",
      }
    }

    if (isAccessible) {
      return {
        icon: CheckCircle2,
        color: "bg-green-600/20 text-green-400 border-green-600/50 hover:bg-green-600/30 shadow-lg shadow-green-600/20",
        text: "Connected",
        tooltip: `Connected to ${databaseName} database. Click to refresh.`,
      }
    }

    return {
      icon: AlertCircle,
      color: "bg-yellow-600/20 text-yellow-400 border-yellow-600/50 hover:bg-yellow-600/30",
      text: "Not Linked",
      tooltip: databaseStatus?.error || `Database "${databaseName}" not found. Go to Settings → Notion → Sync Databases.`,
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    checkConnection()
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 px-2 py-1 backdrop-blur-md border cursor-pointer transition-all",
              config.color,
              className,
            )}
            onClick={handleClick}
          >
            <Icon className="h-3 w-3" />
            <span className="text-xs font-medium">{config.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/50">
          <div className="space-y-2">
            <p className="font-semibold">{config.tooltip}</p>
            {databaseStatus?.id && (
              <p className="text-xs text-zinc-400 font-mono">{databaseStatus.id.substring(0, 8)}...</p>
            )}
            {!isAccessible && isAuthenticated && (
              <p className="text-xs text-yellow-400 mt-2">
                💡 Go to Settings → Notion → Sync Databases to link this Forge.
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-zinc-700">
              Click to refresh status
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

