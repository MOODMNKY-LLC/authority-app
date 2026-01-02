"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ImageIcon, 
  Search, 
  X, 
  ZoomIn, 
  Download, 
  ExternalLink,
  Filter,
  Loader2
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ImageItem {
  id: string
  notion_page_id?: string
  source: "notion" | "supabase"
  title: string
  description?: string
  prompt?: string
  url: string
  tags?: string[]
  model?: string
  created_at?: string
  updated_at?: string
  properties?: any
}

interface ImageGalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
}

export function ImageGallery({ open, onOpenChange, projectId }: ImageGalleryProps) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [filteredImages, setFilteredImages] = useState<ImageItem[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<"all" | "notion" | "supabase">("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadImages()
    } else {
      // Reset state when closed
      setImages([])
      setFilteredImages([])
      setSelectedImage(null)
      setSearchQuery("")
      setSourceFilter("all")
    }
  }, [open, projectId])

  useEffect(() => {
    // Filter images based on search and source
    let filtered = images

    // Filter by source
    if (sourceFilter !== "all") {
      filtered = filtered.filter((img) => img.source === sourceFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (img) =>
          img.title?.toLowerCase().includes(query) ||
          img.description?.toLowerCase().includes(query) ||
          img.prompt?.toLowerCase().includes(query) ||
          img.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    setFilteredImages(filtered)
  }, [images, searchQuery, sourceFilter])

  const loadImages = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (projectId) params.append("projectId", projectId)
      params.append("source", "all")

      const response = await fetch(`/api/notion/image-gallery?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setImages(data.images || [])
      } else {
        setError(data.error || "Failed to load images")
      }
    } catch (err: any) {
      console.error("[Authority] Error loading images:", err)
      setError(err.message || "Failed to load images")
    } finally {
      setLoading(false)
    }
  }

  const handleImageClick = (image: ImageItem) => {
    setSelectedImage(image)
  }

  const handleDownload = async (image: ImageItem) => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${image.title || "image"}.${image.url.split(".").pop()?.split("?")[0] || "png"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[Authority] Error downloading image:", err)
    }
  }

  const handleOpenInNotion = (image: ImageItem) => {
    if (image.notion_page_id) {
      window.open(`https://notion.so/${image.notion_page_id.replace(/-/g, "")}`, "_blank")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-red-500" />
              Image Gallery
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Browse and manage all your images from Notion and generated images
            </DialogDescription>
          </DialogHeader>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 pb-4 border-b border-zinc-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search images by title, description, prompt, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sourceFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("all")}
                className={sourceFilter === "all" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                All ({images.length})
              </Button>
              <Button
                variant={sourceFilter === "notion" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("notion")}
                className={sourceFilter === "notion" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                Notion ({images.filter((img) => img.source === "notion").length})
              </Button>
              <Button
                variant={sourceFilter === "supabase" ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter("supabase")}
                className={sourceFilter === "supabase" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                Generated ({images.filter((img) => img.source === "supabase").length})
              </Button>
            </div>
          </div>

          {/* Image Grid */}
          <ScrollArea className="h-[calc(90vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                <p className="text-red-500 mb-2">{error}</p>
                <Button onClick={loadImages} variant="outline" size="sm">
                  Retry
                </Button>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                <ImageIcon className="h-12 w-12 mb-4 text-zinc-600" />
                <p className="text-lg font-medium mb-2">No images found</p>
                <p className="text-sm">
                  {searchQuery || sourceFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Start generating images or sync your Notion Image Gallery"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {filteredImages.map((image) => (
                  <Card
                    key={image.id}
                    className="group relative overflow-hidden bg-zinc-900 border-zinc-800 hover:border-red-500/50 transition-all cursor-pointer"
                    onClick={() => handleImageClick(image)}
                  >
                    <div className="aspect-square relative">
                      <Image
                        src={image.url}
                        alt={image.title || "Image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <ZoomIn className="h-6 w-6 text-white" />
                      </div>
                      <Badge
                        className={cn(
                          "absolute top-2 right-2",
                          image.source === "notion"
                            ? "bg-blue-500/80 text-white"
                            : "bg-purple-500/80 text-white"
                        )}
                      >
                        {image.source === "notion" ? "Notion" : "AI"}
                      </Badge>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium text-white truncate mb-1">{image.title}</p>
                      {image.prompt && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{image.prompt}</p>
                      )}
                      {image.tags && image.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {image.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {image.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{image.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden bg-zinc-950 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">{selectedImage.title}</DialogTitle>
              {selectedImage.description && (
                <DialogDescription className="text-zinc-400">{selectedImage.description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="relative aspect-video mb-4 bg-zinc-900 rounded-lg overflow-hidden">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title || "Image"}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 80vw"
              />
            </div>
            <div className="space-y-4">
              {selectedImage.prompt && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-1">Prompt</h4>
                  <p className="text-sm text-zinc-400">{selectedImage.prompt}</p>
                </div>
              )}
              {selectedImage.tags && selectedImage.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedImage.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedImage.model && (
                <div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-1">Model</h4>
                  <p className="text-sm text-zinc-400">{selectedImage.model}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <Button onClick={() => handleDownload(selectedImage)} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                {selectedImage.notion_page_id && (
                  <Button onClick={() => handleOpenInNotion(selectedImage)} variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Notion
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

