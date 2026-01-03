"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Database,
  Clock,
  Info,
  HelpCircle,
  BookOpen,
  AlertCircle,
  Activity,
} from "lucide-react"
import { NotionSyncButton } from "@/components/notion-sync-button"
import { NotionSyncIndicator } from "@/components/notion-sync-indicator"
import { NotionSeedSection } from "@/components/notion-seed-section"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

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

interface SyncedDatabase {
  id: string
  name: string
  pageCount?: number
  syncedPageCount?: number
  samplePages?: Array<{
    id: string
    title: string
    lastEdited: string
    url: string
  }>
  isCore?: boolean
  lastSynced?: string
  health?: "healthy" | "stale" | "never_synced" | "error"
  propertyCompleteness?: number | null // Percentage
  status?: "synced" | "pending" | "error" | "syncing"
  description?: string
  progress?: number
}

interface ConnectionStatus {
  authenticated: boolean
  canSync?: boolean
  databases?: {
    status: Record<string, { synced: boolean; id: string | null }>
    syncedCount: number
    totalCount: number
    allDatabases: Record<string, string>
  }
}

export function NotionSyncSection() {
  const { toast } = useToast()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncedDatabases, setSyncedDatabases] = useState<Record<string, SyncedDatabase>>({})
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<Record<string, number>>({})
  const [currentSyncingDatabase, setCurrentSyncingDatabase] = useState<string | null>(null)
  const [syncStep, setSyncStep] = useState<"idle" | "validating" | "discovering" | "syncing" | "complete">("idle")
  const [cachingSchemas, setCachingSchemas] = useState(false)
  const [cachedSchemas, setCachedSchemas] = useState<Array<{ database_name: string; property_count: number; last_updated: string; properties?: string[] }>>([])
  const [syncHealth, setSyncHealth] = useState<Record<string, {
    databaseId: string
    databaseName: string
    lastSynced: string | null
    health: "healthy" | "stale" | "never_synced" | "error"
    pageCount: number
    syncedPageCount: number
    propertyCompleteness: number | null
    status: "synced" | "pending" | "error"
  }>>({})

  const loadCachedSchemas = async () => {
    try {
      const response = await fetch("/api/notion/cache-schemas")
      if (response.ok) {
        const data = await response.json()
        console.log("[Authority] Load cached schemas response:", data)
        if (data.success && data.schemas && Array.isArray(data.schemas)) {
          console.log(`[Authority] Setting ${data.schemas.length} cached schemas`)
          setCachedSchemas(data.schemas)
        } else {
          console.warn("[Authority] No schemas in response or invalid format:", data)
          setCachedSchemas([])
        }
      } else {
        console.error("[Authority] Failed to load cached schemas:", response.status, response.statusText)
        setCachedSchemas([])
      }
    } catch (error) {
      console.error("Failed to load cached schemas:", error)
      setCachedSchemas([])
    }
  }

  const handleCacheSchemas = async () => {
    setCachingSchemas(true)
    try {
      const response = await fetch("/api/notion/cache-schemas", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        // Show success even for partial success
        const summary = data.summary
        const title = summary?.cached === summary?.total 
          ? "All Schemas Cached" 
          : `Schemas Cached (${summary?.cached || 0}/${summary?.total || 0})`
        
        toast({
          title,
          description: data.message || "Database schemas cached successfully",
        })
        
        // Wait a moment for database to update, then reload schemas
        await new Promise(resolve => setTimeout(resolve, 500))
        await loadCachedSchemas()
      } else {
        // Only show error if NO schemas were cached
        toast({
          title: "Cache Failed",
          description: data.error || "Failed to cache schemas",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cache schemas",
        variant: "destructive",
      })
    } finally {
      setCachingSchemas(false)
    }
  }

  const fetchSyncHealth = async () => {
    try {
      const response = await fetch("/api/notion/sync-health")
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.healthStatus) {
          setSyncHealth(data.healthStatus)
          
          // Merge health data into synced databases, but preserve sync state if currently syncing
          setSyncedDatabases((prev) => {
            const updated = { ...prev }
            Object.entries(data.healthStatus).forEach(([name, health]: [string, any]) => {
              // Don't overwrite if this database is currently syncing
              if (updated[name]?.status === "syncing") {
                return // Skip this database - preserve sync state
              }
              
              if (updated[name]) {
                // Merge health data but preserve existing sync state if it's "synced"
                updated[name] = {
                  ...updated[name],
                  lastSynced: health.lastSynced || updated[name].lastSynced, // Use health lastSynced if available, otherwise keep existing
                  health: health.health,
                  propertyCompleteness: health.propertyCompleteness,
                  pageCount: health.pageCount ?? updated[name].pageCount, // Use health pageCount if available
                  syncedPageCount: health.syncedPageCount,
                  // Only update status if health has a valid status and current status isn't "synced" (preserve successful syncs)
                  status: updated[name].status === "synced" ? "synced" : health.status,
                }
              } else {
                updated[name] = {
                  id: health.databaseId,
                  name: health.databaseName,
                  lastSynced: health.lastSynced,
                  health: health.health,
                  propertyCompleteness: health.propertyCompleteness,
                  pageCount: health.pageCount,
                  syncedPageCount: health.syncedPageCount,
                  status: health.status,
                  progress: health.status === "synced" ? 100 : 0,
                }
              }
            })
            return updated
          })
        }
      }
    } catch (error: any) {
      console.error("[Authority] Error fetching sync health:", error)
    }
  }

  const fetchSyncData = async () => {
    try {
      const response = await fetch("/api/notion/connection-status")
      const data = await response.json()
      setConnectionStatus(data)
      
      // Only fetch connection status - don't trigger automatic sync
      // Sync is now manual-only via the "Sync Databases" button
      if (data.databases?.allDatabases) {
        const formatted: Record<string, SyncedDatabase> = {}
        Object.entries(data.databases.allDatabases).forEach(([name, id]: [string, any]) => {
          const isCore = ALL_CORE_DATABASES.includes(name)
          formatted[name] = {
            id: id as string,
            name: name,
            status: "synced" as const,
            progress: 100,
            isCore: isCore,
          }
        })
        setSyncedDatabases(formatted)
      }
      
      // Fetch health status after populating databases
      await fetchSyncHealth()
    } catch (error: any) {
      console.error("[Authority] Error fetching sync data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSyncData()
    loadCachedSchemas()
    
    // Refresh health status every 30 seconds
    const healthInterval = setInterval(() => {
      fetchSyncHealth()
    }, 30000)
    
    return () => clearInterval(healthInterval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSyncData()
    await fetchSyncHealth()
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncProgress({})
    setSyncStep("validating")
    setCurrentSyncingDatabase(null)
    
    // Initialize all databases with 0% progress and "syncing" status
    const allDatabases = ALL_CORE_DATABASES
    const initialDatabases: Record<string, SyncedDatabase> = {}
    allDatabases.forEach((dbName) => {
      initialDatabases[dbName] = {
        id: "",
        name: dbName,
        status: "syncing",
        progress: 0,
        isCore: true,
      }
    })
    setSyncedDatabases(initialDatabases)

    try {
      setSyncStep("discovering")
      
      // Start sync API call
      const response = await fetch("/api/notion/sync-databases", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success && data.databases) {
        setSyncStep("syncing")
        
        // Process databases incrementally with progress simulation
        const databaseEntries = Object.entries(data.databases)
        const totalDatabases = databaseEntries.length
        
        for (let i = 0; i < databaseEntries.length; i++) {
          const [name, info]: [string, any] = databaseEntries[i]
          setCurrentSyncingDatabase(name)
          
          // Simulate progress for this database
          for (let progress = 0; progress <= 100; progress += 20) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            setSyncProgress((prev) => ({ ...prev, [name]: progress }))
          }
          
          // Update database status
          setSyncedDatabases((prev) => ({
            ...prev,
            [name]: {
              id: info.id,
              name: name,
              pageCount: info.pageCount,
              samplePages: data.databaseContents?.[name]?.samplePages,
              isCore: ALL_CORE_DATABASES.includes(name),
              status: "synced",
              lastSynced: new Date().toISOString(),
              progress: 100,
            },
          }))
        }
        
        setSyncStep("complete")
        setCurrentSyncingDatabase(null)
        
        // Don't fetch health immediately - give sync time to persist
        // Health check will update on next interval (30s) or manual refresh
        
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${totalDatabases} databases`,
        })
      } else {
        setSyncStep("idle")
        setCurrentSyncingDatabase(null)
        toast({
          title: "Sync Failed",
          description: data.error || "Failed to sync databases",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      setSyncStep("idle")
      setCurrentSyncingDatabase(null)
      toast({
        title: "Sync Error",
        description: error.message || "Failed to sync databases",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
      // Don't clear progress immediately - let user see completion
      setTimeout(() => {
        setSyncProgress({})
        setSyncStep("idle")
      }, 2000)
    }
  }

  const syncedCount = Object.keys(syncedDatabases).filter(
    (name) => syncedDatabases[name]?.status === "synced"
  ).length
  const totalCount = connectionStatus?.databases?.totalCount || ALL_CORE_DATABASES.length
  const syncingCount = Object.keys(syncedDatabases).filter(
    (name) => syncedDatabases[name]?.status === "syncing"
  ).length
  
  // Calculate overall progress
  const overallProgress = syncing
    ? Math.round(
        (Object.values(syncedDatabases).reduce(
          (sum, db) => sum + (syncProgress[db.name] || 0),
          0
        ) / (totalCount * 100)) * 100
      )
    : syncedCount > 0
      ? Math.round((syncedCount / totalCount) * 100)
      : 0
  
  const databasesArray = Object.values(syncedDatabases)

  if (loading && !syncing) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">Sync Progress</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Overall Sync Progress</p>
                  <p className="text-xs">
                    Shows the overall progress of syncing databases from your Authority template.
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
          <CardDescription>
            {syncedCount} of {totalCount} databases synced
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Overall Progress</span>
              <span className="text-white font-semibold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            
            {/* Sync Status Text */}
            {syncing && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                <span>
                  {syncStep === "validating" && "Validating connection..."}
                  {syncStep === "discovering" && "Discovering databases..."}
                  {syncStep === "syncing" && currentSyncingDatabase && (
                    <>Syncing database: <span className="text-white font-medium">{currentSyncingDatabase}</span> ({syncedCount + 1} of {totalCount})</>
                  )}
                  {syncStep === "complete" && "Sync complete!"}
                </span>
              </div>
            )}
            
            {!syncing && syncedCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <CheckCircle2 className="h-3 w-3 text-green-400" />
                <span>{syncedCount} of {totalCount} databases synced</span>
              </div>
            )}
          </div>

          <NotionSyncButton
            onSyncComplete={async () => {
              await fetchSyncData()
            }}
          />
        </CardContent>
      </Card>

      {/* Database Sync Table */}
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-red-500" />
              Database Sync Status
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Database Sync Status</p>
                <p className="text-xs">
                  Individual progress for each synced database. Scroll to see all databases.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription>
            {syncedCount} of {totalCount} databases synced
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full [&>[data-radix-scroll-area-viewport]]:scrollbar-hide">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50">
                  <TableHead className="w-12 text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Database</TableHead>
                  <TableHead className="text-zinc-400">Pages</TableHead>
                  <TableHead className="text-zinc-400">Health</TableHead>
                  <TableHead className="text-zinc-400">Last Synced</TableHead>
                  <TableHead className="text-right text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Show skeletons when syncing and no data yet */}
                {syncing && databasesArray.length === 0 ? (
                  ALL_CORE_DATABASES.map((dbName) => (
                    <TableRow key={dbName} className="border-zinc-800/50">
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-4 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // Show all databases (synced or pending)
                  (databasesArray.length > 0 ? databasesArray : ALL_CORE_DATABASES.map(name => ({ id: "", name, status: "pending" as const }))).map((db) => {
                    const isCore = db.isCore ?? ALL_CORE_DATABASES.includes(db.name)
                    const status = db.status || (db.id ? "synced" : "pending")
                    const progress = syncProgress[db.name] ?? (status === "synced" ? 100 : status === "syncing" ? 50 : 0)
                    const isCurrentlySyncing = currentSyncingDatabase === db.name && syncing
                    
                    return (
                      <TableRow
                        key={db.id || db.name}
                        className={cn(
                          "border-zinc-800/50 hover:bg-zinc-900/30 transition-colors",
                          isCurrentlySyncing && "bg-yellow-900/10 border-yellow-500/30"
                        )}
                      >
                        <TableCell>
                          {status === "syncing" && !db.id ? (
                            <Skeleton className="h-8 w-8 rounded-full" />
                          ) : (
                            <div className="flex items-center">
                              <AnimatedCircularProgressBar
                                value={progress}
                                gaugePrimaryColor={status === "synced" ? "#22c55e" : status === "syncing" ? "#eab308" : "#ef4444"}
                                gaugeSecondaryColor="#1f2937"
                                className="size-8"
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
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
                            {status === "synced" && <NotionSyncIndicator synced={true} />}
                          </div>
                        </TableCell>
                        <TableCell>
                          {db.pageCount !== undefined ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-zinc-400">
                                {db.syncedPageCount !== undefined ? `${db.syncedPageCount.toLocaleString()}/${db.pageCount.toLocaleString()}` : db.pageCount.toLocaleString()} {db.pageCount === 1 ? "page" : "pages"}
                              </span>
                              {db.propertyCompleteness !== null && db.propertyCompleteness !== undefined && (
                                <span className="text-[10px] text-zinc-500">
                                  {db.propertyCompleteness}% complete
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {db.health ? (
                            <div className="flex items-center gap-1.5">
                              {db.health === "healthy" && (
                                <div className="flex items-center gap-1">
                                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                  <span className="text-xs text-green-400">Healthy</span>
                                </div>
                              )}
                              {db.health === "stale" && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs text-yellow-400">Stale</span>
                                </div>
                              )}
                              {db.health === "never_synced" && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-zinc-500" />
                                  <span className="text-xs text-zinc-500">Never synced</span>
                                </div>
                              )}
                              {db.health === "error" && (
                                <div className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  <span className="text-xs text-red-400">Error</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {db.lastSynced ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-zinc-400 cursor-help">
                                  {new Date(db.lastSynced).toLocaleDateString()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {new Date(db.lastSynced).toLocaleString()}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {db.id ? (
                            <a
                              href={`https://notion.so/${db.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex"
                            >
                              <ExternalLink className="h-4 w-4 text-zinc-400 hover:text-red-400 transition-colors" />
                            </a>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                status === "synced"
                                  ? "bg-green-900/20 border-green-700 text-green-400"
                                  : status === "syncing"
                                    ? "bg-yellow-900/20 border-yellow-700 text-yellow-400"
                                    : "bg-zinc-900/20 border-zinc-700 text-zinc-400",
                              )}
                            >
                              {status === "synced"
                                ? "Synced"
                                : status === "syncing"
                                  ? "Syncing..."
                                  : "Pending"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Schema Cache Section */}
      {syncedCount > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-400" />
                  Database Schemas
                </CardTitle>
                <CardDescription className="text-zinc-400 mt-1">
                  Cache Notion database schemas for faster property mapping
                </CardDescription>
              </div>
              <Button
                onClick={handleCacheSchemas}
                disabled={cachingSchemas || !connectionStatus?.canSync}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {cachingSchemas ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Caching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Cache Schemas
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cachedSchemas.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-400 mb-3">
                  {cachedSchemas.length} database schema{cachedSchemas.length !== 1 ? "s" : ""} cached
                </p>
                <div className="space-y-2">
                  {cachedSchemas.map((schema) => {
                    const isStale = new Date(schema.last_updated).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
                    return (
                      <div
                        key={schema.database_name}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-white">{schema.database_name}</p>
                            {isStale && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-900/20 border-yellow-700 text-yellow-400">
                                Stale
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">
                            {schema.property_count} properties • Last updated: {new Date(schema.last_updated).toLocaleString()}
                          </p>
                          {schema.properties && schema.properties.length > 0 && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Properties: {schema.properties.slice(0, 3).join(", ")}{schema.properties.length > 3 ? ` +${schema.properties.length - 3} more` : ""}
                            </p>
                          )}
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400 mb-1">No schemas cached</p>
                <p className="text-xs text-zinc-500">
                  Click "Cache Schemas" to fetch and store database schemas for faster syncing
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seed Databases Section */}
      {syncedCount > 0 && (
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <NotionSeedSection />
        </Suspense>
      )}

    </div>
  )
}

