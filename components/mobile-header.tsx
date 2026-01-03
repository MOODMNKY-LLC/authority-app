"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface MobileHeaderProps {
  title?: string
  className?: string
  children?: React.ReactNode
}

export function MobileHeader({ title, className, children }: MobileHeaderProps) {
  const isMobile = useIsMobile()

  if (!isMobile) return null

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-800/50",
        "backdrop-blur-xl bg-zinc-950/80 px-4 shadow-sm shadow-black/20",
        "md:hidden", // Only show on mobile
        className
      )}
    >
      <SidebarTrigger className="h-10 w-10 shrink-0" />
      {title && (
        <h1 className="flex-1 text-base font-semibold text-white truncate">
          {title}
        </h1>
      )}
      {children}
    </header>
  )
}

