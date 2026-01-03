# Notion MCP Streamable HTTP Analysis

## Overview

Analysis of the official Notion MCP server repository and its implications for our self-hosted setup.

## Key Findings from Official Repository

### Transport Modes

The official Notion MCP server ([makenotion/notion-mcp-server](https://github.com/makenotion/notion-mcp-server)) supports two transport modes:

1. **STDIO Transport** (default)
   - For desktop clients (Claude Desktop, Cursor)
   - Uses standard input/output
   - Not applicable for web-based applications

2. **Streamable HTTP Transport** ⭐
   - For web-based applications
   - Uses standard HTTP POST requests
   - Returns JSON-RPC 2.0 responses (plain JSON, not SSE)
   - Endpoint: `http://0.0.0.0:<port>/mcp`

### Streamable HTTP Details

#### Running the Server

```bash
# Run with Streamable HTTP transport
npx @notionhq/notion-mcp-server --transport http

# Run on custom port
npx @notionhq/notion-mcp-server --transport http --port 8080

# Run with authentication token
npx @notionhq/notion-mcp-server --transport http --auth-token "your-secret-token"
```

#### Authentication

The Streamable HTTP transport requires bearer token authentication:

**Option 1: Auto-generated token (development)**
```bash
npx @notionhq/notion-mcp-server --transport http
# Server generates token and displays it
```

**Option 2: Custom token (production)**
```bash
npx @notionhq/notion-mcp-server --transport http --auth-token "your-secret-token"
```

**Option 3: Environment variable**
```bash
AUTH_TOKEN="your-secret-token" npx @notionhq/notion-mcp-server --transport http
```

#### Notion Token Configuration

The server requires a Notion token via environment variable:

```bash
NOTION_TOKEN=ntn_****  # OAuth token format
```

Or via `OPENAPI_MCP_HEADERS`:
```bash
OPENAPI_MCP_HEADERS='{"Authorization": "Bearer ntn_****", "Notion-Version": "2025-09-03"}'
```

#### Request Format

All requests must include:
- `Authorization: Bearer <auth-token>` header (for server authentication)
- `Content-Type: application/json` header
- `mcp-session-id: <session-id>` header (after initialize)

Example request:
```bash
curl -H "Authorization: Bearer your-token-here" \
     -H "Content-Type: application/json" \
     -H "mcp-session-id: your-session-id" \
     -d '{"jsonrpc": "2.0", "method": "initialize", "params": {}, "id": 1}' \
     http://localhost:3000/mcp
```

#### Response Format

- **Format**: Plain JSON (JSON-RPC 2.0)
- **NOT SSE**: Does not use Server-Sent Events format
- **Content-Type**: `application/json`

## Compatibility Analysis

### Our Current Implementation

Our generic MCP client (`lib/mcp/generic-client.ts`):

✅ **Handles Both Formats**:
- Parses SSE format (`event:`, `id:`, `data:`)
- Falls back to plain JSON if response starts with `{`
- Should work with Streamable HTTP responses

✅ **Authentication**:
- Includes `Authorization: Bearer ${token}` header
- Includes `Notion-Version: 2022-06-28` header
- Handles `mcp-session-id` header

⚠️ **Potential Issues**:
- `Accept: application/json, text/event-stream` header might confuse server
- Server might only support `application/json`
- Response parsing should work (checks for JSON first)

### Streamable HTTP vs SSE

| Feature | Streamable HTTP | SSE |
|---------|----------------|-----|
| **Protocol** | HTTP POST | HTTP GET with streaming |
| **Content-Type** | `application/json` | `text/event-stream` |
| **Response Format** | Plain JSON | `event:`, `id:`, `data:` lines |
| **Parsing** | Direct JSON.parse | Parse SSE format |
| **Session** | `mcp-session-id` header | `mcp-session-id` header |

## Implications for Our Setup

### Self-Hosted Server

Our server at `https://notion-mcp.moodmnky.com/mcp` might be:

1. **Running Official Notion MCP Server**
   - Uses Streamable HTTP transport
   - Returns plain JSON (not SSE)
   - Requires bearer token authentication
   - Our client should handle this ✅

2. **Custom Implementation**
   - Might use SSE (like other servers)
   - Might use Streamable HTTP
   - Our client handles both ✅

### Token Configuration

The official server expects:
- `NOTION_TOKEN` env var with `ntn_****` format (OAuth token)
- Token goes in `Authorization: Bearer` header for Notion API calls
- Server auth token goes in `Authorization: Bearer` header for MCP server

**Our Setup**:
- Token: `ntn_****` (OAuth token format) ✅
- Format matches (`ntn_` prefix) ✅
- Should work with official server ✅

## Recommendations

### 1. Update Accept Header (Optional)

For Streamable HTTP servers, we might want to use:
```typescript
Accept: application/json
```

Instead of:
```typescript
Accept: application/json, text/event-stream
```

However, our current implementation should work since we parse JSON first.

### 2. Verify Server Type

Check if `notion-mcp.moodmnky.com` is running:
- Official Notion MCP server (`@notionhq/notion-mcp-server`)
- Custom implementation
- Different MCP server

### 3. Test Token

Before updating `.env.local`, verify token works:
```bash
curl -H "Authorization: Bearer ntn_your_token_here" \
     -H "Notion-Version: 2022-06-28" \
     https://api.notion.com/v1/users/me
```

### 4. Update Environment Variable

Add to `.env.local`:
```bash
MCP_NOTION_TOKEN=ntn_your_notion_oauth_token_here
```

### 5. Test Connection

After updating:
1. Restart dev server
2. Test Notion MCP connection
3. Check debug endpoint for detailed diagnostics

## Expected Behavior

### If Server Uses Streamable HTTP

1. **Initialize Request**:
   - Send JSON-RPC `initialize` request
   - Receive plain JSON response (not SSE)
   - Extract `mcp-session-id` from response headers

2. **Tools List Request**:
   - Send JSON-RPC `tools/list` request
   - Include `mcp-session-id` header
   - Receive plain JSON response with tools array

3. **Response Parsing**:
   - Our `parseSSEResponse` function checks for JSON first
   - Should parse correctly ✅

### If Server Uses SSE

1. **Initialize Request**:
   - Send JSON-RPC `initialize` request
   - Receive SSE format response
   - Parse using SSE parsing logic

2. **Tools List Request**:
   - Send JSON-RPC `tools/list` request
   - Receive SSE format response
   - Parse using SSE parsing logic

## Conclusion

The official Notion MCP server uses **Streamable HTTP** (not SSE), but our client implementation should handle both formats correctly. The main issue is likely **authentication** (403 Forbidden), not transport compatibility.

**Next Steps**:
1. ✅ Update `.env.local` with new token
2. ✅ Restart dev server
3. ✅ Test connection
4. ✅ Verify token works with Notion API
5. ⚠️ If still failing, check server configuration

---

**References**:
- [Official Notion MCP Server Repository](https://github.com/makenotion/notion-mcp-server)
- [Streamable HTTP Transport Documentation](https://github.com/makenotion/notion-mcp-server#streamable-http-transport)

**Last Updated**: 2026-01-03
**Status**: ✅ Analysis Complete - Ready for Testing

