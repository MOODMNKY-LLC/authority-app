"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ScrollableMessageContentProps {
  children: React.ReactNode
  maxHeight?: number
  className?: string
  variant?: "user" | "assistant"
}

export function ScrollableMessageContent({
  children,
  maxHeight = 600,
  className,
  variant = "assistant",
}: ScrollableMessageContentProps) {
  const [showTopFade, setShowTopFade] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkScroll = () => {
      if (!scrollRef.current) return

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isScrollable = scrollHeight > clientHeight

      setShowTopFade(isScrollable && scrollTop > 10)
      setShowBottomFade(isScrollable && scrollTop < scrollHeight - clientHeight - 10)
    }

    const element = scrollRef.current
    if (element) {
      checkScroll()
      element.addEventListener("scroll", checkScroll)

      // Use ResizeObserver to detect content changes
      const resizeObserver = new ResizeObserver(checkScroll)
      resizeObserver.observe(element)

      return () => {
        element.removeEventListener("scroll", checkScroll)
        resizeObserver.disconnect()
      }
    }
  }, [children])

  return (
    <div className={cn("relative", className)}>
      {/* Top fade gradient */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-12 pointer-events-none z-10 rounded-t-2xl transition-opacity duration-300",
          showTopFade ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            variant === "user"
              ? "linear-gradient(to bottom, rgba(220, 38, 38, 0.95), rgba(220, 38, 38, 0.7), rgba(220, 38, 38, 0.3), transparent)"
              : "linear-gradient(to bottom, rgba(17, 24, 39, 0.95), rgba(17, 24, 39, 0.7), rgba(17, 24, 39, 0.3), transparent)",
        }}
      />

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="scrollable-message-content overflow-y-auto"
        style={{
          maxHeight: `${maxHeight}px`,
        }}
      >
        {children}
      </div>

      {/* Bottom fade gradient */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-12 pointer-events-none z-10 rounded-b-2xl transition-opacity duration-300",
          showBottomFade ? "opacity-100" : "opacity-0",
        )}
        style={{
          background:
            variant === "user"
              ? "linear-gradient(to top, rgba(220, 38, 38, 0.95), rgba(220, 38, 38, 0.7), rgba(220, 38, 38, 0.3), transparent)"
              : "linear-gradient(to top, rgba(17, 24, 39, 0.95), rgba(17, 24, 39, 0.7), rgba(17, 24, 39, 0.3), transparent)",
        }}
      />
    </div>
  )
}

