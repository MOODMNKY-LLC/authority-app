# N8n MCP Server Troubleshooting

## Issue

The N8n MCP server is failing with:
```
401 Unauthorized - "Unterminated string in JSON at position 131"
```

## Analysis

This error occurs during the `initialize` request, before any tools are listed. The error message suggests:

1. **Malformed JSON Response**: The server is returning invalid JSON (unterminated string)
2. **Authentication Issue**: The 401 status suggests authentication, but the JSON parsing error indicates the response format is wrong
3. **Server-Side Bug**: This appears to be a bug in the N8n MCP server implementation

## Investigation Steps

### 1. Check N8n MCP Server Configuration

Verify the N8n MCP server is properly configured:
- Server URL: `https://n8n-mcp.moodmnky.com/mcp`
- Server is running and accessible
- No authentication required (based on `mcp-installation.md`)

### 2. Test Direct Connection

Test the N8n server directly:

```bash
curl -X POST https://n8n-mcp.moodmnky.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
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

### 3. Check Server Logs

Review the N8n MCP server logs for:
- JSON serialization errors
- Authentication failures
- Response formatting issues

### 4. Verify Server Implementation

The N8n MCP server may need:
- Proper JSON serialization
- Correct error handling
- Proper MCP protocol compliance

## Potential Solutions

### Option 1: Server-Side Fix (Recommended)

The N8n MCP server needs to be fixed to:
1. Properly serialize JSON responses
2. Handle errors without returning malformed JSON
3. Return proper MCP error responses

### Option 2: Client-Side Workaround

If the server cannot be fixed immediately:
1. Add special error handling for N8n
2. Attempt to parse partial JSON responses
3. Provide user-friendly error messages

### Option 3: Alternative N8n Integration

Consider:
1. Using N8n's REST API directly instead of MCP
2. Using a different N8n MCP server implementation
3. Waiting for server fix

## Current Status

- **Client Implementation**: ✅ Correctly handles session IDs and SSE parsing
- **Server Issue**: ❌ N8n server returns malformed JSON
- **Impact**: N8n MCP tools are unavailable until server is fixed

## Next Steps

1. Contact N8n MCP server maintainers about the JSON parsing error
2. Check if there's an updated version of the N8n MCP server
3. Consider alternative integration methods for N8n functionality
4. Monitor server status for fixes

---

**Last Updated**: 2026-01-03
**Status**: ⚠️ Server-Side Issue - Awaiting Fix

