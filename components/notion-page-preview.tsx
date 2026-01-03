"use client"

import { useState, useEffect } from "react"
import { X, ExternalLink, Loader2, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface NotionPagePreviewProps {
  pageId: string
  databaseId?: string
  databaseName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotionPagePreview({
  pageId,
  databaseId,
  databaseName,
  open,
  onOpenChange,
}: NotionPagePreviewProps) {
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && pageId) {
      loadPreview()
    }
  }, [open, pageId])

  const loadPreview = async () => {
    setLoading(true)
    setError(null)

    try {
      // Try to get public page URL
      // Notion pages can be accessed via: https://www.notion.so/{pageId}
      // For authenticated previews, we'd need to use the Notion API
      const notionPageUrl = `https://www.notion.so/${pageId.replace(/-/g, "")}`

      // For now, we'll use an iframe approach
      // In production, you might want to use Notion's oEmbed API or render content client-side
      setPreviewUrl(notionPageUrl)
    } catch (err: any) {
      setError(err.message || "Failed to load preview")
    } finally {
      setLoading(false)
    }
  }

  const notionPageUrl = pageId ? `https://www.notion.so/${pageId.replace(/-/g, "")}` : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              Notion Page Preview
              {databaseName && (
                <span className="text-sm font-normal text-zinc-400">({databaseName})</span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {notionPageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(notionPageUrl, "_blank")}
                  className="border-zinc-800 hover:bg-zinc-800"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Notion
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-2">{error}</p>
              <p className="text-sm text-zinc-500">
                Unable to load preview. You can still open this page in Notion.
              </p>
            </div>
          ) : previewUrl ? (
            <div className="w-full h-[600px] border border-zinc-800 rounded-lg overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Notion Page Preview"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500">
              No preview available
            </div>
          )}
        </ScrollArea>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center">
            Preview may require the page to be publicly accessible or authenticated.
            Use "Open in Notion" for full editing capabilities.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}



