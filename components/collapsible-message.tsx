"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CollapsibleMessageProps {
  content: React.ReactNode
  maxHeight?: number
  className?: string
}

export function CollapsibleMessage({ content, maxHeight = 400, className }: CollapsibleMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsCollapse, setNeedsCollapse] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight
      setNeedsCollapse(height > maxHeight)
      // If content is short, always show expanded
      if (height <= maxHeight) {
        setIsExpanded(true)
      }
    }
  }, [content, maxHeight])

  if (!needsCollapse) {
    return <div className={className}>{content}</div>
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={contentRef}
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-none" : `max-h-[${maxHeight}px]`,
        )}
        style={{
          maxHeight: isExpanded ? "none" : `${maxHeight}px`,
        }}
      >
        {content}
      </div>
      {needsCollapse && (
        <div className="flex items-center justify-center mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-400 hover:text-gray-300 h-7"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Show more
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}




