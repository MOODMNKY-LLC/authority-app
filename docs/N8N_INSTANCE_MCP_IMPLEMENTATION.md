# N8n Instance MCP Implementation Plan

## Overview

Implementation plan for adding n8n instance MCP server support to the Authority app, allowing users to connect to their own n8n instances instead of relying on the public MCP server.

## Requirements

### User Provides
1. **N8n Instance URL**: `https://slade-n8n.moodmnky.com`
2. **N8n API Key**: From n8n instance settings
3. **MCP Endpoint Path**: Usually `/mcp` (default)

### App Stores
1. Instance URL (encrypted)
2. API Key (encrypted)
3. MCP endpoint path
4. Connection status

## Implementation Steps

### Step 1: Update Server Configuration

**File**: `app/api/integrations/mcp/servers/route.ts`

Add new server type for n8n instance:

```typescript
{
  id: "n8n-instance",
  name: "N8n Instance",
  description: "Your n8n instance MCP server",
  requiresAuth: true,
  authType: "api_key",
  enabled: false,
  hasAuth: false,
  transport: "http",
  endpoint: userProvidedUrl || null, // User-provided
  config: {
    instanceUrl: userProvidedUrl,
    apiKey: encryptedApiKey,
    mcpPath: "/mcp", // Default
  }
}
```

### Step 2: Update Tools Route

**File**: `app/api/integrations/mcp/servers/tools/route.ts`

Add n8n instance authentication:

```typescript
if (serverId === "n8n-instance") {
  const instanceConfig = serverConfig?.config || {}
  const apiKey = instanceConfig.apiKey 
    ? decryptApiKey(instanceConfig.apiKey) 
    : null
  
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
    // Or alternative: headers["X-N8N-API-KEY"] = apiKey
  }
}
```

### Step 3: Update UI Component

**File**: `components/integrations/mcp-section.tsx`

Add n8n instance configuration dialog:

```typescript
// New state for n8n instance config
const [n8nInstanceUrl, setN8nInstanceUrl] = useState("")
const [n8nApiKey, setN8nApiKey] = useState("")
const [n8nMcpPath, setN8nMcpPath] = useState("/mcp")

// Configuration dialog for n8n instance
// Fields:
// - Instance URL input
// - API Key input (masked)
// - MCP Path input (default: /mcp)
```

### Step 4: Update Server List

**File**: `app/api/integrations/mcp/servers/route.ts`

Include n8n instance in server list:

```typescript
{
  id: "n8n-instance",
  name: "N8n Instance",
  description: "Connect to your n8n instance MCP server",
  requiresAuth: true,
  authType: "api_key",
  enabled: config["n8n-instance"]?.enabled || false,
  hasAuth: !!config["n8n-instance"]?.config?.apiKey,
  transport: "http",
  endpoint: config["n8n-instance"]?.endpoint || null,
}
```

## Configuration Flow

### User Flow

1. **User clicks "Add N8n Instance"**
   - Dialog opens with configuration fields

2. **User enters credentials**
   - Instance URL: `https://slade-n8n.moodmnky.com`
   - API Key: `eyJhbGc...` (from n8n settings)
   - MCP Path: `/mcp` (default)

3. **App saves configuration**
   - Encrypts API key
   - Stores instance URL
   - Constructs full MCP endpoint URL

4. **App tests connection**
   - Calls initialize
   - Lists tools
   - Shows connection status

## API Key Location in N8n

Users can find their API key:

1. Log into n8n instance
2. Go to **Settings** → **API**
3. Click **"Create API Key"** or copy existing
4. Format: Usually a JWT token or UUID

## MCP Endpoint Discovery

The MCP endpoint might be at:
- `/mcp` (common)
- `/api/v1/mcp` (alternative)
- `/api/mcp` (alternative)

We should:
1. Try `/mcp` first (default)
2. Allow user to specify custom path
3. Test connection and provide feedback

## Authentication Methods

N8n instances may use different auth methods:

### Method 1: Bearer Token
```typescript
headers["Authorization"] = `Bearer ${apiKey}`
```

### Method 2: Custom Header
```typescript
headers["X-N8N-API-KEY"] = apiKey
```

### Method 3: Query Parameter
```typescript
url = `${instanceUrl}/mcp?apiKey=${apiKey}`
```

We should try Bearer token first, then fall back to custom header.

## Testing

### Manual Test

```bash
# Test with Bearer token
curl -X POST https://slade-n8n.moodmnky.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test",
        "version": "1.0.0"
      }
    }
  }'
```

### Expected Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {...},
    "serverInfo": {
      "name": "n8n-instance",
      "version": "1.0.0"
    }
  }
}
```

## Error Handling

### Common Errors

1. **401 Unauthorized**
   - API key is invalid
   - API key doesn't have MCP permissions
   - Wrong authentication method

2. **404 Not Found**
   - MCP endpoint path is wrong
   - MCP server not enabled on instance
   - Instance URL is incorrect

3. **Connection Refused**
   - Instance is not accessible
   - Firewall blocking connection
   - Instance is down

## Benefits

1. **Direct Access**: Connect directly to user's n8n instance
2. **No Public Server Dependency**: Don't rely on public MCP server
3. **Instance-Specific Tools**: Access instance-specific workflows
4. **Better Performance**: Direct connection, no proxy
5. **Full Control**: User controls their own MCP server

## Migration Path

### From Public to Instance MCP

1. **Keep public MCP**: Don't remove, just add instance option
2. **Add instance MCP**: New server type alongside public
3. **User choice**: Let user choose which to use
4. **Gradual migration**: Users can switch when ready

## Next Steps

1. **Get Credentials**: User provides instance URL and API key
2. **Implement Configuration UI**: Add dialog for instance setup
3. **Update API Routes**: Add instance authentication logic
4. **Test Connection**: Verify instance MCP works
5. **Document**: Update user documentation

---

**Last Updated**: 2026-01-03
**Status**: 📋 Ready for Implementation
**Waiting For**: User credentials (instance URL and API key)

