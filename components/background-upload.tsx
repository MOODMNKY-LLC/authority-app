"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface BackgroundUploadProps {
  onUploadComplete?: (url: string) => void
  maxSizeMB?: number
}

export function BackgroundUpload({ onUploadComplete, maxSizeMB = 10 }: BackgroundUploadProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, WebP, or GIF image.",
        variant: "destructive",
      })
      return
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      toast({
        title: "File Too Large",
        description: `Please upload an image smaller than ${maxSizeMB}MB.`,
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("You must be logged in to upload backgrounds.")
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("user-backgrounds")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        // If bucket doesn't exist, create it first (this would typically be done via migration)
        if (uploadError.message.includes("Bucket not found")) {
          toast({
            title: "Storage Not Configured",
            description: "Please contact an administrator to set up background storage.",
            variant: "destructive",
          })
          return
        }
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("user-backgrounds").getPublicUrl(fileName)

      // Add to user's custom_backgrounds array
      const { data: settings } = await supabase
        .from("user_settings")
        .select("custom_backgrounds")
        .eq("user_id", user.id)
        .single()

      const customBackgrounds = (settings?.custom_backgrounds as string[]) || []
      const updatedBackgrounds = [...customBackgrounds, publicUrl]

      const { error: updateError } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            custom_backgrounds: updatedBackgrounds,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )

      if (updateError) throw updateError

      toast({
        title: "Upload Successful",
        description: "Background image uploaded successfully.",
      })

      onUploadComplete?.(publicUrl)
    } catch (error: any) {
      console.error("[Authority] Error uploading background:", error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload background image.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0])
      }
    },
    [maxSizeMB],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 transition-colors",
        dragActive ? "border-red-500 bg-red-900/10" : "border-zinc-800 bg-zinc-900/30",
        uploading && "opacity-50",
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
        disabled={uploading}
      />

      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {uploading ? (
          <>
            <Loader2 className="h-12 w-12 text-red-500 animate-spin" />
            <p className="text-sm text-zinc-400">Uploading...</p>
          </>
        ) : (
          <>
            <div className="rounded-full bg-zinc-800 p-4">
              <ImageIcon className="h-8 w-8 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-1">
                <span className="hidden md:inline">Drag and drop an image here, or </span>
                <span className="md:hidden">Tap to </span>
                <span className="md:hidden">select an image</span>
                <span className="hidden md:inline">click to browse</span>
              </p>
              <p className="text-xs text-zinc-500">
                Supports JPEG, PNG, WebP, GIF (max {maxSizeMB}MB)
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2 min-h-[44px] touch-manipulation"
            >
              <Upload className="h-4 w-4" />
              Choose File
            </Button>
          </>
        )}
      </div>
    </div>
  )
}


