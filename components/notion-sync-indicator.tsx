"use client"

import { cn } from "@/lib/utils"

interface NotionSyncIndicatorProps {
  synced: boolean
  className?: string
}

export function NotionSyncIndicator({ synced, className }: NotionSyncIndicatorProps) {
  if (!synced) {
    return (
      <div
        className={cn(
          "h-2 w-2 rounded-full bg-zinc-600 border border-zinc-700",
          className
        )}
        title="Not synced with Notion"
      />
    )
  }

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Pulsing outer ring */}
      <div
        className="absolute h-2 w-2 rounded-full bg-green-500/30 animate-ping"
        style={{
          animationDuration: "2s",
          animationIterationCount: "infinite",
        }}
      />
      {/* Solid center */}
      <div
        className="relative h-2 w-2 rounded-full bg-green-500 border border-green-400 shadow-[0_0_4px_rgba(34,197,94,0.5)]"
        title="Synced with Notion"
      />
    </div>
  )
}


