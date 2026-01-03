"use client"

import { useState, useEffect } from "react"
import { Brain, Key, Loader2, Check, CheckCircle2, Info, HelpCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI", description: "GPT-4, GPT-3.5, o1" },
  { value: "anthropic", label: "Anthropic", description: "Claude 3.5 Sonnet, Opus" },
  { value: "google", label: "Google", description: "Gemini Pro, Gemini Ultra" },
  { value: "mistral", label: "Mistral AI", description: "Mistral Large, Mixtral" },
  { value: "cohere", label: "Cohere", description: "Command, Command R+" },
]

export function AIProviderSection() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [provider, setProvider] = useState("openai")
  const [apiKey, setApiKey] = useState("")
  const [verified, setVerified] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/integrations/ai-provider")
      if (response.ok) {
        const data = await response.json()
        setProvider(data.provider || "openai")
        setApiKey(data.apiKey ? "••••••••" : "") // Show masked key if exists
        setVerified(data.verified || false)
        setUserInfo(data.userInfo || null)
      }
    } catch (error) {
      console.error("Failed to load AI provider settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!apiKey || apiKey === "••••••••") {
      toast({
        title: "API Key Required",
        description: "Please enter your API key first.",
        variant: "destructive",
      })
      return
    }

    setVerifying(true)
    try {
      const response = await fetch("/api/integrations/ai-provider/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      })

      const data = await response.json()

      if (data.verified) {
        setVerified(true)
        setUserInfo(data.userInfo)
        toast({
          title: "API Key Verified",
          description: `Successfully connected to ${AI_PROVIDERS.find(p => p.value === provider)?.label || provider}`,
        })
        await loadSettings() // Reload to get updated status
      } else {
        setVerified(false)
        setUserInfo(null)
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid API key",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify API key",
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey || apiKey === "••••••••") {
      toast({
        title: "API Key Required",
        description: "Please enter your API key.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/integrations/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provider || "openai",
          apiKey,
        }),
      })

      if (response.ok) {
        toast({
          title: "AI provider settings saved",
          description: "Your API key has been encrypted and saved securely.",
        })
        await loadSettings()
        // Auto-verify after saving
        await handleVerify()
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save AI provider settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-900/20 to-zinc-900/20 border border-emerald-900/30">
        <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
          <Brain className="h-6 w-6 text-emerald-400" />
          AI Provider Preferences
        </h2>
        <p className="text-zinc-400 text-sm">
          Configure your preferred AI provider and API key for Authority's responses. Your API key is encrypted and stored securely.
        </p>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            Provider Selection
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">AI Provider</p>
                <p className="text-xs">
                  Choose which AI provider Authority should use for generating responses. Different providers offer different models and capabilities.
                  Default is OpenAI (GPT-4o).
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Choose your AI provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai_provider" className="flex items-center gap-2">
              AI Provider
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Select your preferred AI provider. You'll need to provide an API key for the selected provider.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div>
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-zinc-400">{p.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              Select your preferred AI provider. Default: OpenAI. You'll need an API key from the selected provider.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            API Key
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">API Key Security</p>
                <p className="text-xs">
                  Your API key is encrypted using AES-256-GCM before storage. It's only decrypted when needed for API calls.
                  Never share your API key with anyone.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Enter your API key for the selected provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai_api_key" className="flex items-center gap-2">
              API Key
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Get your API key from {AI_PROVIDERS.find(p => p.value === provider)?.label || provider}'s website.
                    The key will be encrypted and verified before saving.
                  </p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-2">
              <Input
                id="ai_api_key"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  if (e.target.value !== "••••••••") {
                    setApiKey(e.target.value)
                  }
                }}
                placeholder={verified ? "API key saved (click to change)" : `Enter your ${AI_PROVIDERS.find(p => p.value === provider)?.label || "AI"} API key`}
                className="bg-zinc-950 border-zinc-800"
                disabled={verified && apiKey === "••••••••"}
              />
              {apiKey && apiKey !== "••••••••" && (
                <Button
                  onClick={handleVerify}
                  disabled={verifying}
                  variant="outline"
                  className="shrink-0 border-zinc-800 hover:bg-zinc-800"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Your API key is encrypted using AES-256-GCM before storage. Only the application can decrypt it for use.
              Get your API key from {AI_PROVIDERS.find(p => p.value === provider)?.label || provider}'s developer portal.
            </p>
          </div>

          {/* Verification Status */}
          {verified && userInfo && (
            <div className="p-3 rounded-md bg-green-900/20 border border-green-800/50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-400 mb-1">API Key Verified</p>
                  <p className="text-xs text-green-300/80">
                    Successfully connected to <span className="font-medium">{AI_PROVIDERS.find(p => p.value === provider)?.label || provider}</span>
                    {userInfo.name && ` as ${userInfo.name}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving || loading || !apiKey || apiKey === "••••••••"}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Save & Verify API Key
          </>
        )}
      </Button>
    </div>
  )
}
