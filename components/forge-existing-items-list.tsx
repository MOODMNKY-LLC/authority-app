"use client"

import { useState, useEffect } from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Database, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface NotionItem {
  id: string
  notion_page_id: string
  notion_database_id: string
  title: string
  description?: string
  properties?: Record<string, any>
  last_synced_at?: string
  updated_at?: string
}

interface ExistingItemsListProps {
  forgeType: "character" | "world" | "storyline" | "magic" | "faction" | "lore"
  databaseId?: string
  onItemSelect: (item: NotionItem) => void
  selectedItemId?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ExistingItemsList({
  forgeType,
  databaseId,
  onItemSelect,
  selectedItemId,
  open,
  onOpenChange,
}: ExistingItemsListProps) {
  const [items, setItems] = useState<NotionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (open) {
      loadItems()
    }
  }, [open, databaseId, forgeType])

  const loadItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("forgeType", forgeType)
      if (databaseId) params.append("databaseId", databaseId)
      if (searchQuery) params.append("search", searchQuery)

      const response = await fetch(`/api/notion/forge/query-items?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setItems(data.items || [])
      }
    } catch (error) {
      console.error("[Authority] Error loading existing items:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        loadItems()
      }, 300) // Debounce search
      return () => clearTimeout(timeoutId)
    } else {
      loadItems()
    }
  }, [searchQuery])

  const handleItemSelect = (item: NotionItem) => {
    onItemSelect(item)
    onOpenChange?.(false)
  }

  const handleOpenInNotion = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation()
    const cleanId = pageId.replace(/-/g, "")
    window.open(`https://notion.so/${cleanId}`, "_blank")
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <Database className="mr-2 h-4 w-4" />
          {selectedItemId
            ? items.find((i) => i.id === selectedItemId)?.title || "Select existing item..."
            : "Link to existing item..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-zinc-950 border-zinc-800" align="start">
        <Command className="bg-zinc-950">
          <CommandInput
            placeholder="Search items..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="bg-zinc-900 border-zinc-800"
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-red-500" />
              </div>
            ) : items.length === 0 ? (
              <CommandEmpty className="py-8 text-zinc-400">
                {searchQuery ? "No items found matching your search." : "No existing items found."}
              </CommandEmpty>
            ) : (
              <ScrollArea className="h-[300px]">
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.title}
                      onSelect={() => handleItemSelect(item)}
                      className={cn(
                        "flex items-start gap-2 p-3 cursor-pointer",
                        selectedItemId === item.id && "bg-zinc-800"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white truncate">{item.title}</span>
                          {item.last_synced_at && (
                            <Badge variant="secondary" className="text-xs">
                              {formatTimeAgo(item.last_synced_at)}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={(e) => handleOpenInNotion(e, item.notion_page_id)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

