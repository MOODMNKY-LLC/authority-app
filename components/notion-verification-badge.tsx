"use client"

import { useState, useEffect, useRef } from "react"
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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

interface NotionVerificationBadgeProps {
  onOpenSettings?: () => void
}

export function NotionVerificationBadge({ onOpenSettings }: NotionVerificationBadgeProps = {}) {
  const [status, setStatus] = useState<VerifyDatabasesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkVerification = async () => {
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
      
      console.log("[Authority] Verify databases response:", data)
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

  useEffect(() => {
    // Initial check
    checkVerification()
    
    // Set up interval - clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // Refresh every 60 seconds
    intervalRef.current = setInterval(() => {
      checkVerification()
    }, 60000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Manual refresh on click
    checkVerification()
    // Optionally open settings after a short delay
    setTimeout(() => {
      onOpenSettings?.()
    }, 100)
  }

  if (loading) {
    return (
      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Checking...
      </Badge>
    )
  }

  if (!status) {
    return null
  }

  // Determine status using database ping results
  const isAuthenticated = status.authenticated
  const isConnected = status.connected
  const accessibleCount = status.accessibleCount || 0
  const inaccessibleCount = status.inaccessibleCount || 0
  const totalCount = status.totalCount || 13
  const allAccessible = status.allAccessible || false
  
  // Get accessible and inaccessible databases
  const accessibleDatabases = Object.entries(status.databases || {})
    .filter(([_, info]) => info.accessible)
    .map(([name, info]) => ({ name, ...info }))
  
  const inaccessibleDatabases = Object.entries(status.databases || {})
    .filter(([_, info]) => !info.accessible)
    .map(([name, info]) => ({ name, ...info }))

  const isFullySynced = isAuthenticated && isConnected && allAccessible && accessibleCount === totalCount
  const hasMissing = isAuthenticated && isConnected && inaccessibleCount > 0
  const isConnectionFailed = !isAuthenticated || !isConnected || status.error

  const getStatusColor = () => {
    if (isConnectionFailed) return "red" // Connection failure or no token
    if (hasMissing) return "yellow" // Some databases inaccessible
    if (isFullySynced) return "green" // All databases accessible
    return "red" // Default to red if no connection
  }

  const getIcon = () => {
    const color = getStatusColor()
    if (color === "green") {
      return <CheckCircle2 className="h-3 w-3 mr-1 text-green-400" />
    }
    if (color === "yellow") {
      return <AlertCircle className="h-3 w-3 mr-1 text-yellow-400" />
    }
    return <XCircle className="h-3 w-3 mr-1 text-red-400" />
  }

  const getBadgeText = () => {
    if (isFullySynced) {
      return "Notion - Fully Synced"
    }
    if (hasMissing) {
      return `Partially Synced (${inaccessibleCount} missing)`
    }
    if (isConnectionFailed) {
      return "Sync Failure"
    }
    return "Notion Setup"
  }

  const badgeText = getBadgeText()

  const statusColor = getStatusColor()
  const badgeClasses = cn(
    "cursor-pointer transition-all duration-300",
    statusColor === "green" &&
      "bg-green-600/20 text-green-400 border-green-600/50 hover:bg-green-600/30 shadow-lg shadow-green-600/20 animate-pulse",
    statusColor === "yellow" &&
      "bg-yellow-600/20 text-yellow-400 border-yellow-600/50 hover:bg-yellow-600/30",
    statusColor === "red" && "bg-red-600/20 text-red-400 border-red-600/50 hover:bg-red-600/30",
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn(badgeClasses, "min-h-[32px] touch-manipulation")} onClick={handleClick}>
          {getIcon()}
          <span className="text-xs md:text-sm">{badgeText}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/50 text-zinc-100">
        <div className="space-y-2">
          <p className="font-semibold">
            {isFullySynced
              ? "✓ Notion - Fully Synced"
              : hasMissing
                ? "⚠ Partially Synced - Databases Missing"
                : "✗ Sync Failure"}
          </p>
          
          {isFullySynced && (
            <p className="text-sm text-green-300">
              All {accessibleCount} databases verified and accessible. Notion integration is fully operational.
            </p>
          )}
          
          {hasMissing && (
            <div className="space-y-2">
              <p className="text-sm text-yellow-300">
                {accessibleCount} of {totalCount} databases are synced. {inaccessibleCount} database{inaccessibleCount !== 1 ? 's' : ''} missing.
              </p>
              <div className="mt-2">
                <p className="text-xs font-semibold mb-1 text-yellow-400">
                  Missing Databases ({inaccessibleDatabases.length}):
                </p>
                <ul className="text-xs list-disc list-inside space-y-0.5 text-zinc-300 max-h-32 overflow-y-auto">
                  {inaccessibleDatabases.map((db) => (
                    <li key={db.name} title={db.error}>
                      {db.name}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-yellow-400 mt-2">
                💡 <strong>Fix:</strong> Go to Settings → Notion and click "Sync Databases" to resync missing databases.
              </p>
            </div>
          )}
          
          {isConnectionFailed && (
            <div className="space-y-2">
              <p className="text-sm text-red-300">
                {status?.error || "Notion connection failed. Unable to verify database sync status."}
              </p>
              <div className="text-xs text-red-400 mt-2 p-2 bg-red-950/20 rounded border border-red-800/50">
                <p className="font-semibold mb-1">To fix sync failure:</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                  <li>Go to Settings → Notion</li>
                  <li>Verify your Notion OAuth connection or integration token</li>
                  <li>Click "Sync Databases" to refresh database connections</li>
                  <li>Ensure all required databases exist in your Notion workspace</li>
                </ol>
              </div>
            </div>
          )}
          
          {isConnected && !isConnectionFailed && (
            <div className="text-xs text-zinc-400">
              Connection: Active • Verified via API ping
            </div>
          )}
          
          <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-zinc-700">
            Auto-refreshes every 60 seconds • Click to refresh now or open Settings
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

