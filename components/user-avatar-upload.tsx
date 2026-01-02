"use client"

import { useState, useRef } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, X, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface UserAvatarUploadProps {
  currentAvatarUrl?: string | null
  displayName?: string | null
  onAvatarUpdate?: (url: string | null) => void
  size?: "sm" | "md" | "lg"
  className?: string
}

export function UserAvatarUpload({
  currentAvatarUrl,
  displayName,
  onAvatarUpdate,
  size = "md",
  className,
}: UserAvatarUploadProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a JPEG, PNG, WebP, or GIF image.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/user-profile/avatar", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      setPreviewUrl(data.url)
      onAvatarUpdate?.(data.url)

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      })
    } catch (error: any) {
      console.error("[Authority] Avatar upload error:", error)
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      })
      // Revert preview on error
      setPreviewUrl(currentAvatarUrl || null)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    try {
      const response = await fetch("/api/user-profile/avatar", {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Delete failed")
      }

      setPreviewUrl(null)
      onAvatarUpdate?.(null)

      toast({
        title: "Avatar Removed",
        description: "Your profile picture has been removed.",
      })
    } catch (error: any) {
      console.error("[Authority] Avatar delete error:", error)
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove avatar. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], "border-2 border-zinc-700")}>
          <AvatarImage src={previewUrl || undefined} alt={displayName || "User"} />
          <AvatarFallback className="bg-zinc-800 text-zinc-300">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          id="avatar-upload"
          disabled={uploading}
        />
        <label htmlFor="avatar-upload">
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={uploading}
            className="cursor-pointer"
          >
            <span>
              <Upload className="h-3 w-3 mr-1" />
              {previewUrl ? "Change" : "Upload"}
            </span>
          </Button>
        </label>
        {previewUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
            className="text-red-400 hover:text-red-300 hover:border-red-400"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}


