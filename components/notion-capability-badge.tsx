"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getNotionCapabilities } from "@/lib/notion/capabilities"
import { UserSettings } from "@/lib/notion/capabilities"
import { Zap, Link2 } from "lucide-react"

interface NotionCapabilityBadgeProps {
  settings: UserSettings | null | undefined
  className?: string
}

export function NotionCapabilityBadge({ settings, className }: NotionCapabilityBadgeProps) {
  const capabilities = getNotionCapabilities(settings)

  if (capabilities.tier === 'none') {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={capabilities.tier === 'enhanced' ? 'default' : 'secondary'}
            className={className}
          >
            {capabilities.tier === 'enhanced' ? (
              <>
                <Zap className="h-3 w-3 mr-1" />
                {capabilities.displayName}
              </>
            ) : (
              <>
                <Link2 className="h-3 w-3 mr-1" />
                {capabilities.displayName}
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{capabilities.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}



