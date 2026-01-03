"use client"

import { useState, useEffect } from "react"
import {
  X,
  Settings,
  Key,
  Database,
  Webhook,
  Globe,
  Shield,
  Server,
  Workflow,
  Brain,
  RefreshCw,
  Loader2,
  ExternalLink,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge" // Import Badge
import { NotionSyncIndicator } from "@/components/notion-sync-indicator"
import { NotionSyncButton } from "@/components/notion-sync-button"
import { AdminUsersSection } from "@/components/admin-users-section"
import { createClient } from "@/lib/supabase/client"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent } from "@/components/ui/sheet"

interface AdminPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { toast } = useToast()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [config, setConfig] = useState<Record<string, any>>({
    // General
    webui_url: "http://localhost:3000",
    enable_signup: true,

    // Base AI Configuration (Core Authority Settings)
    base_provider: "openai", // "openai" or "ollama"
    base_model_openai: "gpt-4o-mini",
    base_model_ollama: "",
    base_temperature: 0.7,
    base_max_tokens: 4096,
    base_top_p: 1,
    base_frequency_penalty: 0,
    base_presence_penalty: 0,
    enable_streaming: true,
    enable_tool_calling: true,
    enable_function_calling: true,

    // Ollama Configuration
    enable_ollama: false,
    ollama_base_url: "https://ollama.moodmnky.com",
    ollama_models: [] as string[],

    // OpenAI Configuration
    openai_api_key: process.env.OPENAI_API_KEY || "",
    enable_openai: true,

    // Hardcoded Web Search (Always Available)
    enable_tavily_search: true,
    enable_brave_search: true,
    enable_firecrawl: true,
    enable_google_search: false,

    // User API Keys (Unlock Features)
    user_openai_key: "",
    elevenlabs_api_key: process.env.ELEVENLABS_API_KEY || "",
    notion_api_key: "",
    google_api_key: "", // Added for Google API Key

    // n8n Configuration
    n8n_host: "https://slade-n8n.moodmnky.com",
    n8n_api_key: "",
    user_n8n_host: "",
    user_n8n_api_key: "",
    enable_n8n_automation: false,

    // MCP Servers
    mcp_servers: {
      notion: { enabled: true, requires_key: true, api_key: "", status: "inactive" },
      context7: { enabled: true, requires_key: false, status: "active" },
      brave_search: { enabled: false, requires_key: true, api_key: "", status: "inactive" },
      firecrawl: { enabled: false, requires_key: true, api_key: "", status: "inactive" },
      supabase: { enabled: false, requires_key: false, status: "inactive" },
      filesystem: { enabled: false, requires_key: false, status: "inactive" },
      git: { enabled: false, requires_key: false, status: "inactive" },
      playwright: { enabled: false, requires_key: false, status: "inactive" },
      n8n_custom: { enabled: false, requires_key: true, url: "", api_key: "", status: "inactive" },
    },

    // Webhooks & SSR
    supabase_webhook_url: "",
    enable_realtime_webhooks: true,
    webhook_secret: "",

    // Environment Variables (Read-Only)
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  const [activeTab, setActiveTab] = useState("ai-core")
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [loadingOllama, setLoadingOllama] = useState(false)

  const [openaiModels, setOpenaiModels] = useState<string[]>([])
  const [fetchingOpenaiModels, setFetchingOpenaiModels] = useState(false)
  const [elevenlabsVoices, setElevenlabsVoices] = useState<any[]>([])
  const [openaiVoices, setOpenaiVoices] = useState<any[]>([])
  const [googleVoices, setGoogleVoices] = useState<any[]>([])
  const [fetchingVoices, setFetchingVoices] = useState(false)
  const [fetchingOpenAIVoices, setFetchingOpenAIVoices] = useState(false)
  const [fetchingGoogleVoices, setFetchingGoogleVoices] = useState(false)
  const [notionSyncStatus, setNotionSyncStatus] = useState<Record<string, boolean>>({
    Characters: false,
    Worlds: false,
    Stories: false,
    "Chat Sessions": false,
  })

  const openaiModelsList = [
    { id: "gpt-4.1", name: "GPT-4.1", description: "Flagship model for complex tasks, 1M context" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "90% accuracy of GPT-4.1, faster & cheaper" },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", description: "Ultra-fast, 1M context for classification" },
    { id: "gpt-4o", name: "GPT-4o", description: "Multimodal (text, image, audio), 128K context" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Lightweight chat, 64K context" },
    { id: "o1", name: "o1", description: "Advanced reasoning model for complex tasks" },
    { id: "o1-mini", name: "o1 Mini", description: "Faster reasoning model" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Legacy turbo model (sunsetting)" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Fast, affordable model" },
  ]

  const fetchOpenAIModels = async () => {
    setFetchingOpenaiModels(true)
    try {
      const apiKey = config.user_openai_key || config.openai_api_key
      const response = await fetch("/api/openai/models", {
        headers: apiKey ? { "x-openai-key": apiKey } : {},
      })
      const data = await response.json()
      if (data.models) {
        setOpenaiModels(data.models.map((m: any) => m.id))
        toast({ title: "Models Loaded", description: `Found ${data.models.length} OpenAI models` })
      }
    } catch (error: any) {
      console.error("[v0] Failed to fetch OpenAI models:", error)
      toast({ title: "Error", description: "Failed to fetch OpenAI models", variant: "destructive" })
    } finally {
      setFetchingOpenaiModels(false)
    }
  }

  const fetchElevenlabsVoices = async () => {
    setFetchingVoices(true)
    try {
      const apiKey = config.elevenlabs_api_key
      if (!apiKey) {
        toast({ title: "No API Key", description: "Please add ElevenLabs API key first", variant: "destructive" })
        return
      }
      const response = await fetch("/api/elevenlabs/voices", {
        headers: { "x-elevenlabs-key": apiKey },
      })
      const data = await response.json()
      if (data.voices) {
        setElevenlabsVoices(data.voices)
        toast({ title: "Voices Loaded", description: `Found ${data.voices.length} voices` })
      }
    } catch (error: any) {
      console.error("[v0] Failed to fetch ElevenLabs voices:", error)
      toast({ title: "Error", description: "Failed to fetch voices", variant: "destructive" })
    } finally {
      setFetchingVoices(false)
    }
  }

  const fetchOpenAIVoices = async () => {
    setFetchingOpenAIVoices(true)
    try {
      const response = await fetch("/api/openai/voices")
      const data = await response.json()
      if (data.voices) {
        setOpenaiVoices(data.voices)
        toast({ title: "OpenAI Voices Loaded", description: `Found ${data.voices.length} voices` })
      }
    } catch (error: any) {
      console.error("[v0] Failed to fetch OpenAI voices:", error)
      toast({ title: "Error", description: "Failed to fetch OpenAI voices", variant: "destructive" })
    } finally {
      setFetchingOpenAIVoices(false)
    }
  }

  const fetchGoogleVoices = async () => {
    setFetchingGoogleVoices(true)
    try {
      const apiKey = config.google_api_key
      if (!apiKey) {
        toast({ title: "No API Key", description: "Please add Google API key first", variant: "destructive" })
        return
      }
      const response = await fetch("/api/google/voices", {
        headers: { "x-google-key": apiKey },
      })
      const data = await response.json()
      if (data.voices) {
        setGoogleVoices(data.voices)
        toast({ title: "Google Voices Loaded", description: `Found ${data.voices.length} voices` })
      }
    } catch (error: any) {
      console.error("[v0] Failed to fetch Google voices:", error)
      toast({ title: "Error", description: "Failed to fetch Google voices", variant: "destructive" })
    } finally {
      setFetchingGoogleVoices(false)
    }
  }

  const fetchOllamaModels = async () => {
    if (!config.ollama_base_url) return

    setLoadingOllama(true)
    try {
      console.log("[v0] Fetching Ollama models via proxy...")
      const response = await fetch(`/api/ollama?baseUrl=${encodeURIComponent(config.ollama_base_url)}`)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Failed to fetch Ollama models:", errorData)
        setOllamaModels([])
        return
      }

      const data = await response.json()
      const models = data.models?.map((m: any) => m.name) || []
      console.log("[v0] Ollama models loaded:", models)
      setOllamaModels(models)
      updateConfig("ollama_models", models)
    } catch (error) {
      console.error("[v0] Failed to fetch Ollama models:", error)
      setOllamaModels([])
    } finally {
      setLoadingOllama(false)
    }
  }

  useEffect(() => {
    if (config.enable_ollama && config.ollama_base_url) {
      fetchOllamaModels()
    }
  }, [config.enable_ollama, config.ollama_base_url])

  // Check admin status on mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setIsAdmin(false)
          setCheckingAdmin(false)
          return
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("user_id", user.id)
          .single()

        setIsAdmin(profile?.role === "admin")
      } catch (error) {
        console.error("[Authority] Error checking admin status:", error)
        setIsAdmin(false)
      } finally {
        setCheckingAdmin(false)
      }
    }

    if (open) {
      checkAdminStatus()
    }
  }, [open])

  // Fetch Notion sync status
  useEffect(() => {
    const fetchNotionSyncStatus = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: settings } = await supabase
          .from("user_settings")
          .select("notion_databases")
          .eq("user_id", user.id)
          .single()

        if (settings?.notion_databases) {
          const databases = settings.notion_databases as Record<string, string>
          setNotionSyncStatus({
            Characters: !!databases["Characters"],
            Worlds: !!databases["Worlds"],
            Stories: !!databases["Stories"],
            "Chat Sessions": !!databases["Chat Sessions"],
          })
        }
      } catch (error) {
        console.error("[Authority] Error fetching Notion sync status:", error)
      }
    }

    fetchNotionSyncStatus()
  }, [config.notion_api_key]) // Re-fetch when token changes

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const updateMCPServer = (server: string, field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      mcp_servers: {
        ...prev.mcp_servers,
        [server]: {
          ...prev.mcp_servers[server],
          [field]: value,
        },
      },
    }))
  }

  const StatusBadge = ({ statuses }: { statuses: string[] }) => {
    const statusColors: Record<string, string> = {
      default: "bg-blue-900/30 text-blue-400 border-blue-900",
      personal: "bg-purple-900/30 text-purple-400 border-purple-900",
      active: "bg-green-900/30 text-green-400 border-green-900",
      connected: "bg-emerald-900/30 text-emerald-400 border-emerald-900",
      disabled: "bg-zinc-800/50 text-zinc-400 border-zinc-700",
      inactive: "bg-red-900/30 text-red-400 border-red-900",
    }

    return (
      <div className="flex items-center gap-1.5">
        {statuses.map((status) => (
          <span
            key={status}
            className={cn("text-xs px-2 py-0.5 rounded border", statusColors[status] || statusColors.disabled)}
          >
            {status === "active" && "✓ "}
            {status === "connected" && "✓ "}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        ))}
      </div>
    )
  }

  const checkModelCapabilities = (model: string) => {
    const incompatibleModels = ["llama2", "mistral", "codellama", "phi-3"]
    const isIncompatible = incompatibleModels.some((m) => model.toLowerCase().includes(m))

    if (isIncompatible && (config.enable_tool_calling || config.enable_function_calling)) {
      return {
        compatible: false,
        warning:
          "This model may not support tool/function calling. Consider disabling these features or choosing a different model.",
      }
    }
    return { compatible: true, warning: null }
  }

  if (!open) return null

  // Show access denied if not admin
  if (!checkingAdmin && !isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-zinc-950/95 backdrop-blur-xl rounded-xl border border-zinc-800/50 shadow-2xl p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Shield className="h-12 w-12 text-red-500" />
            <h2 className="text-2xl font-semibold text-white">Access Denied</h2>
            <p className="text-zinc-400">
              You must have admin privileges to access the Admin Panel. Contact your administrator if you believe this
              is an error.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-4 bg-red-600 hover:bg-red-700">
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (checkingAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-zinc-950/95 backdrop-blur-xl rounded-xl border border-zinc-800/50 shadow-2xl p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            <p className="text-zinc-400">Checking permissions...</p>
          </div>
        </div>
      </div>
    )
  }

  const modelCheck =
    config.base_provider === "ollama" && config.base_model_ollama
      ? checkModelCapabilities(config.base_model_ollama)
      : config.base_provider === "openai"
        ? checkModelCapabilities(config.base_model_openai)
        : { compatible: true, warning: null }

  const saveConfig = async () => {
    // This function would typically be implemented to save the config
    console.log("Saving config:", config)
    // In a real app, you'd make an API call here
    toast({ title: "Configuration Saved", description: "Changes have been saved (simulated)." })
  }

  const isMobile = useIsMobile()
  const adminTabs = [
    { id: "ai-core", icon: Brain, label: "AI Core" },
    { id: "integrations", icon: Key, label: "Integrations" },
    { id: "web-search", icon: Globe, label: "Web Search" },
    { id: "mcp", icon: Server, label: "MCP Servers" },
    { id: "automation", icon: Workflow, label: "Automation" },
    { id: "webhooks", icon: Webhook, label: "Webhooks" },
    { id: "database", icon: Database, label: "Database" },
    { id: "users", icon: Users, label: "Users" },
    { id: "security", icon: Shield, label: "Security" },
  ]

  // Mobile: Use Sheet component with tabs navigation
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 overflow-hidden bg-zinc-950">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800/50 shrink-0 bg-zinc-950">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-red-500" />
                  Admin Panel
                </h2>
              </div>
            </div>

            {/* Navigation Tabs - Scrollable horizontal tabs */}
            <div className="border-b border-zinc-800/50 shrink-0 bg-zinc-950">
              <ScrollArea className="w-full" orientation="horizontal">
                <div className="flex gap-1 p-2 min-w-max">
                  {adminTabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]",
                          activeTab === tab.id
                            ? "bg-red-900/20 text-red-400 border border-red-900/30"
                            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 bg-zinc-950">
              {/* Render the same content as desktop but in mobile-friendly format */}
              {/* AI Core Tab */}
              {activeTab === "ai-core" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-red-500" />
                      AI Core Configuration
                    </h2>
                    <p className="text-zinc-400 text-sm">
                      Configure the base AI model and parameters that power Authority's intelligence.
                    </p>
                  </div>
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                      <CardTitle className="text-white">Model Provider</CardTitle>
                      <p className="text-sm text-zinc-400">Choose between OpenAI or local Ollama models</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={config.base_provider} onValueChange={(val) => updateConfig("base_provider", val)}>
                          <SelectTrigger className="bg-zinc-950 border-zinc-800 min-h-[48px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI (Cloud)</SelectItem>
                            <SelectItem value="ollama">Ollama (Local)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  <p className="text-xs text-zinc-500">Full configuration available on desktop view</p>
                </div>
              )}
              {activeTab === "integrations" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Key className="h-5 w-5 text-red-500" />
                      Integrations
                    </h2>
                    <p className="text-zinc-400 text-sm">System API keys and integrations</p>
                  </div>
                  <p className="text-xs text-zinc-500">Full configuration available on desktop view</p>
                </div>
              )}
              {activeTab === "web-search" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-red-500" />
                      Web Search
                    </h2>
                    <p className="text-zinc-400 text-sm">Hardcoded search tools configuration</p>
                  </div>
                  <p className="text-xs text-zinc-500">Full configuration available on desktop view</p>
                </div>
              )}
              {activeTab === "mcp" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Server className="h-5 w-5 text-red-500" />
                      MCP Servers
                    </h2>
                    <p className="text-zinc-400 text-sm">Model Context Protocol servers</p>
                  </div>
                  <p className="text-xs text-zinc-500">Full configuration available on desktop view</p>
                </div>
              )}
              {activeTab === "automation" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Workflow className="h-5 w-5 text-red-500" />
                      Automation
                    </h2>
                    <p className="text-zinc-400 text-sm">n8n workflow automation</p>
                  </div>
                  <p className="text-xs text-zinc-500">Full configuration available on desktop view</p>
                </div>
              )}
              {activeTab === "webhooks" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Webhook className="h-5 w-5 text-red-500" />
                      Webhooks & SSR
                    </h2>
                    <p className="text-zinc-400 text-sm">Realtime events configuration</p>
                  </div>
                  <p className="text-xs text-zinc-500">Full configuration available on desktop view</p>
                </div>
              )}
              {activeTab === "database" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Database className="h-5 w-5 text-red-500" />
                      Database
                    </h2>
                    <p className="text-zinc-400 text-sm">Environment variables</p>
                  </div>
                  <p className="text-xs text-zinc-500">Full configuration available on desktop view</p>
                </div>
              )}
              {activeTab === "users" && <AdminUsersSection />}
              {activeTab === "security" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      Security
                    </h2>
                    <p className="text-zinc-400 text-sm">Access control configuration</p>
                  </div>
                  <p className="text-xs text-zinc-500">Full configuration available on desktop view</p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="p-4 border-t border-zinc-800/50 shrink-0 bg-zinc-950">
              <Button onClick={saveConfig} className="w-full bg-red-600 hover:bg-red-700 text-white min-h-[48px]">
                Save Configuration
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Original overlay layout
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-7xl h-[90vh] bg-zinc-950/95 backdrop-blur-xl rounded-xl border border-zinc-800/50 shadow-2xl overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-zinc-900/50 border-r border-zinc-800/50 flex flex-col backdrop-blur-md">
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-red-500" />
                Admin Panel
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0 hover:bg-red-900/20 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto p-2">
            {[
              { id: "ai-core", icon: Brain, label: "AI Core", description: "System-wide AI config" },
              { id: "integrations", icon: Key, label: "Integrations", description: "System API keys" },
              { id: "web-search", icon: Globe, label: "Web Search", description: "Hardcoded tools" },
              { id: "mcp", icon: Server, label: "MCP Servers", description: "Context protocols" },
              { id: "automation", icon: Workflow, label: "Automation", description: "n8n workflows" },
              { id: "webhooks", icon: Webhook, label: "Webhooks & SSR", description: "Realtime events" },
                  { id: "database", icon: Database, label: "Database", description: "Environment vars" },
                  { id: "users", icon: Users, label: "Users", description: "Role management" },
                  { id: "security", icon: Shield, label: "Security", description: "Access control" },
            ].map((item) => (
              <button
                key={item.id}
                data-tab-id={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group",
                  activeTab === item.id
                    ? "bg-red-900/20 text-red-400 border border-red-900/30"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
                )}
              >
                <item.icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && <span className="text-xs">{item.badge}</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Save Button */}
          <div className="p-4 mt-auto">
            <Button onClick={saveConfig} className="w-full bg-red-600 hover:bg-red-700 text-white">
              Save Configuration
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            {/* AI Core Tab */}
            {activeTab === "ai-core" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Brain className="h-6 w-6 text-red-500" />
                    AI Core Configuration
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Configure the base AI model and parameters that power Authority's intelligence. These settings
                    affect all AI interactions.
                  </p>
                </div>

                {/* Model Provider Selection */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Model Provider</CardTitle>
                    <p className="text-sm text-zinc-400">Choose between OpenAI or local Ollama models</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select value={config.base_provider} onValueChange={(val) => updateConfig("base_provider", val)}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI (Cloud)</SelectItem>
                          <SelectItem value="ollama">Ollama (Local)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-zinc-500">
                        {config.base_provider === "openai"
                          ? "Uses OpenAI API for state-of-the-art language models (requires API key)"
                          : "Uses local Ollama instance for privacy-focused, offline AI (no API key needed)"}
                      </p>
                    </div>

                    {/* OpenAI Models */}
                    {config.base_provider === "openai" && (
                      // Update Model Selection with dynamic fetching
                      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                        <CardHeader>
                          <CardTitle className="text-white">OpenAI Models</CardTitle>
                          <p className="text-sm text-zinc-400">Select and configure OpenAI models for chat</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={fetchOpenAIModels}
                              disabled={fetchingOpenaiModels}
                              variant="outline"
                              size="sm"
                              className="gap-2 bg-transparent"
                            >
                              {fetchingOpenaiModels ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" /> Fetching...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4" /> Fetch Models
                                </>
                              )}
                            </Button>
                            <span className="text-xs text-zinc-500">
                              {openaiModels.length > 0 ? `${openaiModels.length} models available` : "Click to load"}
                            </span>
                          </div>

                          {openaiModels.length > 0 && (
                            <div className="space-y-2">
                              <Label>Available Models</Label>
                              <ScrollArea className="h-[200px] rounded-md border border-zinc-800 p-2">
                                {openaiModels.map((model) => (
                                  <div
                                    key={model}
                                    className="px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer"
                                  >
                                    {model}
                                  </div>
                                ))}
                              </ScrollArea>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="base_model">Base Model</Label>
                            <select
                              id="base_model"
                              value={config.base_model_openai} // Changed from config.base_model to config.base_model_openai
                              onChange={(e) => updateConfig("base_model_openai", e.target.value)} // Changed from config.base_model to config.base_model_openai
                              className="w-full rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
                            >
                              <optgroup label="Recommended">
                                <option value="gpt-4.1">GPT-4.1 (Flagship - 1M context)</option>
                                <option value="gpt-4.1-mini">GPT-4.1 Mini (Fast & Affordable)</option>
                                <option value="gpt-4o">GPT-4o (Multimodal)</option>
                              </optgroup>
                              <optgroup label="Reasoning Models">
                                <option value="o1">o1 (Advanced Reasoning)</option>
                                <option value="o1-mini">o1-mini (Efficient Reasoning)</option>
                              </optgroup>
                              {openaiModels.length > 0 && (
                                <optgroup label="All Available Models">
                                  {openaiModels.map((model) => (
                                    <option key={model} value={model}>
                                      {model}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Ollama Models */}
                    {config.base_provider === "ollama" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="ollama_url">Ollama Host URL</Label>
                          <Input
                            id="ollama_url"
                            value={config.ollama_base_url}
                            onChange={(e) => updateConfig("ollama_base_url", e.target.value)}
                            placeholder="https://ollama.moodmnky.com"
                            className="bg-zinc-950 border-zinc-800"
                          />
                          <p className="text-xs text-zinc-500">
                            Default: https://ollama.moodmnky.com (Authority's hosted instance)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.enable_ollama}
                            onCheckedChange={(checked) => updateConfig("enable_ollama", checked)}
                          />
                          <Label>Enable Ollama</Label>
                        </div>

                        {config.enable_ollama && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Available Models</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchOllamaModels}
                                disabled={loadingOllama}
                                className="h-7 text-xs bg-transparent"
                              >
                                {loadingOllama ? "Loading..." : "Refresh Models"}
                              </Button>
                            </div>
                            {ollamaModels.length > 0 ? (
                              <Select
                                value={config.base_model_ollama}
                                onValueChange={(val) => updateConfig("base_model_ollama", val)}
                              >
                                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                  <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ollamaModels.map((model) => (
                                    <SelectItem key={model} value={model}>
                                      {model}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-xs text-zinc-500">No models found. Make sure Ollama is running.</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Model Parameters */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Model Parameters</CardTitle>
                    <p className="text-sm text-zinc-400">Fine-tune AI behavior and response characteristics</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Temperature: {config.base_temperature}</Label>
                        <span className="text-xs text-zinc-500">Creativity</span>
                      </div>
                      <Slider
                        value={[config.base_temperature]}
                        onValueChange={([val]) => updateConfig("base_temperature", val)}
                        min={0}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-zinc-500">
                        Controls randomness: 0 = focused/deterministic, 2 = creative/varied. Recommended: 0.7-0.9 for
                        storytelling
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Max Tokens: {config.base_max_tokens}</Label>
                        <span className="text-xs text-zinc-500">Response Length</span>
                      </div>
                      <Slider
                        value={[config.base_max_tokens]}
                        onValueChange={([val]) => updateConfig("base_max_tokens", val)}
                        min={256}
                        max={8192}
                        step={256}
                        className="w-full"
                      />
                      <p className="text-xs text-zinc-500">
                        Maximum length of AI responses. Higher = longer but slower and more expensive. Recommended: 4096
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Top P: {config.base_top_p}</Label>
                        <span className="text-xs text-zinc-500">Nucleus Sampling</span>
                      </div>
                      <Slider
                        value={[config.base_top_p]}
                        onValueChange={([val]) => updateConfig("base_top_p", val)}
                        min={0}
                        max={1}
                        step={0.05}
                        className="w-full"
                      />
                      <p className="text-xs text-zinc-500">
                        Alternative to temperature. 1 = consider all tokens, 0.1 = only most likely. Usually keep at 1
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Frequency Penalty: {config.base_frequency_penalty}</Label>
                        <span className="text-xs text-zinc-500">Repetition</span>
                      </div>
                      <Slider
                        value={[config.base_frequency_penalty]}
                        onValueChange={([val]) => updateConfig("base_frequency_penalty", val)}
                        min={-2}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-zinc-500">
                        Penalizes repeated tokens. Positive = less repetition, negative = more repetition. 0 = balanced
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Presence Penalty: {config.base_presence_penalty}</Label>
                        <span className="text-xs text-zinc-500">Topic Diversity</span>
                      </div>
                      <Slider
                        value={[config.base_presence_penalty]}
                        onValueChange={([val]) => updateConfig("base_presence_penalty", val)}
                        min={-2}
                        max={2}
                        step={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-zinc-500">
                        Penalizes new topics. Positive = explore new topics, negative = stay on topic. 0 = balanced
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Advanced Features */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Advanced Features</CardTitle>
                    <p className="text-sm text-zinc-400">Enable or disable advanced AI capabilities</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!modelCheck.compatible && (
                      <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-900/30 flex items-start gap-2">
                        <span className="text-yellow-400 text-sm">⚠️</span>
                        <p className="text-xs text-yellow-400">{modelCheck.warning}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                      <div className="space-y-0.5">
                        <Label>Streaming Responses</Label>
                        <p className="text-xs text-zinc-500">
                          Display AI responses word-by-word as they're generated (ChatGPT-style)
                        </p>
                      </div>
                      <Switch
                        checked={config.enable_streaming}
                        onCheckedChange={(checked) => updateConfig("enable_streaming", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                      <div className="space-y-0.5">
                        <Label>Tool Calling</Label>
                        <p className="text-xs text-zinc-500">
                          Allow AI to use tools like web search, image generation, and file operations
                        </p>
                      </div>
                      <Switch
                        checked={config.enable_tool_calling}
                        onCheckedChange={(checked) => updateConfig("enable_tool_calling", checked)}
                        disabled={!modelCheck.compatible}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                      <div className="space-y-0.5">
                        <Label>Function Calling</Label>
                        <p className="text-xs text-zinc-500">
                          Enable structured function calls for complex operations (Forge, database queries)
                        </p>
                      </div>
                      <Switch
                        checked={config.enable_function_calling}
                        onCheckedChange={(checked) => updateConfig("enable_function_calling", checked)}
                        disabled={!modelCheck.compatible}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Key className="h-6 w-6 text-red-500" />
                    Integrations - API Keys & Tokens
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Add your personal API keys and integration tokens to unlock premium features and remove default limits. Status indicators
                    show which features are active.
                  </p>
                </div>

                {/* OpenAI */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          OpenAI
                          <StatusBadge
                            statuses={
                              config.user_openai_key
                                ? ["personal", "active"]
                                : config.openai_api_key
                                  ? ["default", "active"]
                                  : ["default"]
                            }
                          />
                        </CardTitle>
                        <p className="text-sm text-zinc-400 mt-1">Core AI intelligence and reasoning</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 rounded-lg bg-blue-900/10 border border-blue-900/30">
                      <p className="text-xs text-blue-400">
                        <strong>Default:</strong> Authority provides OpenAI access with shared rate limits. Add your key
                        for unlimited access.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user_openai_key">Personal API Key (Optional)</Label>
                      <Input
                        id="user_openai_key"
                        type="password"
                        value={config.user_openai_key}
                        onChange={(e) => updateConfig("user_openai_key", e.target.value)}
                        placeholder="sk-... (optional - remove default limits)"
                        className="bg-zinc-950 border-zinc-800 font-mono"
                      />
                      <div className="flex items-start gap-2 text-xs text-zinc-500">
                        <span className="text-green-500 mt-0.5">🔓</span>
                        <p>
                          <strong>Unlocks:</strong> Unlimited requests, GPT-4o access, DALL-E 3, faster responses,
                          priority support
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Get your key:{" "}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          className="text-red-400 hover:underline"
                          rel="noreferrer"
                        >
                          platform.openai.com
                        </a>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Notion Integration Token */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          Notion Integration Token
                          <StatusBadge
                            statuses={
                              config.notion_api_key
                                ? ["personal", "active"]
                                : ["disabled"]
                            }
                          />
                        </CardTitle>
                        <p className="text-sm text-zinc-400 mt-1">Personal integration token for Notion API access</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notion_api_key">Integration Token</Label>
                      <Input
                        id="notion_api_key"
                        type="password"
                        value={config.notion_api_key}
                        onChange={(e) => updateConfig("notion_api_key", e.target.value)}
                        placeholder="secret_..."
                        className="bg-zinc-950 border-zinc-800 font-mono"
                      />
                      <div className="flex items-start gap-2 text-xs text-zinc-500">
                        <span className="text-green-500 mt-0.5">🔓</span>
                        <p>
                          <strong>Unlocks:</strong> Notion MCP server, auto database creation, character/world/story
                          syncing, RAG with your Notion content
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Create integration:{" "}
                        <a
                          href="https://www.notion.so/my-integrations"
                          target="_blank"
                          className="text-red-400 hover:underline inline-flex items-center gap-1"
                          rel="noreferrer"
                        >
                          notion.so/my-integrations
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                      <p className="text-xs text-yellow-400/80 mt-2">
                        <strong>Note:</strong> This token provides reliable API access. OAuth tokens may not always be accessible through Supabase Auth.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-zinc-800">
                      <Button variant="outline" className="w-full" onClick={() => setActiveTab("notion")}>
                        Go to Notion Section for OAuth & Database Sync
                      </Button>
                      {Object.values(notionSyncStatus).some(Boolean) && (
                        <div className="mt-3">
                          <p className="text-xs text-zinc-500 mb-2">Quick Status:</p>
                          <div className="space-y-1">
                            {[
                              { name: "Characters", key: "Characters" },
                              { name: "Worlds", key: "Worlds" },
                              { name: "Stories", key: "Stories" },
                              { name: "Chat Sessions", key: "Chat Sessions" },
                            ].map((forge) => (
                              <div key={forge.key} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <NotionSyncIndicator
                                    synced={notionSyncStatus[forge.key as keyof typeof notionSyncStatus]}
                                  />
                                  <span className="text-zinc-400">{forge.name}</span>
                                </div>
                                <span className="text-zinc-600">
                                  {notionSyncStatus[forge.key as keyof typeof notionSyncStatus] ? "✓" : "○"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* ElevenLabs */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      ElevenLabs
                      <StatusBadge statuses={config.elevenlabs_api_key ? ["personal", "active"] : ["disabled"]} />
                    </CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">Text-to-speech and voice generation</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="elevenlabs_api_key">API Key</Label>
                      <Input
                        id="elevenlabs_api_key"
                        type="password"
                        value={config.elevenlabs_api_key}
                        onChange={(e) => updateConfig("elevenlabs_api_key", e.target.value)}
                        placeholder="sk_..."
                        className="bg-zinc-950 border-zinc-800 font-mono"
                      />
                    </div>

                    {config.elevenlabs_api_key && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={fetchElevenlabsVoices}
                            disabled={fetchingVoices}
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-transparent"
                          >
                            {fetchingVoices ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4" /> Load Voices
                              </>
                            )}
                          </Button>
                          <span className="text-xs text-zinc-500">
                            {elevenlabsVoices.length > 0
                              ? `${elevenlabsVoices.length} voices available`
                              : "Click to load voices"}
                          </span>
                        </div>

                        {elevenlabsVoices.length > 0 && (
                          <div className="space-y-2">
                            <Label>Available Voices</Label>
                            <ScrollArea className="h-[200px] rounded-md border border-zinc-800 p-2">
                              {elevenlabsVoices.map((voice) => (
                                <div
                                  key={voice.voice_id}
                                  className="px-2 py-2 text-sm hover:bg-zinc-800 rounded cursor-pointer border-b border-zinc-800/50 last:border-0"
                                >
                                  <div className="font-medium text-zinc-200">{voice.name}</div>
                                  {voice.description && (
                                    <div className="text-xs text-zinc-500 mt-0.5">{voice.description}</div>
                                  )}
                                </div>
                              ))}
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      OpenAI Voices
                      <StatusBadge statuses={["default", "active"]} />
                    </CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">Realtime API and TTS voices for natural speech</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={fetchOpenAIVoices}
                          disabled={fetchingOpenAIVoices}
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-transparent"
                        >
                          {fetchingOpenAIVoices ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" /> Load Voices
                            </>
                          )}
                        </Button>
                        <span className="text-xs text-zinc-500">
                          {openaiVoices.length > 0 ? `${openaiVoices.length} voices available` : "Click to load voices"}
                        </span>
                      </div>

                      {openaiVoices.length > 0 && (
                        <div className="space-y-2">
                          <Label>Available Voices</Label>
                          <ScrollArea className="h-[200px] rounded-md border border-zinc-800 p-2">
                            {openaiVoices.map((voice) => (
                              <div
                                key={voice.id}
                                className="px-2 py-2 text-sm hover:bg-zinc-800 rounded cursor-pointer border-b border-zinc-800/50 last:border-0"
                              >
                                <div className="font-medium text-zinc-200">{voice.name}</div>
                                <div className="text-xs text-zinc-500 mt-0.5">{voice.description}</div>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      Google Cloud TTS
                      <StatusBadge statuses={config.google_api_key ? ["personal", "active"] : ["disabled"]} />
                    </CardTitle>
                    <p className="text-sm text-zinc-400 mt-1">Neural2, WaveNet, and Studio voices</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="google_api_key">API Key</Label>
                      <Input
                        id="google_api_key"
                        type="password"
                        value={config.google_api_key || ""}
                        onChange={(e) => updateConfig("google_api_key", e.target.value)}
                        placeholder="AIza..."
                        className="bg-zinc-950 border-zinc-800 font-mono"
                      />
                    </div>

                    {config.google_api_key && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={fetchGoogleVoices}
                            disabled={fetchingGoogleVoices}
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-transparent"
                          >
                            {fetchingGoogleVoices ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4" /> Load Voices
                              </>
                            )}
                          </Button>
                          <span className="text-xs text-zinc-500">
                            {googleVoices.length > 0
                              ? `${googleVoices.length} voices available`
                              : "Click to load voices"}
                          </span>
                        </div>

                        {googleVoices.length > 0 && (
                          <div className="space-y-2">
                            <Label>Available Voices</Label>
                            <div className="flex gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                Neural2: {googleVoices.filter((v) => v.type === "Neural2").length}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                WaveNet: {googleVoices.filter((v) => v.type === "WaveNet").length}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Studio: {googleVoices.filter((v) => v.type === "Studio").length}
                              </Badge>
                            </div>
                            <ScrollArea className="h-[200px] rounded-md border border-zinc-800 p-2">
                              {googleVoices.map((voice, idx) => (
                                <div
                                  key={`${voice.name}-${idx}`}
                                  className="px-2 py-2 text-sm hover:bg-zinc-800 rounded cursor-pointer border-b border-zinc-800/50 last:border-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-zinc-200">{voice.name}</div>
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                      {voice.type}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-zinc-500 mt-0.5">
                                    {voice.language} • {voice.gender}
                                  </div>
                                </div>
                              ))}
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Web Search Tab */}
            {activeTab === "web-search" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Globe className="h-6 w-6 text-red-500" />
                    Web Search Tools (Hardcoded)
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    These search tools are provided by Authority and always available. API keys are hardcoded and
                    managed by the system. Toggle to enable/disable.
                  </p>
                </div>

                <div className="grid gap-4">
                  {[
                    {
                      name: "Tavily Search",
                      key: "enable_tavily_search",
                      description: "AI-optimized search with source citations and summarization",
                      status: ["default", "active"],
                    },
                    {
                      name: "Brave Search",
                      key: "enable_brave_search",
                      description: "Privacy-focused search engine with clean results",
                      status: ["default", "active"],
                    },
                    {
                      name: "Firecrawl",
                      key: "enable_firecrawl",
                      description: "Advanced web scraping and content extraction",
                      status: ["default", "active"],
                    },
                    {
                      name: "Google Search",
                      key: "enable_google_search",
                      description: "Traditional Google search (optional)",
                      status: ["default"],
                    },
                  ].map((tool) => (
                    <Card key={tool.key} className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-white">{tool.name}</Label>
                              <StatusBadge statuses={config[tool.key] ? tool.status : ["disabled"]} />
                            </div>
                            <p className="text-xs text-zinc-500">{tool.description}</p>
                            <p className="text-xs text-blue-400">✓ Hardcoded API key (no configuration needed)</p>
                          </div>
                          <Switch
                            checked={config[tool.key]}
                            onCheckedChange={(checked) => updateConfig(tool.key, checked)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-green-900/10 border border-green-900/30">
                  <p className="text-sm text-green-400">
                    <strong>Why hardcoded?</strong> Web search is vital to Authority's functionality. We provide these
                    tools by default so you can focus on creating instead of configuring APIs.
                  </p>
                </div>
              </div>
            )}

            {/* MCP Servers Tab */}
            {activeTab === "mcp" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Server className="h-6 w-6 text-red-500" />
                    MCP Servers (Model Context Protocol)
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Connect external tools and services using the Model Context Protocol. Servers marked with 🔑 require
                    API keys.
                  </p>
                </div>

                <div className="grid gap-4">
                  {Object.entries(config.mcp_servers).map(([key, server]: [string, any]) => (
                    <Card key={key} className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-white capitalize">
                                {key.replace(/_/g, " ")} {server.requires_key && "🔑"}
                              </Label>
                              <StatusBadge statuses={[server.status]} />
                            </div>
                            <p className="text-xs text-zinc-500">
                              {key === "notion" && "Search and modify your Notion workspace"}
                              {key === "context7" && "Up-to-date documentation and context"}
                              {key === "brave_search" && "Privacy-focused web search"}
                              {key === "firecrawl" && "Web scraping and content extraction"}
                              {key === "supabase" && "Database, auth, and edge functions"}
                              {key === "filesystem" && "Secure file operations"}
                              {key === "git" && "Git repository interactions"}
                              {key === "playwright" && "Browser automation"}
                              {key === "n8n_custom" && "Custom n8n workflow server"}
                            </p>
                          </div>
                          <Switch
                            checked={server.enabled}
                            onCheckedChange={(checked) => updateMCPServer(key, "enabled", checked)}
                          />
                        </div>

                        {server.enabled && server.requires_key && (
                          <div className="space-y-2">
                            {key === "n8n_custom" ? (
                              <>
                                <Label className="text-sm">MCP Server URL</Label>
                                <Input
                                  value={server.url || ""}
                                  onChange={(e) => updateMCPServer(key, "url", e.target.value)}
                                  placeholder="https://your-n8n.com/webhook/mcp"
                                  className="bg-zinc-950 border-zinc-800 text-sm"
                                />
                                <p className="text-xs text-zinc-500">
                                  n8n now supports custom MCP endpoints - connect your workflows directly
                                </p>
                              </>
                            ) : null}
                            <Label className="text-sm">API Key</Label>
                            <Input
                              type="password"
                              value={server.api_key || ""}
                              onChange={(e) => updateMCPServer(key, "api_key", e.target.value)}
                              placeholder="Enter API key..."
                              className="bg-zinc-950 border-zinc-800 font-mono text-sm"
                            />
                            {server.api_key && server.status === "inactive" && (
                              <p className="text-xs text-yellow-400">
                                ⚠️ Testing connection... (MCP server not yet confirmed)
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Automation Tab */}
            {activeTab === "automation" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Workflow className="h-6 w-6 text-red-500" />
                    n8n Automation
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Connect Authority to n8n workflows for powerful automation. Use the default instance or add your
                    own.
                  </p>
                </div>

                {/* Default n8n Instance */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      Authority n8n (Default)
                      <StatusBadge statuses={["default", "active"]} />
                    </CardTitle>
                    <p className="text-sm text-zinc-400">Shared n8n instance hosted by Authority</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Host URL (Read-Only)</Label>
                      <Input
                        value={config.n8n_host}
                        disabled
                        className="bg-zinc-950 border-zinc-800 font-mono text-zinc-500"
                      />
                      <p className="text-xs text-zinc-500">
                        Default shared instance: <strong>slade-n8n.moodmnky.com</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.enable_n8n_automation}
                        onCheckedChange={(checked) => updateConfig("enable_n8n_automation", checked)}
                      />
                      <Label>Enable Automation</Label>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-900/10 border border-blue-900/30">
                      <p className="text-xs text-blue-400">
                        <strong>Default:</strong> Pre-configured workflows for character creation, story saving, and
                        world-building. No API key needed.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal n8n Instance */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      Personal n8n Instance
                      <StatusBadge statuses={config.user_n8n_host ? ["personal", "connected"] : ["disabled"]} />
                    </CardTitle>
                    <p className="text-sm text-zinc-400">Connect your own n8n instance for custom workflows</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_n8n_host">n8n Host URL</Label>
                      <Input
                        id="user_n8n_host"
                        value={config.user_n8n_host}
                        onChange={(e) => updateConfig("user_n8n_host", e.target.value)}
                        placeholder="https://your-n8n.com"
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user_n8n_api_key">API Key</Label>
                      <Input
                        id="user_n8n_api_key"
                        type="password"
                        value={config.user_n8n_api_key}
                        onChange={(e) => updateConfig("user_n8n_api_key", e.target.value)}
                        placeholder="n8n_api_..."
                        className="bg-zinc-950 border-zinc-800 font-mono"
                      />
                      <p className="text-xs text-zinc-500">Generate API key in your n8n instance: Settings → API</p>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-zinc-500">
                      <span className="text-green-500 mt-0.5">🔓</span>
                      <p>
                        <strong>Unlocks:</strong> Custom workflows, private automation, full control over n8n operations
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* n8n MCP Integration */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">n8n MCP Server (NEW)</CardTitle>
                    <p className="text-sm text-zinc-400">Use n8n workflows as MCP tools in AI conversations</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-purple-900/10 border border-purple-900/30">
                      <h4 className="text-sm font-medium text-purple-400 mb-2">What's this?</h4>
                      <p className="text-xs text-zinc-400">
                        n8n now supports the Model Context Protocol. This means your n8n workflows can act as tools that
                        the AI can invoke during conversations - like triggering a workflow to save a character, send an
                        email, or query a database.
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Configure n8n MCP in the <strong>MCP Servers</strong> tab to enable this feature.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Webhooks Tab */}
            {activeTab === "webhooks" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Webhook className="h-6 w-6 text-red-500" />
                    Webhooks & Server-Sent Events
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Configure real-time event subscriptions and webhook endpoints for external integrations
                  </p>
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Supabase Realtime</CardTitle>
                    <p className="text-sm text-zinc-400">Real-time database subscriptions via WebSocket</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
                      <div className="space-y-0.5">
                        <Label>Enable Realtime Webhooks</Label>
                        <p className="text-xs text-zinc-500">
                          Receive instant updates when database records change (messages, projects, chats)
                        </p>
                      </div>
                      <Switch
                        checked={config.enable_realtime_webhooks}
                        onCheckedChange={(checked) => updateConfig("enable_realtime_webhooks", checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook_secret">Webhook Secret</Label>
                      <Input
                        id="webhook_secret"
                        type="password"
                        value={config.webhook_secret}
                        onChange={(e) => updateConfig("webhook_secret", e.target.value)}
                        placeholder="your-secret-key"
                        className="bg-zinc-950 border-zinc-800 font-mono"
                      />
                      <p className="text-xs text-zinc-500">
                        Secret key used to verify webhook requests are authentic (prevents spoofing)
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-900/10 border border-blue-900/30">
                      <h4 className="text-sm font-medium text-blue-400 mb-2">Real-time Events</h4>
                      <ul className="text-xs text-zinc-400 space-y-1">
                        <li>• New messages in active chat</li>
                        <li>• Project updates and changes</li>
                        <li>• Character/World/Story modifications</li>
                        <li>• User settings updates</li>
                        <li>• Admin configuration changes</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Database Tab */}
            {activeTab === "database" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Database className="h-6 w-6 text-red-500" />
                    Database Configuration
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    View environment variables and database connection details (read-only)
                  </p>
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      Supabase
                      <StatusBadge statuses={["default", "active"]} />
                    </CardTitle>
                    <p className="text-sm text-zinc-400">Backend database and authentication</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Supabase URL (Read-Only)</Label>
                      <Input
                        value={config.supabase_url || "Not configured"}
                        disabled
                        className="bg-zinc-950 border-zinc-800 font-mono text-zinc-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Anon Key (Read-Only)</Label>
                      <Input
                        type="password"
                        value={config.supabase_anon_key || "Not configured"}
                        disabled
                        className="bg-zinc-950 border-zinc-800 font-mono text-zinc-500"
                      />
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-700">
                      <p className="text-xs text-zinc-400">
                        These values are configured via environment variables and cannot be changed here. Contact your
                        administrator to update.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-6">
                <AdminUsersSection />
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-red-500" />
                    Security & Access Control
                  </h2>
                  <p className="text-zinc-400 text-sm">Configure security settings and access permissions</p>
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">User Registration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Signup</Label>
                        <p className="text-xs text-zinc-500">Allow new users to create accounts</p>
                      </div>
                      <Switch
                        checked={config.enable_signup}
                        onCheckedChange={(checked) => updateConfig("enable_signup", checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
