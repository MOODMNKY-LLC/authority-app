"use client"

import { useState, useEffect, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Search,
  ExternalLink,
  Loader2,
  FileText,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react"
import { NotionPagePreview } from "@/components/notion-page-preview"
import { formatDistanceToNow } from "date-fns"
import { format } from "date-fns"

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

interface NotionProperty {
  id: string
  type: string
  name: string
  options?: Array<{ id?: string; name: string; color?: string }>
  format?: string
}

interface DatabaseSchema {
  success: boolean
  properties: Record<string, NotionProperty>
}

interface ForgeDatabaseTableProps {
  forgeType: string
  onItemSelect?: (notionPageId: string) => void
  className?: string
}

export function ForgeDatabaseTable({ forgeType, onItemSelect, className }: ForgeDatabaseTableProps) {
  const [items, setItems] = useState<DatabaseItem[]>([])
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [previewPageId, setPreviewPageId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    loadSchemaAndData()
  }, [forgeType])

  const loadSchemaAndData = async () => {
    setLoading(true)
    try {
      // Load schema first
      const schemaResponse = await fetch(`/api/notion/forge/database-schema?forgeType=${forgeType}`)
      const schemaData = await schemaResponse.json()

      if (schemaData.success) {
        setSchema(schemaData)
      }

      // Load items
      const itemsResponse = await fetch(
        `/api/notion/forge/database-content?forgeType=${forgeType}&limit=100`
      )
      const itemsData = await itemsResponse.json()

      if (itemsData.success) {
        setItems(itemsData.items || [])
      }
    } catch (error) {
      console.error("[Authority] Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatPropertyValue = (value: any, propertyType: string): string => {
    if (value === null || value === undefined || value === "") return "-"

    switch (propertyType) {
      case "title":
        return typeof value === "string" ? value : value?.plain_text || "-"
      case "rich_text":
        if (Array.isArray(value)) {
          return value.map((t: any) => t.plain_text || t.text || "").join("")
        }
        return String(value)
      case "number":
        return typeof value === "number" ? value.toString() : String(value)
      case "select":
        return value?.name || value || "-"
      case "multi_select":
        if (Array.isArray(value)) {
          return value.map((s: any) => s.name || s).join(", ")
        }
        return String(value)
      case "date":
        if (value?.start) {
          try {
            return format(new Date(value.start), "MMM d, yyyy")
          } catch {
            return value.start
          }
        }
        return "-"
      case "checkbox":
        return value ? "Yes" : "No"
      case "url":
        return value || "-"
      case "email":
        return value || "-"
      case "phone_number":
        return value || "-"
      default:
        return String(value)
    }
  }

  const getPropertyValue = (item: DatabaseItem, propertyName: string): any => {
    const props = item.properties || {}
    return props[propertyName]
  }

  // Generate columns dynamically from schema
  const columns = useMemo<ColumnDef<DatabaseItem>[]>(() => {
    if (!schema || !schema.success) {
      return [
        {
          accessorKey: "title",
          header: "Title",
          cell: ({ row }) => row.original.title,
        },
      ]
    }

    const cols: ColumnDef<DatabaseItem>[] = []

    // Title column first (always)
    const titleProperty = Object.entries(schema.properties).find(
      ([_, prop]) => prop.type === "title"
    )
    if (titleProperty) {
      cols.push({
        accessorKey: "title",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 lg:px-3"
            >
              {titleProperty[0]}
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="font-medium max-w-[200px] truncate">{row.original.title}</div>
        ),
      })
    }

    // Add other properties as columns
    Object.entries(schema.properties).forEach(([propertyName, property]) => {
      if (property.type === "title") return // Already added

      cols.push({
        accessorKey: `properties.${propertyName}`,
        id: propertyName,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 lg:px-3"
            >
              {propertyName}
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const value = getPropertyValue(row.original, propertyName)
          const formatted = formatPropertyValue(value, property.type)

          // Special rendering for multi_select
          if (property.type === "multi_select" && Array.isArray(value)) {
            return (
              <div className="flex flex-wrap gap-1">
                {value.slice(0, 3).map((item: any, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs backdrop-blur-md bg-black/20 border-zinc-800/50"
                  >
                    {item.name || item}
                  </Badge>
                ))}
                {value.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{value.length - 3}
                  </Badge>
                )}
              </div>
            )
          }

          // Special rendering for checkbox
          if (property.type === "checkbox") {
            return (
              <Badge
                variant={value ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  value
                    ? "bg-green-600/20 text-green-400 border-green-600/30"
                    : "backdrop-blur-md bg-black/20 border-zinc-800/50"
                )}
              >
                {formatted}
              </Badge>
            )
          }

          return (
            <div className="max-w-[200px] truncate text-sm" title={formatted}>
              {formatted}
            </div>
          )
        },
      })
    })

    // Actions column
    cols.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-2">
            {onItemSelect && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onItemSelect(item.notion_page_id)}
                className="h-8 w-8"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setPreviewPageId(item.notion_page_id)
                setPreviewOpen(true)
              }}
              className="h-8 w-8"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const cleanId = item.notion_page_id.replace(/-/g, "")
                window.open(`https://notion.so/${cleanId}`, "_blank")
              }}
              className="h-8 w-8"
              title="Open in Notion"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    })

    return cols
  }, [schema, onItemSelect])

  // Custom global filter function
  const globalFilterFn: FilterFn<DatabaseItem> = (row, columnId, filterValue: string) => {
    if (!filterValue) return true
    
    const searchLower = filterValue.toLowerCase()
    const item = row.original
    
    // Search in title
    if (item.title?.toLowerCase().includes(searchLower)) return true
    
    // Search in description
    if (item.description?.toLowerCase().includes(searchLower)) return true
    
    // Search in all properties
    if (item.properties) {
      for (const [key, value] of Object.entries(item.properties)) {
        const formatted = formatPropertyValue(value, schema?.properties?.[key]?.type || "rich_text")
        if (formatted.toLowerCase().includes(searchLower)) return true
      }
    }
    
    return false
  }

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn,
    state: {
      sorting,
      columnFilters,
      globalFilter: searchQuery,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  if (loading) {
    return (
      <Card className={cn(
        "backdrop-blur-md backdrop-saturate-150",
        "bg-black/30 border border-zinc-800/50",
        "shadow-lg shadow-black/20",
        className
      )}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
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
              {items.length} {items.length === 1 ? "item" : "items"} • All properties visible
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-64 backdrop-blur-md bg-black/20 border-zinc-800/50"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSchemaAndData}
              className="backdrop-blur-md bg-black/20 border-zinc-800/50"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items found in database</p>
            <p className="text-sm mt-2">Create your first item using the Create tab</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[600px] w-full rounded-md border border-zinc-800/50">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow
                      key={headerGroup.id}
                      className="border-zinc-800/50 hover:bg-zinc-900/20"
                    >
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="backdrop-blur-md bg-black/20"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="border-zinc-800/30 hover:bg-zinc-900/30 cursor-pointer transition-colors"
                        onClick={() => {
                          if (onItemSelect) {
                            onItemSelect(row.original.notion_page_id)
                          }
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="backdrop-blur-sm bg-black/10"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-zinc-400">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  items.length
                )}{" "}
                of {items.length} items
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="backdrop-blur-md bg-black/20 border-zinc-800/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm text-zinc-400">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="backdrop-blur-md bg-black/20 border-zinc-800/50"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Notion Page Preview */}
      {previewPageId && (
        <NotionPagePreview
          pageId={previewPageId}
          databaseId={items.find((i) => i.notion_page_id === previewPageId)?.notion_database_id}
          databaseName={forgeType}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </Card>
  )
}

