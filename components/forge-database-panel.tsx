"use client"

import { useState, useEffect } from "react"
import { ForgeDatabaseSelector } from "@/components/forge-database-selector"
import { ExistingItemsList } from "@/components/forge-existing-items-list"
import { LinkStatusBadge } from "@/components/forge-link-status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"

interface ForgeInputs {
  characterName?: string
  characterDescription?: string
  characterAge?: string
  characterRole?: string
  worldName?: string
  worldConcept?: string
  worldTechLevel?: string
  worldTheme?: string
  storyTitle?: string
  storyPremise?: string
  storyGenre?: string
  storyTone?: string
  magicName?: string
  magicConcept?: string
  magicSource?: string
  magicCost?: string
  factionName?: string
  factionPurpose?: string
  factionType?: string
  factionPower?: string
  loreName?: string
  loreOverview?: string
  loreTimePeriod?: string
  loreSignificance?: string
}

interface NotionItem {
  id: string
  notion_page_id: string
  notion_database_id: string
  title: string
  description?: string
}

interface ForgeDatabasePanelProps {
  forgeType: "character" | "world" | "storyline" | "magic" | "faction" | "lore"
  forgeData: ForgeInputs
  onLinkComplete?: (notionPageId: string, databaseId: string) => void
  disabled?: boolean
}

export function ForgeDatabasePanel({
  forgeType,
  forgeData,
  onLinkComplete,
  disabled = false,
}: ForgeDatabasePanelProps) {
  const { toast } = useToast()
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | undefined>()
  const [linkMode, setLinkMode] = useState<"create" | "link">("create")
  const [selectedItem, setSelectedItem] = useState<NotionItem | null>(null)
  const [notionPageId, setNotionPageId] = useState<string | undefined>()
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>()
  const [linkStatus, setLinkStatus] = useState<"synced" | "pending" | "error" | "not_linked">("not_linked")
  const [refreshing, setRefreshing] = useState(false)

  const handleDatabaseSelect = (databaseId: string) => {
    setSelectedDatabaseId(databaseId)
    // Reset selected item when database changes
    setSelectedItem(null)
  }

  const handleItemSelect = (item: NotionItem) => {
    setSelectedItem(item)
    setNotionPageId(item.notion_page_id)
    setLinkStatus("synced")
    setLastSyncedAt(item.last_synced_at || item.updated_at)
  }

  const handleCreateLink = async () => {
    if (!selectedDatabaseId) {
      toast({
        title: "Database Required",
        description: "Please select a Notion database first.",
        variant: "destructive",
      })
      return
    }

    if (linkMode === "link" && !selectedItem) {
      toast({
        title: "Item Required",
        description: "Please select an existing item to link to.",
        variant: "destructive",
      })
      return
    }

    setLinkStatus("pending")

    try {
      if (linkMode === "create") {
        // Create new Notion page
        const response = await fetch("/api/notion/forge/create-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forgeType,
            databaseId: selectedDatabaseId,
            forgeData,
            linkToSupabase: false,
          }),
        })

        const data = await response.json()

        if (data.success) {
          setNotionPageId(data.notion_page_id)
          setLinkStatus("synced")
          setLastSyncedAt(new Date().toISOString())
          toast({
            title: "Linked Successfully",
            description: "Content has been linked to Notion.",
          })
          onLinkComplete?.(data.notion_page_id, data.notion_database_id)
        } else {
          throw new Error(data.error || "Failed to create link")
        }
      } else {
        // Link to existing item
        if (!selectedItem) return

        const response = await fetch("/api/notion/forge/link-existing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forgeType,
            notionPageId: selectedItem.notion_page_id,
          }),
        })

        const data = await response.json()

        if (data.success) {
          setLinkStatus("synced")
          setLastSyncedAt(new Date().toISOString())
          toast({
            title: "Linked Successfully",
            description: "Content has been linked to existing Notion page.",
          })
          onLinkComplete?.(data.notion_page_id, selectedItem.notion_database_id)
        } else {
          throw new Error(data.error || "Failed to link")
        }
      }
    } catch (error: any) {
      console.error("[Authority] Error creating link:", error)
      setLinkStatus("error")
      toast({
        title: "Link Failed",
        description: error.message || "Failed to link to Notion.",
        variant: "destructive",
      })
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    // Refresh sync status by checking the item
    if (notionPageId) {
      // Could implement a status check endpoint here
      setTimeout(() => {
        setRefreshing(false)
      }, 1000)
    } else {
      setRefreshing(false)
    }
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white">Notion Database Linking</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Link your generated content to Notion for organization and collaboration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgeDatabaseSelector
          forgeType={forgeType}
          selectedDatabaseId={selectedDatabaseId}
          onDatabaseSelect={handleDatabaseSelect}
          linkMode={linkMode}
          onLinkModeChange={setLinkMode}
          disabled={disabled}
        />

        {selectedDatabaseId && linkMode === "link" && (
          <>
            <Separator className="bg-zinc-800" />
            <ExistingItemsList
              forgeType={forgeType}
              databaseId={selectedDatabaseId}
              onItemSelect={handleItemSelect}
              selectedItemId={selectedItem?.id}
            />
          </>
        )}

        {(selectedDatabaseId || notionPageId) && (
          <>
            <Separator className="bg-zinc-800" />
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-zinc-400 mb-2">Link Status</p>
                <LinkStatusBadge
                  notionPageId={notionPageId}
                  lastSyncedAt={lastSyncedAt}
                  status={linkStatus}
                  onRefresh={handleRefresh}
                  refreshing={refreshing}
                />
              </div>
              {selectedDatabaseId && linkStatus === "not_linked" && (
                <button
                  onClick={handleCreateLink}
                  disabled={disabled || (linkMode === "link" && !selectedItem)}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {linkMode === "create" ? "Create & Link" : "Link Selected"}
                </button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}



