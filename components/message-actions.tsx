"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown, Copy, Volume2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface MessageActionsProps {
  messageId: string
  messageContent: string
  onReadAloud: (text: string) => Promise<void>
  isReading?: boolean
  className?: string
}

export function MessageActions({
  messageId,
  messageContent,
  onReadAloud,
  isReading = false,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null)
  const { toast } = useToast()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy message",
        variant: "destructive",
      })
    }
  }

  const handleFeedback = (type: "up" | "down") => {
    setFeedback(type)
    toast({
      title: `Feedback ${type === "up" ? "sent" : "received"}`,
      description: `Thank you for your ${type === "up" ? "positive" : "feedback"}!`,
    })
    // TODO: Send feedback to backend/analytics
  }

  const handleReadAloud = async () => {
    await onReadAloud(messageContent)
  }

  return (
    <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 hover:bg-gray-800/50"
        onClick={handleCopy}
        title="Copy message"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-gray-400" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0 hover:bg-gray-800/50",
          isReading && "bg-red-600/20 text-red-400",
        )}
        onClick={handleReadAloud}
        title="Read aloud"
      >
        <Volume2 className={cn("h-3.5 w-3.5", isReading ? "text-red-400" : "text-gray-400")} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0 hover:bg-gray-800/50",
          feedback === "up" && "bg-green-600/20 text-green-400",
        )}
        onClick={() => handleFeedback("up")}
        title="Good response"
      >
        <ThumbsUp className={cn("h-3.5 w-3.5", feedback === "up" ? "text-green-400" : "text-gray-400")} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0 hover:bg-gray-800/50",
          feedback === "down" && "bg-red-600/20 text-red-400",
        )}
        onClick={() => handleFeedback("down")}
        title="Poor response"
      >
        <ThumbsDown className={cn("h-3.5 w-3.5", feedback === "down" ? "text-red-400" : "text-gray-400")} />
      </Button>
    </div>
  )
}




