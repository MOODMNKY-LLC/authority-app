# Notion Token Implementation Guide

## Overview

This guide provides practical implementation patterns for using both OAuth tokens and integration tokens in Authority app's Notion integration.

---

## Token Retrieval Pattern

### Standard Token Getter Function

```typescript
// lib/notion/get-token.ts
import { createClient } from "@/lib/supabase/server"

export async function getNotionToken(userId: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data: settings } = await supabase
    .from("user_settings")
    .select("notion_token, notion_access_token")
    .eq("user_id", userId)
    .single()

  // Prioritize integration token (more reliable)
  return settings?.notion_token || settings?.notion_access_token || null
}
```

---

## Use Case Implementations

### 1. Template Verification

**File:** `app/api/notion/verify-template/route.ts`

```typescript
// Get token with fallback
const notionToken = settings.notion_token || settings.notion_access_token

if (!notionToken) {
  return NextResponse.json({
    verified: false,
    message: "Please add your Notion integration token in Settings",
    suggestion: "Create integration at notion.so/my-integrations"
  })
}

const notion = new Client({ auth: notionToken })
// ... verification logic
```

**Token Type:** Either works, but integration token preferred

---

### 2. Content Sync (App → Notion)

**File:** `app/api/notion/add-content/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { contentType, contentId, notionToken: providedToken } = await request.json()
  
  // Use provided token OR get from settings
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const token = providedToken || await getNotionToken(user.id)
  
  if (!token) {
    return NextResponse.json({ error: "Notion token required" }, { status: 400 })
  }
  
  const notion = new Client({ auth: token })
  // ... sync logic
}
```

**Token Type:** Integration token recommended (full permissions)

---

### 3. Workspace Search (RAG Integration)

**File:** `app/api/notion/search/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { query, notionToken: providedToken } = await request.json()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const token = providedToken || await getNotionToken(user.id)
  
  if (!token) {
    return NextResponse.json({ error: "Notion token required" }, { status: 400 })
  }
  
  // Search with token
  const response = await fetch(`${NOTION_API}/search`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ query, filter: { property: "object", value: "page" } })
  })
}
```

**Token Type:** Integration token preferred (better for programmatic access)

---

### 4. Database Querying

**File:** `app/api/notion/query-database/route.ts` (new)

```typescript
export async function POST(request: NextRequest) {
  const { databaseId, filter, sorts } = await request.json()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const token = await getNotionToken(user.id)
  if (!token) {
    return NextResponse.json({ error: "Notion token required" }, { status: 400 })
  }
  
  const notion = new Client({ auth: token })
  
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: filter,
    sorts: sorts,
  })
  
  return NextResponse.json({ results: response.results })
}
```

**Token Type:** Integration token (full query API access)

---

### 5. Webhook Setup (Bidirectional Sync)

**File:** `app/api/notion/webhooks/setup/route.ts` (new)

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Webhooks REQUIRE integration token
  const token = await getNotionToken(user.id)
  if (!token) {
    return NextResponse.json({
      error: "Integration token required for webhooks",
      message: "Please add your Notion integration token in Settings"
    }, { status: 400 })
  }
  
  // Setup webhook subscription
  const response = await fetch(`${NOTION_API}/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      // webhook configuration
    })
  })
}
```

**Token Type:** Integration token REQUIRED (OAuth won't work)

---

## OAuth Token Extraction (If Possible)

### Attempt in OAuth Callback

**File:** `app/auth/callback/route.ts`

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  
  if (code) {
    const supabase = await createServerClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Attempt to extract Notion provider token
      const providerToken = data.user.app_metadata?.provider_token
      const provider = data.user.app_metadata?.provider
      
      if (provider === "notion" && providerToken) {
        // Store as fallback token
        await supabase
          .from("user_settings")
          .upsert({
            user_id: data.user.id,
            notion_access_token: providerToken,
            notion_workspace_id: data.user.app_metadata?.workspace_id,
          })
      }
      
      // Also try user_metadata
      const userMetadataToken = data.user.user_metadata?.notion_access_token
      if (userMetadataToken) {
        await supabase
          .from("user_settings")
          .upsert({
            user_id: data.user.id,
            notion_access_token: userMetadataToken,
          })
      }
    }
    
    // ... rest of callback logic
  }
}
```

**Note:** This may not work depending on Supabase configuration. Integration token is more reliable.

---

## Token Validation

### Validate Token Before Use

```typescript
// lib/notion/validate-token.ts
import { Client } from "@notionhq/client"

