"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Search, ExternalLink, Loader2, FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DatabaseItem {
  id: string
  notion_page_id: string
  notion_database_id: string
  title: string
  description: string
  properties: Record<string, any>
  created_at: string
  updated_at: string
  last_synced_at: string
}

interface ForgeDatabaseContentProps {
  forgeType: string
  onItemSelect?: (notionPageId: string) => void
  className?: string
}

export function ForgeDatabaseContent({ forgeType, onItemSelect, className }: ForgeDatabaseContentProps) {
  const [items, setItems] = useState<DatabaseItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadItems()
  }, [forgeType, page, searchQuery])

  const loadItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("forgeType", forgeType)
      params.append("page", page.toString())
      params.append("limit", "20")
      if (searchQuery) params.append("search", searchQuery)

      const response = await fetch(`/api/notion/forge/database-content?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setItems(data.items || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error("[Authority] Error loading database content:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenInNotion = (pageId: string) => {
    const cleanId = pageId.replace(/-/g, "")
    window.open(`https://notion.so/${cleanId}`, "_blank")
  }

  const formatProperty = (prop: any): string => {
    if (!prop) return ""
    if (typeof prop === "string") return prop
    if (prop.rich_text) {
      return prop.rich_text.map((t: any) => t.plain_text).join("")
    }
    if (prop.select) return prop.select.name || ""
    if (prop.multi_select) {
      return prop.multi_select.map((s: any) => s.name).join(", ")
    }
    if (prop.number) return prop.number.toString()
    if (prop.date) return prop.date.start || ""
    return JSON.stringify(prop)
  }

  return (
    <Card className={cn(
      "backdrop-blur-md backdrop-saturate-150",
      "bg-black/30 border border-zinc-800/50",
      "shadow-lg shadow-black/20",
      className
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Database Content
            </CardTitle>
            <CardDescription>
              {total > 0 ? `${total} items` : "No items found"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="pl-8 w-64 backdrop-blur-md bg-black/20 border-zinc-800/50"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card
                key={i}
                className="backdrop-blur-md bg-black/20 border-zinc-800/30"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items found in database</p>
            {searchQuery && (
              <p className="text-sm mt-2">Try a different search term</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="backdrop-blur-md bg-black/20 border-zinc-800/30 hover:border-zinc-700/50 transition-all cursor-pointer group"
                  onClick={() => {
                    if (onItemSelect) {
                      onItemSelect(item.notion_page_id)
                    } else {
                      handleOpenInNotion(item.notion_page_id)
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1 group-hover:text-red-400 transition-colors">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(item.properties).slice(0, 3).map(([key, value]) => {
                            const formatted = formatProperty(value)
                            if (!formatted) return null
                            return (
                              <Badge
                                key={key}
                                variant="outline"
                                className="text-xs backdrop-blur-md bg-black/20 border-zinc-800/50"
                              >
                                {key}: {formatted.length > 20 ? `${formatted.substring(0, 20)}...` : formatted}
                              </Badge>
                            )
                          })}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">
                          Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenInNotion(item.notion_page_id)
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="backdrop-blur-md bg-black/20 border-zinc-800/50"
                >
                  Previous
                </Button>
                <span className="text-sm text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="backdrop-blur-md bg-black/20 border-zinc-800/50"
                >
                  Next
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

