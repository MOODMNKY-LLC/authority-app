# MCP Server Architecture Breakdown

## Overview

This document explains how each MCP server is configured in the Authority app. **Important**: We're implementing an **MCP Client** that connects to external MCP servers, not building our own MCP servers.

## Current Implementation Status

### ✅ Notion MCP (External MCP Server)

**Type**: External MCP Server (Notion's official server)  
**Transport**: Streamable HTTP (currently using regular HTTP POST)  
**Server URL**: `https://mcp.notion.com/mcp`  
**Protocol**: JSON-RPC 2.0 over HTTP

**Authentication**:
- **Method**: OAuth Bearer token
- **Token Source**: `user_settings.notion_access_token` or `user_settings.notion_token`
- **Header**: `Authorization: Bearer ${token}`
- **Issue**: Currently getting 401 Unauthorized - token format/source may be incorrect

**Implementation**:
- File: `lib/mcp/notion-client.ts`
- Function: `listNotionMCPTools(notionToken)`
- Process:
  1. Send `initialize` JSON-RPC request
  2. Send `tools/list` JSON-RPC request
  3. Parse and return tools

**Current Issue**: 
- 401 Unauthorized error suggests:
  - Token might be integration token instead of OAuth token
  - Token might be expired
  - Token might need to come from Supabase Auth instead of user_settings
  - Notion MCP might require specific OAuth scopes

**Next Steps**:
1. Verify token is OAuth token from Supabase Auth (not integration token)
2. Check if token needs refresh
3. Verify OAuth scopes include MCP access

---

### ⚠️ Brave Search, Firecrawl, Tavily, Hugging Face (NOT MCP Servers)

**Type**: API Wrappers (NOT actual MCP servers)  
**Transport**: N/A (no MCP protocol)  
**Implementation**: Static tool definitions

**Current Implementation**:
- **Brave Search**: Returns hardcoded `brave_search` tool schema
- **Firecrawl**: Returns hardcoded `firecrawl_scrape`, `firecrawl_crawl`, `firecrawl_search` tool schemas
- **Tavily**: Returns hardcoded `tavily_search`, `tavily_extract` tool schemas
- **Hugging Face**: Returns hardcoded `hf_inference`, `hf_embed`, `hf_search_models` tool schemas

**Authentication**:
- API keys from environment variables (`BRAVE_SEARCH_API_KEY`, `FIRECRAWL_API_KEY`, etc.)
- Fallback to user-configured API keys in `user_settings.mcp_config`

**Limitations**:
- ❌ Not using MCP protocol
- ❌ No actual connection to MCP servers
- ❌ Tools are static definitions, not dynamically discovered
- ✅ API keys are properly encrypted/decrypted
- ✅ Tools can be called via our API, but not through MCP protocol

**Future Enhancement**:
To make these true MCP servers, we would need to:
1. Set up HTTP/SSE MCP server endpoints
2. Implement JSON-RPC 2.0 protocol handlers
3. Expose tools via MCP `tools/list` method
4. Handle `tools/call` requests

---

### ⚠️ N8n (NOT MCP Server)

**Type**: REST API Wrapper (NOT MCP server)  
**Transport**: N/A (REST API, not MCP)  
**Implementation**: Converts n8n workflows to tool definitions

**Current Implementation**:
- Fetches workflows from n8n REST API: `${N8N_HOST}/api/v1/workflows`
- Converts each workflow to a tool definition
- Returns as array of tools

**Authentication**:
- API key from `user_settings.n8n_api_key` (encrypted)
- Header: `X-N8N-API-KEY: ${apiKey}`

**Limitations**:
- ❌ Not using MCP protocol
- ❌ Direct REST API calls, not MCP server connection
- ✅ Dynamically discovers workflows as tools
- ✅ Properly authenticates with n8n instance

**Future Enhancement**:
To make this a true MCP server, we would need to:
1. Set up an MCP server endpoint that proxies to n8n
2. Implement MCP protocol handlers
3. Convert workflow execution to MCP `tools/call` format

---

## Transport Mechanisms

### Streamable HTTP (Recommended for Notion MCP)

**What it is**: HTTP-based transport that supports:
- Multiple requests/responses over a single connection
- Server-sent events (SSE) for streaming responses
- Bidirectional communication

**Current Implementation**: 
- We're using regular HTTP POST requests
- Not implementing streaming or SSE
- Each request is independent (no connection persistence)

**Proper Implementation**:
```typescript
// Streamable HTTP would require:
// 1. Establishing a connection
// 2. Sending multiple JSON-RPC messages
// 3. Receiving streaming responses
// 4. Maintaining connection state
```

### SSE (Server-Sent Events)

**What it is**: One-way streaming from server to client  
**Notion MCP URL**: `https://mcp.notion.com/sse`  
**Current Status**: Not implemented

### STDIO (Local Server)

**What it is**: Standard input/output for local processes  
**Notion MCP Command**: `npx -y mcp-remote https://mcp.notion.com/mcp`  
**Current Status**: Not implemented (we're in a web app, not local)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Authority App (MCP Client)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Notion MCP Client                                    │ │
│  │  - Connects to: https://mcp.notion.com/mcp           │ │
│  │  - Protocol: JSON-RPC 2.0 over HTTP                   │ │
│  │  - Auth: OAuth Bearer token                           │ │
│  │  - Status: ⚠️ 401 Unauthorized                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  API Wrappers (NOT MCP Servers)                      │ │
│  │  - Brave Search: Static tool definitions              │ │
│  │  - Firecrawl: Static tool definitions                 │ │
│  │  - Tavily: Static tool definitions                    │ │
│  │  - Hugging Face: Static tool definitions              │ │
│  │  - N8n: Dynamic workflow → tool conversion            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST (JSON-RPC)
                              ▼
                    ┌─────────────────────┐
                    │  Notion MCP Server   │
                    │  (External)          │
                    │  mcp.notion.com      │
                    └─────────────────────┘
```

---

## Key Issues & Solutions

### Issue 1: Notion MCP 401 Unauthorized ✅ FIXED

**Problem**: Token authentication failing  
**Root Causes Identified**:
1. Using expired or invalid tokens
2. Not checking token validity before use
3. Not refreshing tokens when expired
4. Not prioritizing session tokens (most fresh)

**Solution Implemented**:
1. ✅ Created `notion-token-manager.ts` for centralized token management
2. ✅ Token priority: Session → Stored OAuth → Integration token
3. ✅ Automatic token validation before use
4. ✅ Token refresh mechanism
5. ✅ Enhanced error messages with actionable guidance
6. ✅ Updated MCP client to use token manager

**Files Updated**:
- `lib/mcp/notion-client-enhanced.ts` - Enhanced MCP client with proper token handling
- `lib/mcp/notion-token-manager.ts` - Centralized token management
- `app/api/integrations/mcp/servers/tools/route.ts` - Updated to use enhanced client

### Issue 2: Other "MCP Servers" Are Not Actually MCP Servers

**Problem**: Brave, Firecrawl, Tavily, Hugging Face are API wrappers, not MCP servers  
**Impact**: Tools work but don't use MCP protocol  
**Solution Options**:
1. **Option A**: Keep as-is (API wrappers work fine for our use case)
2. **Option B**: Build actual MCP servers for each service
3. **Option C**: Use existing MCP servers if available

### Issue 3: Transport Implementation

**Problem**: Using regular HTTP POST instead of Streamable HTTP  
**Impact**: Works for simple request/response but doesn't support streaming  
**Solution**: Implement proper Streamable HTTP with SSE support if needed

---

## Recommendations

1. **Fix Notion MCP Authentication**:
   - Verify OAuth token source and format
   - Implement token refresh if needed
   - Add better error handling and logging

2. **Clarify Architecture**:
   - Document that we're building an MCP client, not servers
   - Consider renaming "MCP Servers" section to "MCP Integrations" or "MCP Tools"

3. **Future Enhancements**:
   - Implement proper Streamable HTTP for Notion MCP
   - Consider building actual MCP servers for other services
   - Add MCP protocol compliance testing

---

## References

- [Notion MCP Documentation](https://developers.notion.com/docs/get-started-with-mcp)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Streamable HTTP Specification](https://modelcontextprotocol.io/specification/transport/streamable-http)

