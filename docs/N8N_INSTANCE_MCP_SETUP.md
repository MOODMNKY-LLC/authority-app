# N8n Instance MCP Server Setup

## Overview

N8n instances can run their own MCP (Model Context Protocol) servers, which provide direct access to workflows, executions, and automation capabilities. This is different from the public N8n MCP server and allows for instance-specific configuration.

## Research Findings

### N8n Instance MCP Server

N8n instances can expose MCP endpoints that:
- Provide access to workflows
- Allow workflow execution
- Enable workflow management
- Support instance-specific authentication

### Configuration Requirements

To use an N8n instance MCP server, you typically need:

1. **N8n Instance URL**: Your n8n instance URL (e.g., `https://slade-n8n.moodmnky.com`)
2. **API Key**: N8n instance API key for authentication
3. **MCP Endpoint**: Usually `/mcp` or `/api/v1/mcp` on your instance

### Authentication

N8n instance MCP servers typically use:
- **API Key Authentication**: Pass API key in `Authorization` header or `X-N8N-API-KEY` header
- **Bearer Token**: Some instances use Bearer token authentication

## Implementation

### Configuration Fields Needed

When configuring n8n instance MCP in the app, we need:

1. **Instance URL**: `https://slade-n8n.moodmnky.com`
2. **MCP Endpoint Path**: `/mcp` or `/api/v1/mcp`
3. **API Key**: User's n8n instance API key
4. **Full MCP URL**: `https://slade-n8n.moodmnky.com/mcp`

### API Key Location

Users can find their n8n API key:
1. Log into n8n instance
2. Go to Settings → API
3. Generate or copy existing API key
4. Format: Usually a UUID or JWT token

## Integration Steps

### 1. Add N8n Instance MCP Configuration

Add fields to MCP section for n8n instance:
- Instance URL input
- API Key input (encrypted storage)
- MCP endpoint path (default: `/mcp`)

### 2. Update Server Configuration

Modify `app/api/integrations/mcp/servers/route.ts` to support n8n instance:
- Add `n8n-instance` server type
- Use user-provided URL and API key
- Construct MCP endpoint URL

### 3. Update Authentication

Modify `app/api/integrations/mcp/servers/tools/route.ts`:
- Add n8n instance authentication logic
- Use API key in `Authorization` or `X-N8N-API-KEY` header
- Handle instance-specific endpoints

### 4. Update UI

Modify `components/integrations/mcp-section.tsx`:
- Add n8n instance configuration fields
- Show instance URL and API key inputs
- Display instance-specific tools

## Example Configuration

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
  endpoint: "https://slade-n8n.moodmnky.com/mcp", // User-provided
  config: {
    apiKey: "encrypted_api_key", // User-provided, encrypted
    instanceUrl: "https://slade-n8n.moodmnky.com", // User-provided
  }
}
```

## Authentication Header Format

```typescript
const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/event-stream",
  "Authorization": `Bearer ${apiKey}`, // Or
  "X-N8N-API-KEY": apiKey, // Alternative format
}
```

## Testing

### Test Initialize Request

```bash
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

## Benefits of Instance MCP

1. **Direct Access**: Direct connection to your n8n instance
2. **Workflow Management**: Full access to workflows and executions
3. **Instance-Specific**: Configured for your specific n8n setup
4. **Better Performance**: No public server dependency
5. **Custom Tools**: Instance-specific tools and capabilities

## Migration from Public N8n MCP

If the public N8n MCP server (`n8n-mcp.moodmnky.com`) is not working:

1. **Set up instance MCP**: Configure your n8n instance MCP server
2. **Add credentials**: Provide instance URL and API key
3. **Test connection**: Verify tools are available
4. **Update configuration**: Switch from public to instance MCP

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check API key is correct
   - Verify API key has proper permissions
   - Check authentication header format

2. **404 Not Found**
   - Verify MCP endpoint path (`/mcp` or `/api/v1/mcp`)
   - Check instance URL is correct
   - Ensure MCP server is enabled on instance

3. **Connection Refused**
   - Verify instance is accessible
   - Check firewall/network settings
   - Ensure instance is running

## Next Steps

1. **Get Credentials**: User provides n8n instance URL and API key
2. **Implement Configuration**: Add UI and API support for instance MCP
3. **Test Connection**: Verify instance MCP works correctly
4. **Update Documentation**: Document instance-specific setup

---

**Last Updated**: 2026-01-03
**Status**: 📋 Ready for Implementation
**Requires**: N8n instance URL and API key from user

