# Notion MCP Server Auth Token Configuration

## Overview

The official Notion MCP server supports server-level authentication via the `--auth-token` flag. This is separate from Notion API authentication and provides an additional security layer for the MCP server itself.

## Two Authentication Layers

### 1. Server-Level Authentication (`--auth-token`)

**Purpose**: Authenticate clients connecting to the MCP server

**Configuration**:
```bash
npx @notionhq/notion-mcp-server --transport http --auth-token "your-secret-token"
```

**Client Requirement**:
- Must send `Authorization: Bearer <server-auth-token>` header
- Server validates this token before processing requests

**Use Case**: 
- Protect MCP server from unauthorized access
- Server handles Notion API calls internally
- Client doesn't need Notion token (server has it)

### 2. Notion API Authentication (`NOTION_TOKEN`)

**Purpose**: Authenticate MCP server to Notion API

**Configuration**:
```bash
NOTION_TOKEN=ntn_**** npx @notionhq/notion-mcp-server --transport http
```

**Server Requirement**:
- Server uses this token internally to call Notion API
- Client never sees this token
- Configured on server side (not client)

**Use Case**:
- Server makes Notion API calls on behalf of clients
- Centralized Notion authentication
- Client only authenticates to MCP server

## Architecture Comparison

### Scenario 1: Server Requires Auth Token

```
Client → MCP Server (with --auth-token)
  ├─ Authorization: Bearer <server-auth-token> ✅
  └─ Server validates auth token
  
MCP Server → Notion API
  ├─ Uses NOTION_TOKEN env var (configured on server)
  └─ Makes API calls internally
```

**Client Needs**:
- Server auth token only
- No Notion token required

### Scenario 2: Server Doesn't Require Auth Token

```
Client → MCP Server (without --auth-token)
  ├─ Authorization: Bearer <notion-token> ✅
  └─ Server uses client's Notion token
  
MCP Server → Notion API
  ├─ Uses client's Notion token
  └─ Makes API calls with client token
```

**Client Needs**:
- Notion token only
- No server auth token required

## Implementation in Our App

### Environment Variables

Add to `.env.local`:

```bash
# Option 1: Server-level auth token (if server requires it)
MCP_NOTION_SERVER_AUTH_TOKEN=your-server-auth-token-here

# Option 2: Notion token (if server doesn't require auth token)
MCP_NOTION_TOKEN=ntn_your_notion_oauth_token_here
```

### Token Priority

Our implementation prioritizes:

1. **Server Auth Token** (`MCP_NOTION_SERVER_AUTH_TOKEN`)
   - Used if server requires its own auth token
   - Sent in `Authorization: Bearer` header
   - Server handles Notion API calls internally

2. **User's OAuth Token** (`notion_access_token` from user_settings)
   - Used if no server auth token
   - Sent in `Authorization: Bearer` header
   - Server uses this for Notion API calls

3. **User's Integration Token** (`notion_token` from user_settings)
   - Fallback if OAuth token not available
   - Decrypted and sent in `Authorization: Bearer` header

4. **App-Level Notion Token** (`MCP_NOTION_TOKEN` from env)
   - Final fallback
   - Shared by all users

### Code Implementation

```typescript
// Priority 1: Server-level auth token
const serverAuthToken = process.env.MCP_NOTION_SERVER_AUTH_TOKEN

if (serverAuthToken) {
  // Server requires its own auth token
  headers["Authorization"] = `Bearer ${serverAuthToken}`
} else {
  // Priority 2: User's Notion token
  const notionToken = getUserNotionToken()
  headers["Authorization"] = `Bearer ${notionToken}`
}
```

## Determining Which Token to Use

### Check Server Configuration

1. **If server runs with `--auth-token`**:
   - Use `MCP_NOTION_SERVER_AUTH_TOKEN`
   - Server handles Notion API calls
   - Client doesn't need Notion token

2. **If server runs without `--auth-token`**:
   - Use Notion token (`MCP_NOTION_TOKEN` or user token)
   - Server uses client's token for Notion API calls
   - Client provides Notion token

### Testing

**Test Server Auth Token**:
```bash
curl -H "Authorization: Bearer <server-auth-token>" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "method": "initialize", "params": {}, "id": 1}' \
     https://notion-mcp.moodmnky.com/mcp
```

**Test Notion Token**:
```bash
curl -H "Authorization: Bearer <notion-token>" \
     -H "Notion-Version: 2022-06-28" \
     https://api.notion.com/v1/users/me
```

## Troubleshooting

### 403 Forbidden Error

**Possible Causes**:
1. Server requires auth token but we're sending Notion token
2. Server auth token is incorrect
3. Notion token is invalid/expired

**Solutions**:
1. Check if server runs with `--auth-token`
2. Add `MCP_NOTION_SERVER_AUTH_TOKEN` to `.env.local`
3. Verify token is correct
4. Test with curl to isolate issue

### 401 Unauthorized Error

**Possible Causes**:
1. No token provided
2. Token format incorrect
3. Server not configured for auth

**Solutions**:
1. Ensure token is in `.env.local`
2. Check token format (Bearer token)
3. Verify server configuration

## Recommendations

### For Self-Hosted Servers

1. **Use Server Auth Token** (Recommended):
   - More secure (separate auth layers)
   - Centralized Notion authentication
   - Better for multi-user scenarios

2. **Configuration**:
   ```bash
   # Server side
   npx @notionhq/notion-mcp-server --transport http --auth-token "secure-token"
   
   # Client side (.env.local)
   MCP_NOTION_SERVER_AUTH_TOKEN=secure-token
   ```

### For Development

1. **Use Notion Token** (Simpler):
   - No server auth token needed
   - Direct Notion API access
   - Easier to debug

2. **Configuration**:
   ```bash
   # Server side (no --auth-token)
   npx @notionhq/notion-mcp-server --transport http
   
   # Client side (.env.local)
   MCP_NOTION_TOKEN=ntn_****
   ```

## Next Steps

1. **Determine Server Configuration**:
   - Check if `notion-mcp.moodmnky.com` runs with `--auth-token`
   - Ask server administrator for auth token if needed

2. **Update `.env.local`**:
   - Add `MCP_NOTION_SERVER_AUTH_TOKEN` if server requires it
   - Or use `MCP_NOTION_TOKEN` if server doesn't require auth

3. **Test Connection**:
   - Restart dev server
   - Test Notion MCP connection
   - Check debug endpoint for diagnostics

---

**Last Updated**: 2026-01-03
**Status**: ✅ Implementation Complete
**Reference**: [Official Notion MCP Server](https://github.com/makenotion/notion-mcp-server)

