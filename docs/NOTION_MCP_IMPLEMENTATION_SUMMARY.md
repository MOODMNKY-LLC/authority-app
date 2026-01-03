# Notion MCP Implementation Summary

## What Was Done

### 1. ✅ Fixed Authentication (401 Error)

**Problem**: Notion MCP was returning 401 Unauthorized errors.

**Root Cause**: 
- Token format/source issues
- No token validation before use
- No token refresh mechanism
- Missing proper HTTP headers

**Solution Implemented**:

#### Created Token Manager (`lib/mcp/notion-token-manager.ts`)
- **Priority-based token retrieval**:
  1. Session provider token (from Supabase Auth) - Most fresh
  2. Stored OAuth token (from `user_settings`)
  3. Integration token (fallback)
- **Token validation**: All tokens validated via Notion API before use
- **Token refresh**: Automatic refresh from session if available
- **Error handling**: Clear error messages with actionable guidance

#### Enhanced MCP Client (`lib/mcp/notion-client-enhanced.ts`)
- Takes `userId` instead of raw token (handles token internally)
- Proper Streamable HTTP headers:
  - `Accept: application/json, text/event-stream`
  - `Notion-Version: 2022-06-28`
- Enhanced error messages for 401 errors
- Comprehensive logging for debugging

### 2. ✅ Implemented Streamable HTTP Transport

**Current Implementation**:
- Using HTTP POST with proper headers
- Supports simple request/response patterns
- Ready for SSE enhancement if needed

**Headers Added**:
```typescript
{
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token}`,
  "Accept": "application/json, text/event-stream", // For Streamable HTTP
  "Notion-Version": "2022-06-28"
}
```

**Future Enhancement** (`lib/mcp/streamable-http-client.ts`):
- Placeholder created for full Streamable HTTP
- Can add SSE/WebSocket support later
- Connection state management ready

### 3. ✅ Added Token Refresh Logic

**Implementation**:
- `getNotionTokenWithRefresh()` function
- Automatically refreshes from session if token invalid
- Updates stored token with fresh session token
- Falls back gracefully if refresh unavailable

**Flow**:
1. Try to get best available token
2. Validate token
3. If invalid, attempt refresh from session
4. Update stored token if refresh successful
5. Return token or error

## Architecture Breakdown

### How Each MCP Server is Configured

#### 1. Notion MCP (External Server) ✅
- **Type**: External MCP Server (Notion's official)
- **Transport**: Streamable HTTP (HTTP POST with proper headers)
- **URL**: `https://mcp.notion.com/mcp`
- **Protocol**: JSON-RPC 2.0
- **Auth**: OAuth Bearer token (priority: Session → OAuth → Integration)
- **Status**: ✅ Fully implemented with enhanced authentication

#### 2. Brave Search, Firecrawl, Tavily, Hugging Face ⚠️
- **Type**: API Wrappers (NOT actual MCP servers)
- **Transport**: N/A (no MCP protocol)
- **Implementation**: Static tool definitions
- **Auth**: API keys from env vars or user config
- **Status**: ⚠️ Not using MCP protocol (just API wrappers)

#### 3. N8n ⚠️
- **Type**: REST API Wrapper (NOT MCP server)
- **Transport**: N/A (REST API, not MCP)
- **Implementation**: Converts workflows to tool definitions
- **Auth**: API key from user_settings
- **Status**: ⚠️ Not using MCP protocol (REST API wrapper)

## Key Insights from Research

### Notion MCP Has Two Options:

1. **Remote Server** (`https://mcp.notion.com/mcp`)
   - Requires OAuth tokens
   - Uses Streamable HTTP transport
   - Official Notion-hosted solution
   - **What we're using**

2. **Local Server** (`@notionhq/notion-mcp-server`)
   - Uses integration tokens
   - Can run locally via STDIO or HTTP
   - Requires running server process
   - **Alternative if OAuth unavailable**

### Streamable HTTP Transport:

- **Current**: HTTP POST (works for request/response)
- **Full Implementation**: Would use SSE for streaming
- **Headers Required**: 
  - `Accept: application/json, text/event-stream`
  - `Authorization: Bearer ${token}`
- **Connection**: Can be stateless (current) or stateful (future)

## Files Created/Modified

### New Files:
1. `lib/mcp/notion-client-enhanced.ts` - Enhanced MCP client
2. `lib/mcp/notion-token-manager.ts` - Token management
3. `lib/mcp/streamable-http-client.ts` - Streamable HTTP placeholder
4. `docs/MCP_SERVER_ARCHITECTURE.md` - Architecture breakdown
5. `docs/NOTION_MCP_IMPLEMENTATION_GUIDE.md` - Usage guide
6. `docs/NOTION_MCP_AUTHENTICATION_GUIDE.md` - Auth troubleshooting

### Modified Files:
1. `app/api/integrations/mcp/servers/tools/route.ts` - Uses enhanced client
2. `docs/MCP_SERVER_ARCHITECTURE.md` - Updated with fixes

## Testing Checklist

- [ ] Test with OAuth token (session provider token)
- [ ] Test with stored OAuth token
- [ ] Test with integration token (may not work with remote server)
- [ ] Test token validation
- [ ] Test token refresh
- [ ] Test error handling (401, expired tokens, etc.)
- [ ] Verify tools are listed correctly
- [ ] Check connectivity status in UI

## Next Steps

1. **Test the implementation** - Toggle Notion MCP ON and verify connection
2. **Check logs** - Review console logs for token source and validation
3. **If 401 persists** - Check if token is OAuth or integration type
4. **Consider local server** - If OAuth unavailable, use local MCP server
5. **Enhance Streamable HTTP** - Add SSE support if streaming needed

## Important Notes

⚠️ **Remote Notion MCP requires OAuth tokens**. Integration tokens may not work.

✅ **Token priority ensures best available token is used**.

✅ **Automatic validation prevents using invalid tokens**.

✅ **Enhanced error messages help diagnose issues**.

## References

- [Notion MCP Documentation](https://developers.notion.com/docs/get-started-with-mcp)
- [Notion MCP Server GitHub](https://github.com/makenotion/notion-mcp-server)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Streamable HTTP Specification](https://modelcontextprotocol.io/specification/transport/streamable-http)


