"use client"

import { useState, useEffect } from "react"
import {
  X,
  Settings,
  User,
  Palette,
  Database,
  Sparkles,
  Image as ImageIcon,
  Save,
  Loader2,
  MessageSquare,
  Workflow,
  Zap,
  Plug,
  Brain,
  RefreshCw,
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { UserAvatarUpload } from "@/components/user-avatar-upload"
import { NotionSection } from "@/components/notion-section"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"

// Lazy load the heavy sync section
const NotionSyncSection = dynamic(() => import("@/components/notion-sync-section").then(mod => ({ default: mod.NotionSyncSection })), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  ),
  ssr: false,
})
import { getAvailableBackgrounds } from "@/lib/assets"
import { ThemeSelector, type Theme } from "@/components/theme-selector"
import { BackgroundUpload } from "@/components/background-upload"
import { DiscordSection } from "@/components/integrations/discord-section"
import { FlowiseSection } from "@/components/integrations/flowise-section"
import { N8nSection } from "@/components/integrations/n8n-section"
import { MCPSection } from "@/components/integrations/mcp-section"
import { AIProviderSection } from "@/components/integrations/ai-provider-section"
import { DatabasesSection } from "@/components/integrations/databases-section"

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("profile")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Profile state
  const [userProfile, setUserProfile] = useState<any>(null)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Preferences state
  const [defaultModel, setDefaultModel] = useState("openai/gpt-4o-mini")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [theme, setTheme] = useState("dark")
  const [selectedVoice, setSelectedVoice] = useState("")

  // Appearance state
  const [backgroundImage, setBackgroundImage] = useState("")
  const [customBackgrounds, setCustomBackgrounds] = useState<string[]>([])
  const availableBackgrounds = getAvailableBackgrounds()

  // Load user profile and settings
  useEffect(() => {
    if (open) {
      loadUserData()
    }
  }, [open])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Load user profile
      const profileResponse = await fetch("/api/user-profile")
      if (profileResponse.ok) {
        const { profile } = await profileResponse.json()
        if (profile) {
          setUserProfile(profile)
          setDisplayName(profile.display_name || "")
          setBio(profile.bio || "")
          setAvatarUrl(profile.avatar_url)
        }
      }

      // Load user settings
      const settingsResponse = await fetch("/api/settings")
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        setDefaultModel(settings.defaultModel || "openai/gpt-4o-mini")
        setSystemPrompt(settings.systemPrompt || "")
        setTheme(settings.theme || "dark")
        setSelectedVoice(settings.selectedVoice || "")
        setBackgroundImage(settings.backgroundImage || "")
        setCustomBackgrounds((settings.customBackgrounds as string[]) || [])
      }
    } catch (error) {
      console.error("[Authority] Error loading user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/user-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save profile")
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const saveBackgroundImage = async (url: string) => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundImage: url,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save background image")
      }

      toast({
        title: "Background Updated",
        description: "Your background image has been saved.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save background image",
        variant: "destructive",
      })
    }
  }

  const deleteCustomBackground = async (index: number) => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const updatedBackgrounds = customBackgrounds.filter((_, i) => i !== index)
      setCustomBackgrounds(updatedBackgrounds)

      const { error } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            custom_backgrounds: updatedBackgrounds,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )

      if (error) throw error

      // If deleted background was selected, reset to default
      if (backgroundImage === customBackgrounds[index]) {
        const defaultBg = availableBackgrounds[0]?.url || ""
        setBackgroundImage(defaultBg)
        await saveBackgroundImage(defaultBg)
      }

      toast({
        title: "Background Deleted",
        description: "Custom background has been removed.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete background",
        variant: "destructive",
      })
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultModel,
          systemPrompt,
          theme,
          selectedVoice,
          backgroundImage,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      toast({
        title: "Preferences Saved",
        description: "Your preferences have been saved successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  // Mobile: Use Sheet component
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800/50 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-red-500" />
                  Settings
                </h2>
              </div>
            </div>

            {/* Content Area - Show selected tab content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                </div>
              )}

              {!loading && activeTab === "profile" && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                      <User className="h-6 w-6 text-red-500" />
                      Profile Settings
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Manage your profile information and avatar
                    </p>
                  </div>

                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                      <CardTitle className="text-white">Display Name</CardTitle>
                      <CardDescription>This is how your name appears to others</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="bg-zinc-950 border-zinc-800 text-white min-h-[48px]"
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                      <CardTitle className="text-white">Bio</CardTitle>
                      <CardDescription>Tell others about yourself</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Write a short bio..."
                        className="bg-zinc-950 border-zinc-800 text-white min-h-[120px]"
                        rows={4}
                      />
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                      <CardTitle className="text-white">Avatar</CardTitle>
                      <CardDescription>Upload a profile picture</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UserAvatarUpload
                        currentAvatarUrl={avatarUrl}
                        onAvatarChange={setAvatarUrl}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {!loading && activeTab === "preferences" && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-red-500" />
                      AI Preferences
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Configure your AI model and behavior settings
                    </p>
                  </div>

                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                      <CardTitle className="text-white">Default Model</CardTitle>
                      <CardDescription>Choose your preferred AI model</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select value={defaultModel} onValueChange={setDefaultModel}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white min-h-[48px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
                          <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="openai/gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                      <CardTitle className="text-white">System Prompt</CardTitle>
                      <CardDescription>Customize AI behavior</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="Enter system prompt..."
                        className="bg-zinc-950 border-zinc-800 text-white min-h-[120px]"
                        rows={6}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {!loading && activeTab === "ai-provider" && <AIProviderSection />}
              {!loading && activeTab === "notion" && <NotionSection onNavigateToSync={() => setActiveTab("sync")} />}
              {!loading && activeTab === "sync" && (
                <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                  <NotionSyncSection />
                </Suspense>
              )}
              {!loading && activeTab === "discord" && <DiscordSection />}
              {!loading && activeTab === "flowise" && <FlowiseSection />}
              {!loading && activeTab === "n8n" && <N8nSection />}
              {!loading && activeTab === "mcp" && <MCPSection onNavigateToNotion={() => setActiveTab("notion")} />}
              {!loading && activeTab === "databases" && <DatabasesSection />}
              {!loading && activeTab === "appearance" && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                    <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                      <Palette className="h-6 w-6 text-red-500" />
                      Appearance
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Customize the look and feel of your workspace
                    </p>
                  </div>

                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                      <CardTitle className="text-white">Theme</CardTitle>
                      <CardDescription>Choose your color theme</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ThemeSelector value={theme as Theme} onChange={setTheme} />
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardHeader>
                      <CardTitle className="text-white">Background</CardTitle>
                      <CardDescription>Set a custom background image</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <BackgroundUpload
                        currentBackground={backgroundImage}
                        customBackgrounds={customBackgrounds}
                        onBackgroundChange={setBackgroundImage}
                        onDeleteBackground={handleDeleteBackground}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Save Button */}
            {["profile", "preferences", "appearance"].includes(activeTab) && (
              <div className="p-4 border-t border-zinc-800/50 shrink-0">
                <Button
                  onClick={activeTab === "profile" ? saveProfile : savePreferences}
                  disabled={saving}
                  className="w-full bg-red-600 hover:bg-red-700 text-white min-h-[48px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Original overlay layout
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4 touch-none">
      <div 
        className="w-full max-w-7xl h-[95vh] md:h-[90vh] bg-zinc-950/95 backdrop-blur-xl rounded-xl border border-zinc-800/50 shadow-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-zinc-900/50 border-r-0 md:border-r border-zinc-800/50 border-b md:border-b-0 flex flex-col backdrop-blur-md">
          <div className="p-4 border-b border-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-red-500" />
                Settings
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

          <nav className="space-y-1 flex-1 overflow-y-auto p-2 scrollbar-hide">
            {[
              { id: "profile", icon: User, label: "Profile", description: "Avatar & personal info" },
              { id: "preferences", icon: Sparkles, label: "Preferences", description: "Model & behavior" },
              { id: "ai-provider", icon: Brain, label: "AI Provider", description: "API key & provider" },
              { id: "notion", icon: Database, label: "Notion", description: "Workspace connection" },
              { id: "sync", icon: RefreshCw, label: "Sync", description: "Database sync & progress" },
              { id: "discord", icon: MessageSquare, label: "Discord", description: "Bot & webhooks" },
              { id: "flowise", icon: Workflow, label: "Flowise", description: "Chatflows" },
              { id: "n8n", icon: Zap, label: "Automations", description: "Workflow automation" },
              { id: "mcp", icon: Plug, label: "MCP Tools", description: "Model context protocol" },
              { id: "databases", icon: Database, label: "Databases", description: "Supabase tables" },
              { id: "appearance", icon: Palette, label: "Appearance", description: "Theme & visuals" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group min-h-[44px]",
                  activeTab === item.id
                    ? "bg-red-900/20 text-red-400 border border-red-900/30"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200",
                )}
              >
                <item.icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{item.label}</div>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>
                </div>
              </button>
            ))}
          </nav>

          {/* Save Button - Only show for tabs that need it */}
          {["profile", "preferences", "appearance"].includes(activeTab) && (
            <div className="p-4 mt-auto">
              <Button
                onClick={activeTab === "profile" ? saveProfile : savePreferences}
                disabled={saving}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-8 space-y-8">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
              </div>
            )}

            {/* Profile Tab */}
            {!loading && activeTab === "profile" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <User className="h-6 w-6 text-red-500" />
                    Profile
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Manage your profile information, avatar, and personal details.
                  </p>
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                      <UserAvatarUpload
                        currentAvatarUrl={avatarUrl}
                        displayName={displayName}
                        onAvatarUpdate={(url) => setAvatarUrl(url)}
                        size="lg"
                      />
                    </div>

                    {/* Display Name */}
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="bg-zinc-950 border-zinc-800"
                      />
                      <p className="text-xs text-zinc-500">
                        This name appears in chat sessions and content creation.
                      </p>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        className="bg-zinc-950 border-zinc-800 min-h-[100px]"
                      />
                      <p className="text-xs text-zinc-500">A brief description about yourself.</p>
                    </div>

                    {/* Email (read-only) */}
                    {userProfile?.email && (
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={userProfile.email}
                          disabled
                          className="bg-zinc-950 border-zinc-800 text-zinc-500"
                        />
                        <p className="text-xs text-zinc-500">Email cannot be changed here.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Preferences Tab */}
            {!loading && activeTab === "preferences" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-red-500" />
                    Preferences
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Customize Authority's behavior, AI model, and personal preferences.
                  </p>
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">AI Model</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="default_model">Default Model</Label>
                      <Select value={defaultModel} onValueChange={setDefaultModel}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
                          <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="openai/gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          <SelectItem value="openai/o1">o1 (Reasoning)</SelectItem>
                          <SelectItem value="openai/o1-mini">o1 Mini</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-zinc-500">
                        The default AI model used for your conversations.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">System Prompt</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="system_prompt">Custom System Prompt</Label>
                      <Textarea
                        id="system_prompt"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder='You are Authority (nickname: "Authy"), an AI-assisted world building system. Authority uses "it" or "she" pronouns...'
                        className="bg-zinc-950 border-zinc-800 min-h-[200px] font-mono text-sm"
                      />
                      <p className="text-xs text-zinc-500">
                        Define Authority's personality and behavior. This prompt is sent with every conversation.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-white">Theme</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Color Theme</Label>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-zinc-500">Choose your preferred color theme.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Provider Tab */}
            {!loading && activeTab === "ai-provider" && <AIProviderSection />}

            {/* Notion Tab */}
            {!loading && activeTab === "notion" && <NotionSection onNavigateToSync={() => setActiveTab("sync")} />}

            {/* Sync Tab */}
            {!loading && activeTab === "sync" && (
              <Suspense fallback={
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              }>
                <NotionSyncSection />
              </Suspense>
            )}

            {/* Discord Tab */}
            {!loading && activeTab === "discord" && <DiscordSection />}

            {/* Flowise Tab */}
            {!loading && activeTab === "flowise" && <FlowiseSection />}

            {/* N8n Tab */}
            {!loading && activeTab === "n8n" && <N8nSection />}

            {/* MCP Tools Tab */}
            {!loading && activeTab === "mcp" && <MCPSection onNavigateToNotion={() => setActiveTab("notion")} />}

            {/* Databases Tab */}
            {!loading && activeTab === "databases" && <DatabasesSection />}

            {/* Appearance Tab */}
            {!loading && activeTab === "appearance" && (
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-red-900/20 to-zinc-900/20 border border-red-900/30">
                  <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
                    <Palette className="h-6 w-6 text-red-500" />
                    Appearance
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Customize the visual appearance of Authority with themes and backgrounds.
                  </p>
                </div>

                {/* Theme Selector */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-red-500" />
                      Theme
                    </CardTitle>
                    <CardDescription className="text-zinc-400">Choose your preferred color theme</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ThemeSelector currentTheme={theme as Theme} onThemeChange={(newTheme) => setTheme(newTheme)} />
                    <p className="text-xs text-zinc-500 mt-4">
                      Theme changes apply immediately. Your preference is saved automatically.
                    </p>
                  </CardContent>
                </Card>

                {/* Background Image Upload */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-red-500" />
                      Upload Custom Background
                    </CardTitle>
                    <CardDescription className="text-zinc-400">Upload your own background images (max 10MB)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BackgroundUpload
                      onUploadComplete={async (url) => {
                        const updated = [...customBackgrounds, url]
                        setCustomBackgrounds(updated)
                        await saveBackgroundImage(url) // Auto-select and save the uploaded background
                        toast({
                          title: "Background Added",
                          description: "Your custom background has been uploaded and applied.",
                        })
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Background Image Selection */}
                <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-red-500" />
                      Background Image
                    </CardTitle>
                    <CardDescription className="text-zinc-400">Select a background image for your Authority workspace</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Default Backgrounds */}
                    {availableBackgrounds.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Default Backgrounds</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {availableBackgrounds.map((bg) => (
                            <div
                              key={bg.name}
                              onClick={async () => {
                                setBackgroundImage(bg.url)
                                await saveBackgroundImage(bg.url)
                              }}
                              className={cn(
                                "relative aspect-video rounded-lg border-2 cursor-pointer overflow-hidden group",
                                backgroundImage === bg.url
                                  ? "border-red-500 ring-2 ring-red-500/50"
                                  : "border-zinc-800 hover:border-zinc-700",
                              )}
                            >
                              <img
                                src={bg.url}
                                alt={bg.label}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                  {bg.label}
                                </span>
                              </div>
                              {backgroundImage === bg.url && (
                                <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                                  <svg
                                    className="h-4 w-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Backgrounds */}
                    {customBackgrounds.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Your Custom Backgrounds</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {customBackgrounds.map((url, index) => (
                            <div
                              key={index}
                              onClick={async () => {
                                setBackgroundImage(url)
                                await saveBackgroundImage(url)
                              }}
                              className={cn(
                                "relative aspect-video rounded-lg border-2 cursor-pointer overflow-hidden group",
                                backgroundImage === url
                                  ? "border-red-500 ring-2 ring-red-500/50"
                                  : "border-zinc-800 hover:border-zinc-700",
                              )}
                            >
                              <img src={url} alt={`Custom background ${index + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                              {backgroundImage === url && (
                                <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                                  <svg
                                    className="h-4 w-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  await deleteCustomBackground(index)
                                }}
                                className="absolute top-2 left-2 bg-red-500/80 hover:bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-4 w-4 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

export default SettingsPanel

