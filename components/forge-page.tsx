"use client"

import { useState, useEffect } from "react"
import { ForgeDatabasePanel } from "@/components/forge-database-panel"
import { ForgeConnectionStatus } from "@/components/forge-connection-status"
import { ForgeDatabaseContent } from "@/components/forge-database-content"
import { ForgeDatabaseTable } from "@/components/forge-database-table"
import { ForgePageSkeleton } from "@/components/forge-page-skeleton"
import { ForgeDynamicForm } from "@/components/forge-dynamic-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Users,
  Globe,
  BookOpen,
  Wand2,
  Shield,
  Scroll,
  Sparkles,
  Save,
  Plus,
  Database,
  FileText,
  Info,
} from "lucide-react"

interface ForgePageProps {
  forgeType: string
}

const FORGE_CONFIG = {
  character: {
    title: "Character Forge",
    icon: Users,
    description: "Build detailed characters with backstories, motivations, and arcs",
    color: "red",
  },
  world: {
    title: "World Forge",
    icon: Globe,
    description: "Design immersive worlds with geography, cultures, and history",
    color: "blue",
  },
  storyline: {
    title: "Storyline Forge",
    icon: BookOpen,
    description: "Structure narratives with plot points, conflicts, and resolutions",
    color: "purple",
  },
  magic: {
    title: "Magic System",
    icon: Wand2,
    description: "Define magic systems with rules, costs, and limitations",
    color: "yellow",
  },
  faction: {
    title: "Faction Forge",
    icon: Shield,
    description: "Create factions with hierarchies, goals, and conflicts",
    color: "green",
  },
  lore: {
    title: "Lore & History",
    icon: Scroll,
    description: "Craft mythologies, legends, and historical events",
    color: "orange",
  },
}

export function ForgePage({ forgeType }: ForgePageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("create")
  const [editingItemId, setEditingItemId] = useState<string | undefined>()
  const [mounted, setMounted] = useState(false)
  const config = FORGE_CONFIG[forgeType as keyof typeof FORGE_CONFIG]

  useEffect(() => {
    setMounted(true)
    // Simulate initial load to show skeleton
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [forgeType])

  if (!config) {
    return <div>Invalid forge type</div>
  }

  const Icon = config.icon

  // Show skeleton during initial load
  if (isLoading) {
    return <ForgePageSkeleton forgeType={forgeType} color={config.color} />
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Background overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(/assets/backgrounds/authority-bg-1.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.12,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-800/50 backdrop-blur-xl bg-zinc-950/80 backdrop-saturate-150 px-6 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg backdrop-blur-md",
            config.color === "red" && "bg-red-600/20 border border-red-600/30",
            config.color === "blue" && "bg-blue-600/20 border border-blue-600/30",
            config.color === "green" && "bg-green-600/20 border border-green-600/30",
            config.color === "purple" && "bg-purple-600/20 border border-purple-600/30",
            config.color === "yellow" && "bg-yellow-600/20 border border-yellow-600/30",
            config.color === "orange" && "bg-orange-600/20 border border-orange-600/30",
          )}>
            <Icon className={cn(
              "h-5 w-5",
              config.color === "red" && "text-red-400",
              config.color === "blue" && "text-blue-400",
              config.color === "green" && "text-green-400",
              config.color === "purple" && "text-purple-400",
              config.color === "yellow" && "text-yellow-400",
              config.color === "orange" && "text-orange-400",
            )} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">{config.title}</h1>
            <p className="text-xs text-zinc-400">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ForgeConnectionStatus forgeType={forgeType} />
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 backdrop-blur-md bg-black/20 border-zinc-800/50 hover:bg-zinc-800/50 hover:backdrop-blur-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            New Item
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="gap-2 bg-red-600/80 hover:bg-red-600/90 border border-red-500/30 backdrop-blur-md transition-all"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {mounted ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="backdrop-blur-md bg-black/20 border border-zinc-800/50">
              <TabsTrigger value="create" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-2">
                <Database className="h-4 w-4" />
                Database
              </TabsTrigger>
              <TabsTrigger value="integration" className="gap-2">
                <FileText className="h-4 w-4" />
                Integration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              {/* Dynamic Form with All Database Properties */}
              <ForgeDynamicForm
                forgeType={forgeType}
                notionPageId={editingItemId}
                onSave={async (data) => {
                  // Handle save - will integrate with create-link API
                  console.log("[Authority] Saving form data:", data)
                  // TODO: Call create-link API with all properties
                }}
              />
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <ForgeDatabaseTable
                forgeType={forgeType}
                onItemSelect={(notionPageId) => {
                  // Switch to create tab and load item for editing
                  setEditingItemId(notionPageId)
                  setActiveTab("create")
                }}
              />
            </TabsContent>

            <TabsContent value="integration" className="space-y-6">
              {/* Database Linking Panel */}
              <Card className={cn(
                "backdrop-blur-md backdrop-saturate-150",
                "bg-black/30 border border-zinc-800/50",
                "shadow-lg shadow-black/20"
              )}>
                <CardHeader>
                  <CardTitle>Notion Integration</CardTitle>
                  <CardDescription>
                    Link this {forgeType} to your Notion database for seamless synchronization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ForgeDatabasePanel forgeType={forgeType as any} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          ) : (
            <ForgePageSkeleton forgeType={forgeType} />
          )}
        </div>
      </div>
    </div>
  )
}

