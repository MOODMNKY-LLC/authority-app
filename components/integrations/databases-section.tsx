"use client"

import { useState, useEffect } from "react"
import { Database, Loader2, RefreshCw, Table } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DatabaseInfo {
  name: string
  rowCount: number
  userRows?: number
  type: string
  error?: string
}

export function DatabasesSection() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])

  useEffect(() => {
    loadDatabases()
  }, [])

  const loadDatabases = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/supabase/databases")
      if (response.ok) {
        const data = await response.json()
        setDatabases(data.databases || [])
      } else {
        throw new Error("Failed to fetch databases")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load databases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTableTypeColor = (type: string) => {
    if (type.includes("sync")) return "bg-blue-900/20 text-blue-400 border-blue-800/50"
    if (type.includes("user")) return "bg-purple-900/20 text-purple-400 border-purple-800/50"
    if (type.includes("chat") || type.includes("message")) return "bg-green-900/20 text-green-400 border-green-800/50"
    return "bg-zinc-900/20 text-zinc-400 border-zinc-800/50"
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-900/20 to-zinc-900/20 border border-cyan-900/30">
        <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
          <Database className="h-6 w-6 text-cyan-400" />
          Supabase Databases
        </h2>
        <p className="text-zinc-400 text-sm">
          View and manage your Supabase database tables and their contents.
        </p>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Database Tables</CardTitle>
              <CardDescription>All tables in your Supabase project</CardDescription>
            </div>
            <Button
              onClick={loadDatabases}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-zinc-800 hover:bg-zinc-800"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading databases...
            </div>
          ) : databases.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {databases.map((db) => (
                  <div
                    key={db.name}
                    className="p-4 rounded-md bg-zinc-950/50 border border-zinc-800/50 hover:border-cyan-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Table className="h-4 w-4 text-cyan-400" />
                          <h4 className="text-sm font-medium text-white">{db.name}</h4>
                          <Badge variant="outline" className={getTableTypeColor(db.type)}>
                            {db.type}
                          </Badge>
                          {db.error && (
                            <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-800/50">
                              Error
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                          <span>{db.rowCount.toLocaleString()} total rows</span>
                          {db.userRows !== undefined && (
                            <span className="text-cyan-400">{db.userRows.toLocaleString()} your rows</span>
                          )}
                        </div>
                        {db.error && (
                          <p className="text-xs text-red-400 mt-1">{db.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No databases found. Click Refresh to load.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

