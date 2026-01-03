"use client"

import { useState, useEffect } from "react"
import { Workflow, Key, Loader2, Check, RefreshCw, ExternalLink, CheckCircle2, XCircle, Info, HelpCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Hardcoded Flowise host (from .env) - use server-side env var if available
const FLOWISE_HOST = process.env.NEXT_PUBLIC_FLOWISE_HOST || process.env.FLOWISE_HOST || "https://flowise.ai"

export function FlowiseSection() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [verified, setVerified] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [chatflows, setChatflows] = useState<any[]>([])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/integrations/flowise")
      if (response.ok) {
        const data = await response.json()
        const hasKey = data.apiKey ? "••••••••" : ""
        setApiKey(hasKey)
        setVerified(data.verified || false)
        setUserInfo(data.userInfo || null)
        
        // Auto-verify if key exists but not verified
        if (hasKey && !data.verified) {
          console.log("[Flowise] Auto-verifying API key...")
          await handleVerify()
        }
      }
    } catch (error) {
      console.error("Failed to load Flowise settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (showToast = true) => {
    // If apiKey is masked (saved key), verify endpoint will use saved key
    const isMaskedKey = apiKey === "••••••••"
    
    if (!apiKey && !isMaskedKey) {
      if (showToast) {
        toast({
          title: "API Key Required",
          description: "Please enter your Flowise API key first.",
          variant: "destructive",
        })
      }
      return
    }

    // Silent verification (auto-verify on load) - only if not showing toast
    if (isMaskedKey && !showToast) {
      try {
        const response = await fetch("/api/integrations/flowise/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}), // Empty - will use saved key
        })
        const data = await response.json()
        if (data.verified) {
          setVerified(true)
          setUserInfo(data.userInfo)
        } else {
          setVerified(false)
          setUserInfo(null)
        }
      } catch (error) {
        console.error("[Flowise] Auto-verification failed:", error)
        setVerified(false)
      }
      return
    }

    setVerifying(true)
    try {
      // If key is masked, send empty body to use saved key; otherwise send the new key
      const response = await fetch("/api/integrations/flowise/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isMaskedKey ? {} : { apiKey }),
      })

      const data = await response.json()

      if (data.verified) {
        setVerified(true)
        setUserInfo(data.userInfo)
        if (showToast) {
          toast({
            title: "API Key Verified",
            description: `Connected as ${data.userInfo?.name || "Flowise user"}`,
          })
        }
        await loadSettings() // Reload to get updated status
      } else {
        setVerified(false)
        setUserInfo(null)
        if (showToast) {
          toast({
            title: "Verification Failed",
            description: data.error || "Invalid API key",
            variant: "destructive",
          })
        }
      }
    } catch (error: any) {
      setVerified(false)
      if (showToast) {
        toast({
          title: "Error",
          description: error.message || "Failed to verify API key",
          variant: "destructive",
        })
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey || apiKey === "••••••••") {
      toast({
        title: "API Key Required",
        description: "Please enter your Flowise API key.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Save the API key
      const saveResponse = await fetch("/api/integrations/flowise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      })

      if (!saveResponse.ok) {
        throw new Error("Failed to save settings")
      }

      // Verify the API key (verify endpoint will use saved key if apiKey not provided)
      const verifyResponse = await fetch("/api/integrations/flowise/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }), // Pass the key explicitly for verification
      })

      const verifyData = await verifyResponse.json()

      if (verifyData.verified) {
        setVerified(true)
        setUserInfo(verifyData.userInfo)
        toast({
          title: "Flowise settings saved & verified",
          description: `Connected as ${verifyData.userInfo?.name || "Flowise user"}`,
        })
        // Auto-fetch chatflows after successful verification
        await fetchChatflows()
      } else {
        setVerified(false)
        setUserInfo(null)
        toast({
          title: "Settings saved but verification failed",
          description: verifyData.error || "Invalid API key",
          variant: "destructive",
        })
      }

      await loadSettings()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save Flowise settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const fetchChatflows = async () => {
    // First verify the key is stored and functional
    if (!verified) {
      // Try to verify first
      await handleVerify(false) // Silent verification
      if (!verified) {
        toast({
          title: "Verification Required",
          description: "Please verify your API key first before fetching chatflows.",
          variant: "destructive",
        })
        return
      }
    }

    setFetching(true)
    try {
      const response = await fetch("/api/integrations/flowise/chatflows")
      if (response.ok) {
        const data = await response.json()
        setChatflows(data.chatflows || [])
        toast({
          title: "Chatflows loaded",
          description: `Found ${data.chatflows?.length || 0} chatflows.`,
        })
      } else {
        const error = await response.json()
        // If fetch fails, verification might have expired
        setVerified(false)
        throw new Error(error.error || "Failed to fetch chatflows")
      }
    } catch (error: any) {
      setVerified(false)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch chatflows. Your API key may need to be re-verified.",
        variant: "destructive",
      })
    } finally {
      setFetching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-gradient-to-r from-purple-900/20 to-zinc-900/20 border border-purple-900/30">
        <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
          <Workflow className="h-6 w-6 text-purple-400" />
          Flowise Integration
        </h2>
        <p className="text-zinc-400 text-sm">
          Connect to Flowise to manage and use your custom chatflows. Your API key is encrypted and stored securely.
        </p>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            API Configuration
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-zinc-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Flowise API Key</p>
                <p className="text-xs">
                  Your Flowise API key allows Authority to access your chatflows. Find it in your Flowise instance settings.
                  The key is encrypted before storage and can only be decrypted by the application.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Configure your Flowise API connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flowise_api_key" className="flex items-center gap-2">
              API Key
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Enter your Flowise API key. It will be encrypted and stored securely.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-2">
              <Input
                id="flowise_api_key"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  if (e.target.value !== "••••••••") {
                    setApiKey(e.target.value)
                  }
                }}
                placeholder={verified ? "API key saved (click to change)" : "Enter your Flowise API key"}
                className="bg-zinc-950 border-zinc-800"
                disabled={verified && apiKey === "••••••••"}
              />
              {(apiKey === "••••••••" || (apiKey && apiKey !== "••••••••")) && (
                <Button
                  onClick={() => handleVerify(true)}
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
                      {apiKey === "••••••••" ? "Re-verify" : "Verify"}
                    </>
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Your API key is encrypted using AES-256-GCM before storage. Only the application can decrypt it for use.
            </p>
          </div>

          {/* Connection Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Flowise Instance
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">This is the Authority Flowise instance URL (configured by administrators).</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{FLOWISE_HOST}</span>
                <Badge variant="outline" className="text-xs bg-blue-900/20 text-blue-400 border-blue-800/50">
                  Configured
                </Badge>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          {verified ? (
            <div className="p-3 rounded-md bg-green-900/20 border border-green-800/50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-400 mb-1">API Key Verified</p>
                  <p className="text-xs text-green-300/80">
                    {userInfo ? (
                      <>
                        Connected as: <span className="font-medium">{userInfo.name || "Flowise user"}</span>
                        {userInfo.email && ` (${userInfo.email})`}
                      </>
                    ) : (
                      "API key is stored and verified. Ready to use."
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : apiKey === "••••••••" ? (
            <div className="p-3 rounded-md bg-yellow-900/20 border border-yellow-800/50">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400 mb-1">Verification Failed</p>
                  <p className="text-xs text-yellow-300/80">
                    Your API key is stored but verification failed. Click "Verify" to test connectivity.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Chatflows</CardTitle>
              <CardDescription>Manage your Flowise chatflows</CardDescription>
            </div>
            <Button
              onClick={fetchChatflows}
              disabled={fetching || !verified}
              variant="outline"
              size="sm"
              className="border-zinc-800 hover:bg-zinc-800"
            >
              {fetching ? (
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
          {!verified ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Verify your API key to load chatflows
            </div>
          ) : chatflows.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {chatflows.map((chatflow: any) => (
                  <div
                    key={chatflow.id}
                    className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50 hover:border-purple-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-white">{chatflow.name}</h4>
                        {chatflow.description && (
                          <p className="text-xs text-zinc-400 mt-1">{chatflow.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {chatflow.category || "Uncategorized"}
                          </Badge>
                          {chatflow.isPublic && (
                            <Badge variant="outline" className="text-xs">
                              Public
                            </Badge>
                          )}
                        </div>
                      </div>
                      <a
                        href={`${FLOWISE_HOST}/chatflow/${chatflow.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Click Refresh to load your chatflows
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving || loading || !apiKey || apiKey === "••••••••"}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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
