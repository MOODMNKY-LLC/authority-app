"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, Sparkles, Database, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ForgePageSkeletonProps {
  forgeType: string
  color?: string
}

export function ForgePageSkeleton({ forgeType, color = "red" }: ForgePageSkeletonProps) {
  const colorClasses = {
    red: "border-red-900/30",
    blue: "border-blue-900/30",
    purple: "border-purple-900/30",
    yellow: "border-yellow-900/30",
    green: "border-green-900/30",
    orange: "border-orange-900/30",
  }

  const borderColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.red

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Main Content Skeleton */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="backdrop-blur-md bg-black/20 border border-zinc-800/50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="create" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Create
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">Create Tab</p>
                      <p className="text-sm text-zinc-300">
                        Use this tab to create new {forgeType} items. Fill out the form and use AI assistance to refine your ideas.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="database" className="gap-2">
                      <Database className="h-4 w-4" />
                      Database
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">Database Tab</p>
                      <p className="text-sm text-zinc-300">
                        View all your {forgeType} items synced from Notion. Search, filter, and open items directly in Notion.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="integration" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Integration
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">Integration Tab</p>
                      <p className="text-sm text-zinc-300">
                        Link this Forge to your Notion database. Create new pages or link to existing ones for seamless synchronization.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              {/* Create Form Skeleton */}
              <Card className={cn(
                "backdrop-blur-md backdrop-saturate-150",
                "bg-black/30 border",
                borderColor,
                "shadow-lg shadow-black/20"
              )}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-6 w-48" />
                  </div>
                  <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className={cn(
                "backdrop-blur-md backdrop-saturate-150",
                "bg-black/20 border border-zinc-800/50",
                "shadow-lg shadow-black/20"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-white">
                        Getting Started with {forgeType.charAt(0).toUpperCase() + forgeType.slice(1)} Forge
                      </p>
                      <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                        <li>Fill out the form above to create a new {forgeType}</li>
                        <li>Use AI Assist to get suggestions and refine your ideas</li>
                        <li>Switch to the Integration tab to link to Notion</li>
                        <li>View all your items in the Database tab</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              {/* Database Content Skeleton */}
              <Card className={cn(
                "backdrop-blur-md backdrop-saturate-150",
                "bg-black/30 border border-zinc-800/50",
                "shadow-lg shadow-black/20"
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-6 w-40" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-10 w-64" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Card
                        key={i}
                        className="backdrop-blur-md bg-black/20 border-zinc-800/30"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                              <div className="flex gap-2">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-24" />
                              </div>
                              <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className={cn(
                "backdrop-blur-md backdrop-saturate-150",
                "bg-black/20 border border-zinc-800/50",
                "shadow-lg shadow-black/20"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-white">
                        Database View Tips
                      </p>
                      <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                        <li>All items are synced from your Notion database</li>
                        <li>Use the search bar to find specific items</li>
                        <li>Click any item to open it in Notion</li>
                        <li>Items update automatically when synced</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integration" className="space-y-6">
              {/* Integration Panel Skeleton */}
              <Card className={cn(
                "backdrop-blur-md backdrop-saturate-150",
                "bg-black/30 border border-zinc-800/50",
                "shadow-lg shadow-black/20"
              )}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className={cn(
                "backdrop-blur-md backdrop-saturate-150",
                "bg-black/20 border border-zinc-800/50",
                "shadow-lg shadow-black/20"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-white">
                        Notion Integration Guide
                      </p>
                      <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                        <li>Select your Notion database from the dropdown</li>
                        <li>Choose to create a new page or link to an existing one</li>
                        <li>Your {forgeType} will sync automatically to Notion</li>
                        <li>Check the connection status badge in the header</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

