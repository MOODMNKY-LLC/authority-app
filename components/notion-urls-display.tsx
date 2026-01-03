"use client"

import { useState, useEffect } from "react"
import { Copy, Check, ExternalLink, Webhook, Key, Trash2, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface NotionUrls {
  baseUrl: string
  urls: {
    webhook: string
    unfurlCallback: string
    oauthAuthorize: string
    oauthToken: string
    oauthDeleted: string
    oauthCallback: string
  }
  configuration: {
    oauthClientId: string
    oauthScopes: string
  }
  instructions: Record<string, string>
  unfurl?: {
    domain: string | null
    allowedDomains: string[]
    note: string
  }
}

export function NotionUrlsDisplay() {
  const { toast } = useToast()
  const [urls, setUrls] = useState<NotionUrls | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    loadUrls()
  }, [])

  const loadUrls = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/integrations/notion/urls")
      if (response.ok) {
        const data = await response.json()
        setUrls(data)
      }
    } catch (error) {
      console.error("Failed to load Notion URLs:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      })
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="text-center text-zinc-500">Loading URLs...</div>
        </CardContent>
      </Card>
    )
  }

  if (!urls) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="text-center text-red-400">Failed to load URLs</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Unfurl Callback URL */}
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            Unfurl Callback URL
          </CardTitle>
          <CardDescription>
            URL for Notion link preview/unfurling. Configure this in Notion's integration settings under "Unfurling domain & patterns".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-white">Unfurl Callback URL</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Unfurl Callback URL</p>
                  <p className="text-xs mb-2">
                    Called by Notion when a user clicks a link from your domain in a Notion page. 
                    Notion will request a preview of the page to display as a rich card.
                  </p>
                  <p className="text-xs text-zinc-300">
                    Handles both POST (unfurl request) and DELETE (unfurl removal) requests.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-zinc-300 font-mono break-all">
                {urls.urls.unfurlCallback}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(urls.urls.unfurlCallback, "Unfurl Callback URL")}
                className="shrink-0"
              >
                {copied === "Unfurl Callback URL" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {urls.unfurl && (
              <div className="mt-4 p-3 rounded-lg bg-blue-900/20 border border-blue-800/50">
                <p className="text-xs text-blue-300 mb-2">
                  <strong>Domain Verification:</strong> {urls.unfurl.note}
                </p>
                {urls.unfurl.domain && (
                  <p className="text-xs text-zinc-400">
                    Your domain: <code className="text-blue-400">{urls.unfurl.domain}</code>
                  </p>
                )}
                {urls.unfurl.allowedDomains.length > 0 && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Additional allowed domains: {urls.unfurl.allowedDomains.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Webhook className="h-5 w-5 text-purple-400" />
            Webhook URL
          </CardTitle>
          <CardDescription>
            Use this URL in Notion's webhook settings for real-time sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm text-zinc-300 font-mono break-all flex-1">
                {urls.urls.webhook}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(urls.urls.webhook, "Webhook URL")}
                className="shrink-0"
              >
                {copied === "webhook" ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            {urls.instructions.webhook}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-400" />
            OAuth Configuration URLs
          </CardTitle>
          <CardDescription>
            Required URLs for Notion link preview/unfurl setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth Authorize URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-white">OAuth Authorize URL</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{urls.instructions.oauthAuthorize}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm text-zinc-300 font-mono break-all flex-1">
                  {urls.urls.oauthAuthorize}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(urls.urls.oauthAuthorize, "OAuth Authorize URL")}
                  className="shrink-0"
                >
                  {copied === "oauthAuthorize" ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* OAuth Token URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-white">OAuth Token URL</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{urls.instructions.oauthToken}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm text-zinc-300 font-mono break-all flex-1">
                  {urls.urls.oauthToken}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(urls.urls.oauthToken, "OAuth Token URL")}
                  className="shrink-0"
                >
                  {copied === "oauthToken" ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Deleted Token Callback URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-white">Deleted Token Callback URL</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{urls.instructions.oauthDeleted}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm text-zinc-300 font-mono break-all flex-1">
                  {urls.urls.oauthDeleted}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(urls.urls.oauthDeleted, "Deleted Token Callback URL")}
                  className="shrink-0"
                >
                  {copied === "oauthDeleted" ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OAuth Callback URL (for reference) */}
      <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Label className="text-xs text-zinc-400">OAuth Callback URL (Internal)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-zinc-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">This is the internal callback URL used in the OAuth flow. Not configured in Notion settings.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <code className="text-xs text-zinc-500 font-mono break-all">{urls.urls.oauthCallback}</code>
          </div>
        </div>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-yellow-400" />
            OAuth Client Configuration
          </CardTitle>
          <CardDescription>
            Your OAuth client credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">OAuth Client ID</Label>
            <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm text-zinc-300 font-mono break-all flex-1">
                  {urls.configuration.oauthClientId}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(urls.configuration.oauthClientId, "OAuth Client ID")}
                  className="shrink-0"
                >
                  {copied === "oauthClientId" ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">OAuth Scopes</Label>
            <div className="p-3 rounded-md bg-zinc-950/50 border border-zinc-800/50">
              <code className="text-sm text-zinc-300 font-mono">
                {urls.configuration.oauthScopes}
              </code>
            </div>
            <p className="text-xs text-zinc-500">
              Optional scopes string. Default: "read"
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-800/50">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-200 mb-1">
              Configuration Instructions
            </p>
            <ol className="text-xs text-blue-300/80 space-y-1 list-decimal list-inside">
              <li>Copy each URL above and paste into your Notion integration settings</li>
              <li>Set OAuth Client ID to: <code className="bg-blue-900/30 px-1 rounded">{urls.configuration.oauthClientId}</code></li>
              <li>Set OAuth Scopes to: <code className="bg-blue-900/30 px-1 rounded">{urls.configuration.oauthScopes}</code></li>
              <li>Save your OAuth Client Secret securely (not displayed here)</li>
              <li>Test the webhook URL by creating a webhook in Notion</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}


