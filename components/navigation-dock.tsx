"use client"

import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  MessageSquare,
  Users,
  Globe,
  BookOpen,
  Wand2,
  Shield,
  Scroll,
} from "lucide-react"

interface DockItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  color?: string
}

const dockItems: DockItem[] = [
  {
    id: "chat",
    label: "Chat",
    icon: <MessageSquare className="h-5 w-5" />,
    path: "/",
    color: "red",
  },
  {
    id: "character",
    label: "Character",
    icon: <Users className="h-5 w-5" />,
    path: "/forge/character",
    color: "blue",
  },
  {
    id: "world",
    label: "World",
    icon: <Globe className="h-5 w-5" />,
    path: "/forge/world",
    color: "green",
  },
  {
    id: "storyline",
    label: "Storyline",
    icon: <BookOpen className="h-5 w-5" />,
    path: "/forge/storyline",
    color: "purple",
  },
  {
    id: "magic",
    label: "Magic",
    icon: <Wand2 className="h-5 w-5" />,
    path: "/forge/magic",
    color: "yellow",
  },
  {
    id: "faction",
    label: "Faction",
    icon: <Shield className="h-5 w-5" />,
    path: "/forge/faction",
    color: "orange",
  },
  {
    id: "lore",
    label: "Lore",
    icon: <Scroll className="h-5 w-5" />,
    path: "/forge/lore",
    color: "pink",
  },
]

export function NavigationDock() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/"
    }
    return pathname?.startsWith(path)
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-2xl",
            "backdrop-blur-xl bg-zinc-950/80 border border-zinc-800/50",
            "shadow-lg shadow-black/40",
            "transition-all duration-300"
          )}
        >
          {dockItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(item.path)}
                    className={cn(
                      "h-12 w-12 rounded-xl transition-all duration-200",
                      "hover:scale-110 hover:bg-zinc-800/50",
                      active
                        ? "bg-red-600/20 text-red-400 border border-red-600/30"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {item.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="backdrop-blur-xl bg-zinc-950/90 border-zinc-800/50">
                  <p className="text-sm font-medium">{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}



