# Notion MCP Implementation Guide

## Overview

This guide explains how Notion MCP is implemented in the Authority app and how to use it.

## Architecture

### MCP Client vs MCP Server

**Important**: We are building an **MCP Client**, not an MCP server.

- **MCP Client**: Connects to external MCP servers (like Notion's) to use their tools
- **MCP Server**: Exposes tools/resources via MCP protocol for clients to use

We connect to Notion's official MCP server at `https://mcp.notion.com/mcp`.

## Authentication

### Token Priority

The system uses a priority-based token retrieval system:

1. **Session Provider Token** (Highest Priority)
   - Retrieved from Supabase Auth session (`session.provider_token`)
   - Most fresh and reliable
   - Automatically refreshed by Supabase Auth

2. **Stored OAuth Token**
   - From `user_settings.notion_access_token`
   - Stored during OAuth callback
   - Validated before use

3. **Integration Token** (Fallback)
   - From `user_settings.notion_token` (encrypted)
   - User-provided integration token
   - Decrypted and validated before use

### Token Validation

All tokens are validated before use by making a test API call to `https://api.notion.com/v1/users/me`.

### Token Refresh

- Session tokens are automatically refreshed by Supabase Auth
- Stored tokens are refreshed from session if available
- Invalid tokens trigger re-authentication prompts

## Implementation Details

### Files

1. **`lib/mcp/notion-client-enhanced.ts`**
   - Main MCP client implementation
   - Handles JSON-RPC 2.0 protocol
   - Connects to Notion MCP server

2. **`lib/mcp/notion-token-manager.ts`**
   - Token retrieval and validation
   - Token refresh logic
   - Priority-based token selection

3. **`lib/mcp/streamable-http-client.ts`**
   - Future enhancement for full Streamable HTTP
   - Currently uses regular HTTP POST
   - Placeholder for SSE/WebSocket implementation

### Usage Example

```typescript
import { listNotionMCPTools } from "@/lib/mcp/notion-client-enhanced"

// List available tools
const tools = await listNotionMCPTools(userId)
// Returns: Array of MCPTool objects

// Call a tool
import { callNotionMCPTool } from "@/lib/mcp/notion-client-enhanced"
const result = await callNotionMCPTool(
  userId,
  "notion_search",
  { query: "my search query" }
)
```

## Transport: Streamable HTTP

### Current Implementation

We use **regular HTTP POST** requests for JSON-RPC messages. This works for simple request/response patterns like:
- `initialize`
- `tools/list`
- `tools/call`

### Future: Full Streamable HTTP

For advanced features like:
- Streaming responses
- Real-time updates
- Multiple requests over persistent connection

We would implement full Streamable HTTP with:
- Server-Sent Events (SSE) or WebSocket
- Persistent connection management
- Bidirectional communication

See `lib/mcp/streamable-http-client.ts` for placeholder implementation.

## Error Handling

### Common Errors

1. **401 Unauthorized**
   - Token is invalid or expired
   - Solution: Re-authenticate with Notion OAuth

2. **No Token Found**
   - User hasn't authenticated
   - Solution: Connect via OAuth or add integration token

3. **Token Validation Failed**
   - Token format is wrong
   - Solution: Check token source and format

### Error Messages

All errors include actionable guidance:
- What went wrong
- Why it happened
- How to fix it

## Testing

### Manual Testing

1. Ensure user has Notion OAuth token or integration token
2. Toggle Notion MCP ON in settings
3. Check browser console for connection logs
4. Verify tools are listed

### Debugging

Enable detailed logging:
```typescript
console.log("[Notion MCP] ...") // Already implemented
```

Check:
- Token retrieval logs
- Token validation results
- MCP connection attempts
- Error details

## Troubleshooting

### Issue: 401 Unauthorized

**Check**:
1. Token exists in `user_settings`
2. Token is valid (check via Notion API)
3. Token hasn't expired
4. OAuth scopes include MCP access

**Fix**:
1. Re-authenticate with Notion OAuth
2. Or add/refresh integration token
3. Check Supabase Auth session for provider token

### Issue: No Tools Listed

**Check**:
1. MCP connection successful (no errors)
2. Token has proper permissions
3. Notion workspace accessible

**Fix**:
1. Verify token permissions
2. Check Notion workspace access
3. Review MCP server response

## Best Practices

1. **Always validate tokens** before use
2. **Use session tokens** when available (most fresh)
3. **Handle token expiration** gracefully
4. **Provide clear error messages** to users
5. **Log connection attempts** for debugging

## References

- [Notion MCP Documentation](https://developers.notion.com/docs/get-started-with-mcp)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Streamable HTTP Specification](https://modelcontextprotocol.io/specification/transport/streamable-http)


