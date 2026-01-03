"use client"

import { useState, useEffect } from "react"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Plus, Link as LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatabaseInfo {
  id: string
  name: string
}

interface ForgeDatabaseSelectorProps {
  forgeType: "character" | "world" | "storyline" | "magic" | "faction" | "lore"
  selectedDatabaseId?: string
  onDatabaseSelect: (databaseId: string) => void
  linkMode: "create" | "link"
  onLinkModeChange: (mode: "create" | "link") => void
  disabled?: boolean
}

const FORGE_TO_DATABASE_MAP: Record<string, string> = {
  character: "Characters",
  world: "Worlds",
  storyline: "Stories",
  story: "Stories",
  magic: "Magic Systems",
  faction: "Factions & Organizations",
  lore: "Lore & History",
}

export function ForgeDatabaseSelector({
  forgeType,
  selectedDatabaseId,
  onDatabaseSelect,
  linkMode,
  onLinkModeChange,
  disabled = false,
}: ForgeDatabaseSelectorProps) {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [notionConfigured, setNotionConfigured] = useState(false)

  const targetDatabaseName = FORGE_TO_DATABASE_MAP[forgeType] || "Unknown"

  useEffect(() => {
    loadDatabases()
  }, [])

  const loadDatabases = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/notion/databases")
      const data = await response.json()

      if (data.success && data.configured) {
        setNotionConfigured(true)
        const dbMap = data.databases || {}
        
        // Find databases matching the target name
        const matchingDbs: DatabaseInfo[] = []
        Object.entries(dbMap).forEach(([name, info]: [string, any]) => {
          if (name === targetDatabaseName && info?.id) {
            matchingDbs.push({
              id: info.id,
              name: name,
            })
          }
        })

        setDatabases(matchingDbs)
      } else {
        setNotionConfigured(false)
      }
    } catch (error) {
      console.error("[Authority] Error loading databases:", error)
      setNotionConfigured(false)
    } finally {
      setLoading(false)
    }
  }

  const databaseOptions: ComboboxOption[] = databases.map((db) => ({
    value: db.id,
    label: db.name,
    description: `Notion database`,
  }))

  const selectedDatabase = databases.find((db) => db.id === selectedDatabaseId)

  if (!notionConfigured) {
    return (
      <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <p className="text-sm text-zinc-400">
          <Database className="inline h-4 w-4 mr-1" />
          Notion not configured. Connect your workspace in Settings to enable database linking.
        </p>
      </div>
    )
  }

  if (databases.length === 0) {
    return (
      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-sm text-yellow-400">
          <Database className="inline h-4 w-4 mr-1" />
          {targetDatabaseName} database not found. Please sync your Notion databases in Settings.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Database Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Database className="h-4 w-4" />
          Target Database
        </label>
        {databases.length === 1 ? (
          <div className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              {databases[0].name}
            </Badge>
            <span className="text-xs text-zinc-400">Auto-selected</span>
          </div>
        ) : (
          <Combobox
            options={databaseOptions}
            value={selectedDatabaseId}
            onValueChange={onDatabaseSelect}
            placeholder="Select database..."
            searchPlaceholder="Search databases..."
            className="bg-zinc-900 border-zinc-700"
            disabled={disabled}
          />
        )}
      </div>

      {/* Link Mode Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Link Mode</label>
        <Tabs value={linkMode} onValueChange={(v) => onLinkModeChange(v as "create" | "link")}>
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border-zinc-700">
            <TabsTrigger
              value="create"
              className={cn(
                "flex items-center gap-2",
                linkMode === "create" && "bg-red-600 text-white"
              )}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
              Create New
            </TabsTrigger>
            <TabsTrigger
              value="link"
              className={cn(
                "flex items-center gap-2",
                linkMode === "link" && "bg-red-600 text-white"
              )}
              disabled={disabled}
            >
              <LinkIcon className="h-4 w-4" />
              Link Existing
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {selectedDatabase && (
        <div className="p-2 bg-zinc-900/30 border border-zinc-800 rounded-md">
          <p className="text-xs text-zinc-400">
            {linkMode === "create"
              ? `New page will be created in "${selectedDatabase.name}"`
              : `Will link to existing page in "${selectedDatabase.name}"`}
          </p>
        </div>
      )}
    </div>
  )
}



