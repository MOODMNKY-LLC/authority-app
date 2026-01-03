"use client"

import { useState, useEffect } from "react"
import { ForgePropertyField } from "@/components/forge-property-field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Sparkles, Save, Loader2, Database } from "lucide-react"

interface NotionProperty {
  id: string
  type: string
  name: string
  options?: Array<{ id?: string; name: string; color?: string }>
  format?: string
}

interface DatabaseSchema {
  success: boolean
  databaseId: string
  databaseName: string
  forgeType: string
  properties: Record<string, NotionProperty>
}

interface ForgeDynamicFormProps {
  forgeType: string
  initialData?: Record<string, any>
  notionPageId?: string
  onSave?: (data: Record<string, any>) => Promise<void>
  className?: string
}

export function ForgeDynamicForm({
  forgeType,
  initialData,
  notionPageId,
  onSave,
  className,
}: ForgeDynamicFormProps) {
  const { toast } = useToast()
  const [schema, setSchema] = useState<DatabaseSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingItem, setLoadingItem] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {})
  const [currentNotionPageId, setCurrentNotionPageId] = useState<string | undefined>(notionPageId)

  useEffect(() => {
    loadSchema()
  }, [forgeType])

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  useEffect(() => {
    if (notionPageId && schema) {
      loadItemData(notionPageId)
    }
  }, [notionPageId, schema])

  const loadItemData = async (pageId: string) => {
    setLoadingItem(true)
    try {
      const response = await fetch(
        `/api/notion/forge/load-item?forgeType=${forgeType}&notionPageId=${pageId}`
      )
      const data = await response.json()

      if (data.success) {
        setFormData(data.formData)
        setCurrentNotionPageId(data.notionPageId)
      } else {
        toast({
          title: "Load Failed",
          description: data.error || "Failed to load item data",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load item",
        variant: "destructive",
      })
    } finally {
      setLoadingItem(false)
    }
  }

  const loadSchema = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/notion/forge/database-schema?forgeType=${forgeType}`)
      const data = await response.json()

      if (data.success) {
        setSchema(data)
        // Initialize form data with empty values for all properties
        const initialFormData: Record<string, any> = {}
        Object.entries(data.properties).forEach(([key, prop]) => {
          if (prop.type === "multi_select") {
            initialFormData[key] = []
          } else if (prop.type === "checkbox") {
            initialFormData[key] = false
          } else {
            initialFormData[key] = ""
          }
        })
        setFormData((prev) => ({ ...initialFormData, ...prev }))
      } else {
        console.error("[Authority] Schema load failed:", data)
        toast({
          title: "Database Not Connected",
          description: data.suggestion || data.error || "Failed to load database schema. Please ensure your Notion database is synced.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error: any) {
      console.error("[Authority] Error loading schema:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load database schema",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyChange = (propertyName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [propertyName]: value,
    }))
  }

  const handleSave = async () => {
    if (!schema) return

    // Validate required fields (title)
    const titleProperty = Object.entries(schema.properties).find(
      ([_, prop]) => prop.type === "title"
    )
    if (titleProperty && !formData[titleProperty[0]]) {
      toast({
        title: "Validation Error",
        description: `${titleProperty[0]} is required`,
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      if (onSave) {
        await onSave(formData)
      } else {
        // Default save behavior - call API endpoint
        const response = await fetch("/api/notion/forge/save-item", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            forgeType,
            formData,
            databaseId: schema.databaseId,
            notionPageId: currentNotionPageId,
          }),
        })

        const data = await response.json()

        if (data.success) {
          toast({
            title: "Success",
            description: data.message || "Item saved successfully",
          })
          // Update notion page ID if it was a new item
          if (data.notion_page_id && !currentNotionPageId) {
            setCurrentNotionPageId(data.notion_page_id)
          }
          // Only reset form if it was a new item (not editing)
          if (!currentNotionPageId) {
            const resetData: Record<string, any> = {}
            Object.entries(schema.properties).forEach(([key, prop]) => {
              if (prop.type === "multi_select") {
                resetData[key] = []
              } else if (prop.type === "checkbox") {
                resetData[key] = false
              } else {
                resetData[key] = ""
              }
            })
            setFormData(resetData)
          }
        } else {
          throw new Error(data.error || "Failed to save")
        }
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className={cn(
        "backdrop-blur-md backdrop-saturate-150",
        "bg-black/30 border border-red-900/30",
        "shadow-lg shadow-black/20",
        className
      )}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!schema || !schema.success) {
    return (
      <Card className={cn(
        "backdrop-blur-md backdrop-saturate-150",
        "bg-black/30 border border-yellow-900/30",
        "shadow-lg shadow-black/20",
        className
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-400">
            <Database className="h-5 w-5" />
            Database Not Connected
          </CardTitle>
          <CardDescription>
            Unable to load database schema. Please check your Notion integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-zinc-400">
            <p>To connect your database:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to Settings → Notion Integration</li>
              <li>Ensure your Notion workspace is connected</li>
              <li>Click "Sync Databases" to refresh database connections</li>
              <li>Verify the database exists in your Notion workspace</li>
            </ol>
          </div>
          <Button
            variant="outline"
            onClick={loadSchema}
            className="backdrop-blur-md bg-black/20 border-zinc-800/50"
          >
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Sort properties: title first, then others
  const sortedProperties = Object.entries(schema.properties).sort(([aKey, aProp], [bKey, bProp]) => {
    if (aProp.type === "title") return -1
    if (bProp.type === "title") return 1
    return aKey.localeCompare(bKey)
  })

  return (
    <Card className={cn(
      "backdrop-blur-md backdrop-saturate-150",
      "bg-black/30 border border-red-900/30",
      "shadow-lg shadow-black/20",
      className
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-red-500" />
          {currentNotionPageId
            ? `Edit ${schema.databaseName.replace("s", "").replace("& Organizations", "")}`
            : `Create New ${schema.databaseName.replace("s", "").replace("& Organizations", "")}`}
        </CardTitle>
        <CardDescription>
          Fill out all fields below. Fields marked with * are required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadingItem ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <ScrollArea className="max-h-[600px] pr-4">
            <div className="space-y-4">
              {sortedProperties.map(([propertyName, property]) => (
                <ForgePropertyField
                  key={property.id}
                  property={property}
                  value={formData[propertyName]}
                  onChange={(value) => handlePropertyChange(propertyName, value)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-zinc-800/50">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-red-600/80 hover:bg-red-600/90 border border-red-500/30 backdrop-blur-md transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {currentNotionPageId ? "Update" : "Save to Notion"}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setFormData({})}
            className="backdrop-blur-md bg-black/20 border-zinc-800/50"
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

