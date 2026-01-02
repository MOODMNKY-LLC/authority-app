"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Settings, Zap, Database, LinkIcon, Save, X, Volume2, Key, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CommandPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Voice {
  voice_id: string
  name: string
  category?: string
}

export function CommandPanel({ open, onOpenChange }: CommandPanelProps) {
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Authority (nickname: \"Authy\"), an AI-assisted world building system. Authority uses \"it\" or \"she\" pronouns. You help users with creative storytelling, character development, and world building in a gothic aesthetic.",
  )
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState("")
  const [n8nApiKey, setN8nApiKey] = useState("")
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState("")
  const [selectedVoice, setSelectedVoice] = useState("EXAVITQu4vr4xnSDxMaL") // Default Bella voice
  const [voices, setVoices] = useState<Voice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState("")
  const [uploadingBackground, setUploadingBackground] = useState(false)

  useEffect(() => {
    if (open) {
      loadSettings()
      loadVoices()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings")
      if (response.ok) {
        const data = await response.json()
        if (data.systemPrompt) setSystemPrompt(data.systemPrompt)
        if (data.elevenlabsApiKey) setElevenlabsApiKey(data.elevenlabsApiKey)
        if (data.n8nApiKey) setN8nApiKey(data.n8nApiKey)
        if (data.n8nWebhookUrl) setN8nWebhookUrl(data.n8nWebhookUrl)
        if (data.selectedVoice) setSelectedVoice(data.selectedVoice)
        if (data.backgroundImage) setBackgroundImage(data.backgroundImage)
      }
    } catch (error) {
      console.error("[v0] Failed to load settings:", error)
    }
  }

  const loadVoices = async () => {
    setLoadingVoices(true)
    try {
      const response = await fetch("/api/voices")
      if (response.ok) {
        const data = await response.json()
        setVoices(data)
      }
    } catch (error) {
      console.error("[v0] Failed to load voices:", error)
    } finally {
      setLoadingVoices(false)
    }
  }

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingBackground(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-background", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setBackgroundImage(data.url)
      }
    } catch (error) {
      console.error("[v0] Failed to upload background:", error)
    } finally {
      setUploadingBackground(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          elevenlabsApiKey,
          n8nApiKey,
          n8nWebhookUrl,
          selectedVoice,
          backgroundImage,
        }),
      })

      if (response.ok) {
        onOpenChange(false)
        window.location.reload()
      }
    } catch (error) {
      console.error("[v0] Failed to save settings:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-red-500" />
            Personalization & Settings
          </DialogTitle>
          <DialogDescription>Customize Authority's behavior, system prompts, and manage integrations</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="system-prompt" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="system-prompt">System Prompt</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="system-prompt" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter your custom system prompt..."
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This prompt defines Authority's personality, behavior, and capabilities. It will be sent with every
                conversation.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                    <Database className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Supabase</p>
                    <p className="text-sm text-muted-foreground">Database & Storage</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-green-500/50 text-green-500">
                  Connected
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
                    <LinkIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Notion</p>
                    <p className="text-sm text-muted-foreground">Knowledge Management</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-green-500/50 text-green-500">
                  Connected
                </Badge>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-violet-500/10">
                    <Volume2 className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-medium">ElevenLabs</p>
                    <p className="text-sm text-muted-foreground">Text-to-Speech for Characters</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="elevenlabs-key" className="text-xs">
                    API Key
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="elevenlabs-key"
                      type="password"
                      value={elevenlabsApiKey}
                      onChange={(e) => setElevenlabsApiKey(e.target.value)}
                      placeholder="sk_..."
                      className="font-mono text-xs"
                    />
                    <Key className="h-9 w-9 p-2 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-500/10">
                    <Zap className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">n8n Automation</p>
                    <p className="text-sm text-muted-foreground">Workflow Automation</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="n8n-key" className="text-xs">
                      API Key
                    </Label>
                    <Input
                      id="n8n-key"
                      type="password"
                      value={n8nApiKey}
                      onChange={(e) => setN8nApiKey(e.target.value)}
                      placeholder="n8n API key"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="n8n-webhook" className="text-xs">
                      Webhook URL
                    </Label>
                    <Input
                      id="n8n-webhook"
                      type="url"
                      value={n8nWebhookUrl}
                      onChange={(e) => setN8nWebhookUrl(e.target.value)}
                      placeholder="https://your-n8n-instance.com/webhook/..."
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Connect additional integrations to extend Authority's capabilities. Integrations can be used as tools
                  during conversations.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voice-select">Authority's Voice</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger id="voice-select">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingVoices ? (
                      <SelectItem value="loading" disabled>
                        Loading voices...
                      </SelectItem>
                    ) : voices.length > 0 ? (
                      voices.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          {voice.name} {voice.category && `(${voice.category})`}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default">Default Voice (Bella)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the ElevenLabs voice that Authority will use when reading messages aloud. Requires ElevenLabs
                  API key.
                </p>
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">About ElevenLabs Voices</p>
                <p className="text-sm text-muted-foreground">
                  ElevenLabs provides high-quality, emotionally rich text-to-speech voices. Authority can use these
                  voices to bring characters and narratives to life with distinct personalities.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="background-upload">Custom Background Image</Label>
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  {backgroundImage && (
                    <div className="relative w-full h-32 rounded-md overflow-hidden">
                      <img
                        src={backgroundImage || "/placeholder.svg"}
                        alt="Background preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      id="background-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundUpload}
                      disabled={uploadingBackground}
                      className="flex-1"
                    />
                    <Button variant="outline" disabled={uploadingBackground} size="icon">
                      {uploadingBackground ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a custom background image for Authority's interface. Recommended size: 1920x1080px or larger.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Appearance</p>
                <p className="text-sm text-muted-foreground">
                  Dark theme with red accents is currently active. Additional themes coming soon.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Voice & Audio</p>
                <p className="text-sm text-muted-foreground">
                  Configure text-to-speech and voice input preferences in the Voice tab.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">Data & Privacy</p>
                <p className="text-sm text-muted-foreground">
                  All conversations are stored locally in your Supabase instance with Row Level Security enabled.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