export async function validateNotionToken(token: string): Promise<{
  valid: boolean
  workspaceId?: string
  workspaceName?: string
  error?: string
}> {
  try {
    const notion = new Client({ auth: token })
    const user = await notion.users.me()
    
    return {
      valid: true,
      workspaceId: user.id,
      workspaceName: user.name,
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || "Invalid token",
    }
  }
}
```

---

## UI Components

### Token Input Component

**File:** `components/notion-token-input.tsx` (new)

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, CheckCircle2, XCircle } from "lucide-react"

export function NotionTokenInput() {
  const [token, setToken] = useState("")
  const [validating, setValidating] = useState(false)
  const [valid, setValid] = useState<boolean | null>(null)
  
  const handleValidate = async () => {
    setValidating(true)
    try {
      const response = await fetch("/api/notion/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      setValid(data.valid)
      
      if (data.valid) {
        // Save token
        await fetch("/api/notion/databases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notionToken: token }),
        })
      }
    } catch (error) {
      setValid(false)
    } finally {
      setValidating(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notion Integration</CardTitle>
        <CardDescription>
          Connect your Notion workspace to sync content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-400 mb-2">
            1. Create a personal integration at{" "}
            <a
              href="https://notion.so/my-integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-400 hover:text-red-300 inline-flex items-center gap-1"
            >
              notion.so/my-integrations
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p className="text-sm text-gray-400 mb-2">
            2. Grant permissions: <strong>Read content</strong>,{" "}
            <strong>Update content</strong>, <strong>Insert content</strong>
          </p>
          <p className="text-sm text-gray-400 mb-4">
            3. Copy your integration token and paste it below
          </p>
        </div>
        
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="secret_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono"
          />
          <Button onClick={handleValidate} disabled={validating || !token}>
            {validating ? "Validating..." : "Validate & Save"}
          </Button>
        </div>
        
        {valid === true && (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Token validated successfully!</span>
          </div>
        )}
        
        {valid === false && (
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Invalid token. Please check and try again.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Error Handling Patterns

### Token Not Found

```typescript
if (!token) {
  return NextResponse.json({
    error: "Notion integration not configured",
    message: "Please add your Notion integration token in Settings",
    action: {
      type: "redirect",
      url: "/settings/notion",
      label: "Go to Settings"
    }
  }, { status: 400 })
}
```

### Token Invalid/Expired

```typescript
try {
  const notion = new Client({ auth: token })
  await notion.users.me()
} catch (error: any) {
  if (error.status === 401) {
    return NextResponse.json({
      error: "Notion token invalid or expired",
      message: "Please update your integration token in Settings",
      action: {
        type: "redirect",
        url: "/settings/notion",
        label: "Update Token"
      }
    }, { status: 401 })
  }
  throw error
}
```

---

## Best Practices

### 1. Always Check Both Token Types

```typescript
const token = settings.notion_token || settings.notion_access_token
```

### 2. Prioritize Integration Token

```typescript
// Integration token is more reliable
const token = settings.notion_token || settings.notion_access_token
```

### 3. Validate Before Use

```typescript
const validation = await validateNotionToken(token)
if (!validation.valid) {
  // Handle invalid token
}
```

### 4. Clear Error Messages

```typescript
if (!token) {
  return {
    error: "Notion integration required",
    message: "Create integration at notion.so/my-integrations",
    helpUrl: "https://notion.so/my-integrations"
  }
}
```

### 5. Store Tokens Securely

- ✅ Encrypt in database
- ✅ Never expose to client
- ✅ Server-side only operations
- ✅ Per-user tokens

---

## Migration Path

### For Existing Users

1. **Check if they have OAuth token**
   - If yes, use as fallback
   - Guide them to add integration token

2. **For new users**
   - Recommend integration token from start
   - OAuth for authentication only

3. **Gradual migration**
   - Support both during transition
   - Eventually deprecate OAuth for API (keep for auth)

---

## Testing Checklist

- [ ] Template verification with integration token
- [ ] Template verification with OAuth token (if available)
- [ ] Content sync with integration token
- [ ] Content sync with OAuth token (if available)
- [ ] Workspace search with both token types
- [ ] Webhook setup (integration token only)
- [ ] Token validation
- [ ] Error handling (no token, invalid token)
- [ ] Token refresh/update flow

---

## Summary

**Implementation Pattern:**
1. Always check both token types
2. Prioritize integration token
3. Provide clear guidance for setup
4. Handle errors gracefully
5. Support both during transition

**Code Pattern:**
```typescript
const token = settings.notion_token || settings.notion_access_token
if (!token) {
  // Guide user to create integration
}
const notion = new Client({ auth: token })
```

This hybrid approach gives us flexibility while prioritizing reliability.


