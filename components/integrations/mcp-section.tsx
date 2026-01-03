"use client"

import { useState, useEffect } from "react"
import { Plug, Loader2, Key, AlertCircle, CheckCircle2, XCircle, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface MCPToolDefinition {
  name: string
  description?: string
  inputSchema?: {
    type?: string
    properties?: Record<string, any>
    required?: string[]
  }
}

interface MCPServer {
  id: string
  name: string
  description: string
  requiresAuth: boolean
  authType: string
  enabled: boolean
  hasAuth: boolean
  hasEnvKey?: boolean
  transport: string
}

interface MCPSectionProps {
  onNavigateToNotion?: () => void
}

export function MCPSection({ onNavigateToNotion }: MCPSectionProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [servers, setServers] = useState<MCPServer[]>([])
  const [serverTools, setServerTools] = useState<Record<string, MCPToolDefinition[]>>({})
  const [toolsLoading, setToolsLoading] = useState<Record<string, boolean>>({})
  const [connectivityStatus, setConnectivityStatus] = useState<Record<string, "checking" | "connected" | "disconnected" | "error">>({})
  
  // Auth dialog state
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authServerId, setAuthServerId] = useState<string | null>(null)
  const [authApiKey, setAuthApiKey] = useState("")
  const [authSaving, setAuthSaving] = useState(false)

  // Notion-specific state
  const [hasNotionToken, setHasNotionToken] = useState(false)
  const [notionTokenType, setNotionTokenType] = useState<"oauth" | "integration" | null>(null)

  useEffect(() => {
    loadServers()
    checkNotionToken()
  }, [])

  useEffect(() => {
    // Auto-fetch tools and check connectivity for enabled servers
    servers.forEach((server) => {
      if (server.enabled && server.hasAuth) {
        checkConnectivity(server.id)
        fetchServerTools(server.id)
      }
    })
  }, [servers])

  const checkNotionToken = async () => {
    try {
      const response = await fetch("/api/notion/connection-status")
      if (response.ok) {
        const data = await response.json()
        const hasToken = data.connection?.token?.type !== null
        const tokenType = data.connection?.token?.type || null
        setHasNotionToken(hasToken)
        setNotionTokenType(tokenType)
        
        // Update notion server hasAuth status
        setServers((prev) =>
          prev.map((s) => (s.id === "notion" ? { ...s, hasAuth: hasToken } : s))
        )
      }
    } catch (error) {
      console.error("Failed to check Notion token:", error)
    }
  }

  const loadServers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/integrations/mcp/servers")
      if (response.ok) {
        const data = await response.json()
        const loadedServers = data.servers || []
        console.log("[MCP] Loaded servers:", loadedServers)
        console.log("[MCP] Server enabled states:", loadedServers.map((s: MCPServer) => ({ id: s.id, enabled: s.enabled, hasAuth: s.hasAuth })))
        setServers(loadedServers)
      } else {
        const errorData = await response.json()
        console.error("[MCP] Failed to load servers:", errorData)
        toast({
          title: "Error",
          description: errorData.error || "Failed to load MCP servers",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[MCP] Failed to load MCP servers:", error)
      toast({
        title: "Error",
        description: "Failed to load MCP servers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkConnectivity = async (serverId: string) => {
    setConnectivityStatus((prev) => ({ ...prev, [serverId]: "checking" }))
    
    try {
      const response = await fetch("/api/integrations/mcp/servers/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.connected && data.tools && data.tools.length > 0) {
          setConnectivityStatus((prev) => ({ ...prev, [serverId]: "connected" }))
        } else {
          setConnectivityStatus((prev) => ({ ...prev, [serverId]: "disconnected" }))
        }
      } else {
        setConnectivityStatus((prev) => ({ ...prev, [serverId]: "error" }))
      }
    } catch (error) {
      console.error(`Failed to check connectivity for ${serverId}:`, error)
      setConnectivityStatus((prev) => ({ ...prev, [serverId]: "error" }))
    }
  }

  const fetchServerTools = async (serverId: string) => {
    setToolsLoading((prev) => ({ ...prev, [serverId]: true }))
    try {
      const response = await fetch("/api/integrations/mcp/servers/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.tools && Array.isArray(data.tools)) {
          setServerTools((prev) => ({ ...prev, [serverId]: data.tools }))
        }
      }
    } catch (error) {
      console.error(`Failed to fetch tools for ${serverId}:`, error)
    } finally {
      setToolsLoading((prev) => ({ ...prev, [serverId]: false }))
    }
  }

  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    const server = servers.find((s) => s.id === serverId)
    if (!server) return

    // Check if auth is required (only if no env key and no user config)
    if (enabled && server.requiresAuth && !server.hasAuth) {
      // Special handling for Notion
      if (serverId === "notion" && !hasNotionToken) {
        toast({
          title: "Notion Token Required",
          description: "Please add a Notion integration token or connect via OAuth in the Notion section first.",
          variant: "destructive",
        })
        if (onNavigateToNotion) {
          onNavigateToNotion()
        }
        return
      }
      
      // Show auth dialog for servers without env keys or user config
      setAuthServerId(serverId)
      setAuthApiKey("")
      setAuthDialogOpen(true)
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/integrations/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId,
          enabled,
        }),
      })

      if (response.ok) {
        // Update local state immediately
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, enabled } : s))
        )
        
        if (enabled) {
          // Check connectivity and fetch tools
          await checkConnectivity(serverId)
          await fetchServerTools(serverId)
        } else {
          // Clear tools and connectivity status when disabled
          setServerTools((prev) => {
            const updated = { ...prev }
            delete updated[serverId]
            return updated
          })
          setConnectivityStatus((prev) => {
            const updated = { ...prev }
            delete updated[serverId]
            return updated
          })
        }
        
        toast({
          title: enabled ? `${server.name} Enabled` : `${server.name} Disabled`,
          description: enabled
            ? `${server.name} MCP is now active.`
            : `${server.name} MCP has been disabled.`,
        })
      } else {
        throw new Error("Failed to update server")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update server",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAuth = async () => {
    if (!authServerId || !authApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key.",
        variant: "destructive",
      })
      return
    }

    setAuthSaving(true)
    try {
      const response = await fetch("/api/integrations/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId: authServerId,
          enabled: true,
          apiKey: authApiKey.trim(),
        }),
      })

      if (response.ok) {
        setAuthDialogOpen(false)
        setAuthApiKey("")
        await loadServers()
        if (authServerId) {
          await checkConnectivity(authServerId)
          await fetchServerTools(authServerId)
        }
        toast({
          title: "API Key Saved",
          description: "Server has been enabled with your API key.",
        })
      } else {
        throw new Error("Failed to save API key")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save API key",
        variant: "destructive",
      })
    } finally {
      setAuthSaving(false)
    }
  }

  const getServerIcon = (serverId: string) => {
    switch (serverId) {
      case "notion":
        return <FileText className="h-5 w-5 text-blue-400" />
      default:
        return <Plug className="h-5 w-5 text-zinc-400" />
    }
  }

  const getConnectivityBadge = (serverId: string) => {
    const status = connectivityStatus[serverId]
    if (!status) return null

    switch (status) {
      case "checking":
        return (
          <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-800">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        )
      case "connected":
        return (
          <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case "disconnected":
        return (
          <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        )
      case "error":
        return (
          <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-900/20 to-zinc-900/20 border border-blue-900/30">
        <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
          <Plug className="h-6 w-6 text-blue-400" />
          MCP Tools Integration
        </h2>
        <p className="text-zinc-400 text-sm">
          Configure Model Context Protocol (MCP) tools and servers. When enabled, tools are automatically discovered and listed below.
        </p>
      </div>

      {/* All MCP Servers */}
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plug className="h-5 w-5 text-blue-400" />
            Available MCP Servers
          </CardTitle>
          <CardDescription>Enable MCP servers to expose their tools to your AI assistant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading servers...
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No MCP servers available</div>
          ) : (
            servers.map((server, index) => {
              const tools = serverTools[server.id] || []
              const isLoading = toolsLoading[server.id] || false
              const connectivityBadge = getConnectivityBadge(server.id)

              return (
                <div key={server.id}>
                  {index > 0 && <Separator className="my-4 bg-zinc-800" />}
                  <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            {getServerIcon(server.id)}
                            <h4 className="text-base font-semibold text-white">{server.name}</h4>
                          </div>
                          
                          {/* Status Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {server.enabled && (
                              <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
                                Active
                              </Badge>
                            )}
                            {server.hasAuth && (
                              <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800">
                                <Key className="h-3 w-3 mr-1" />
                                Authenticated
                              </Badge>
                            )}
                            {connectivityBadge}
                            {server.enabled && tools.length > 0 && (
                              <Badge variant="outline" className="bg-purple-900/20 text-purple-400 border-purple-800">
                                {tools.length} {tools.length === 1 ? "tool" : "tools"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-zinc-400">{server.description}</p>
                        
                        {server.requiresAuth && !server.hasAuth && (
                          <Alert className="bg-yellow-900/20 border-yellow-800/50">
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                            <AlertDescription className="text-sm text-yellow-300">
                              {server.id === "notion" ? (
                                <>
                                  No Notion token found.{" "}
                                  <Button
                                    variant="link"
                                    className="h-auto p-0 text-yellow-400 underline hover:text-yellow-300"
                                    onClick={() => {
                                      if (onNavigateToNotion) {
                                        onNavigateToNotion()
                                      }
                                    }}
                                  >
                                    Add one in the Notion section
                                  </Button>
                                </>
                              ) : (
                                "API key required. Toggle on to add your API key."
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {server.hasEnvKey && (
                          <Badge variant="outline" className="bg-emerald-900/20 text-emerald-400 border-emerald-800 text-xs">
                            Using environment API key
                          </Badge>
                        )}

                        {/* Tools as Badges */}
                        {server.enabled && server.hasAuth && (
                          <div className="mt-4 space-y-2">
                            {isLoading ? (
                              <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading tools...
                              </div>
                            ) : tools.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {tools.map((tool, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="bg-zinc-800/50 text-zinc-300 border-zinc-700 hover:bg-zinc-700/50 cursor-help"
                                    title={tool.description || tool.name}
                                  >
                                    {tool.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-zinc-500">
                                No tools available. {connectivityStatus[server.id] === "error" && "Check your API key and connectivity."}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Toggle Switch - Always Visible */}
                      <div className="flex flex-col items-center justify-start gap-2 shrink-0 min-w-[80px]">
                        <div className="flex items-center gap-3">
                          <Switch
                            id={`switch-${server.id}`}
                            checked={server.enabled}
                            onCheckedChange={(enabled) => {
                              console.log(`[MCP] Toggling ${server.id} to ${enabled}`)
                              handleToggleServer(server.id, enabled)
                            }}
                            disabled={saving || (server.requiresAuth && !server.hasAuth && server.id !== "notion")}
                            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-zinc-700 scale-110"
                          />
                          <Label 
                            htmlFor={`switch-${server.id}`}
                            className="text-sm font-semibold text-zinc-300 cursor-pointer"
                          >
                            {server.enabled ? (
                              <span className="text-green-400">ON</span>
                            ) : (
                              <span className="text-zinc-500">OFF</span>
                            )}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Auth Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Enter API Key</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {authServerId && servers.find((s) => s.id === authServerId)?.name} requires an API key to function.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-zinc-300">
                API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                value={authApiKey}
                onChange={(e) => setAuthApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="bg-zinc-950 border-zinc-800 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && authApiKey.trim()) {
                    handleSaveAuth()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAuthDialogOpen(false)
                setAuthApiKey("")
              }}
              className="border-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAuth}
              onTouchEnd={(e) => {
                e.preventDefault()
                if (!authSaving && authApiKey.trim()) {
                  handleSaveAuth()
                }
              }}
              disabled={authSaving || !authApiKey.trim()}
              className="bg-blue-600 hover:bg-blue-700 min-h-[48px]"
            >
              {authSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & Enable"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
