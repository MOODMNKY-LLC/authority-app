# Notion MCP Authentication Guide

## Overview

Notion MCP has two deployment options, each with different authentication requirements:

1. **Remote MCP Server** (`https://mcp.notion.com/mcp`) - Uses OAuth
2. **Local MCP Server** (`@notionhq/notion-mcp-server`) - Uses Integration Tokens

## Remote MCP Server (What We're Using)

### Authentication Requirements

The remote Notion MCP server **requires OAuth tokens**, not integration tokens.

**Why 401 Errors Occur**:
- Using integration token instead of OAuth token
- Token expired or invalid
- Token not properly formatted
- Missing OAuth scopes

### How We Handle It

Our implementation (`lib/mcp/notion-client-enhanced.ts`) uses a priority system:

1. **Session Provider Token** (Best)
   - Retrieved from Supabase Auth session
   - Most fresh and reliable
   - Automatically refreshed by Supabase

2. **Stored OAuth Token** (Good)
   - From `user_settings.notion_access_token`
   - Captured during OAuth callback
   - Validated before use

3. **Integration Token** (Fallback)
   - From `user_settings.notion_token`
   - Works for Notion API but may not work for MCP
   - **Note**: Integration tokens may not work with remote MCP server

### Token Validation

All tokens are validated before use by calling `https://api.notion.com/v1/users/me`.

### Token Refresh

- Session tokens: Automatically refreshed by Supabase Auth
- Stored tokens: Refreshed from session if available
- Integration tokens: Cannot be refreshed (user must regenerate)

## Local MCP Server (Alternative)

If OAuth tokens are unavailable, you can use the local MCP server:

```bash
npx @notionhq/notion-mcp-server --transport http --port 3000
```

This server accepts integration tokens via `NOTION_TOKEN` environment variable.

**Configuration**:
```json
{
  "mcpServers": {
    "notionApi": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "ntn_****"
      }
    }
  }
}
```

## Troubleshooting 401 Errors

### Check Token Type

```typescript
// Check what token we're using
const tokenInfo = await getBestNotionToken(userId)
console.log("Token source:", tokenInfo?.source) // "session" | "oauth_stored" | "integration"
```

### Verify Token Validity

```typescript
const isValid = await verifyNotionToken(token)
console.log("Token valid:", isValid)
```

### Check Token Format

- OAuth tokens: Usually start with `secret_` or are longer strings
- Integration tokens: Start with `ntn_` or `secret_`

### Common Issues

1. **Using Integration Token with Remote Server**
   - **Problem**: Remote server requires OAuth
   - **Solution**: Use OAuth authentication or switch to local server

2. **Expired Token**
   - **Problem**: OAuth token expired
   - **Solution**: Re-authenticate via OAuth flow

3. **Token Not Captured During OAuth**
   - **Problem**: `provider_token` not available in session
   - **Solution**: Check OAuth callback implementation

4. **Missing OAuth Scopes**
   - **Problem**: Token doesn't have MCP access
   - **Solution**: Ensure OAuth flow requests proper scopes

## Best Practices

1. **Always validate tokens** before use
2. **Use session tokens** when available (most fresh)
3. **Handle token expiration** gracefully
4. **Provide clear error messages** to users
5. **Log token source** for debugging

## References

- [Notion MCP Documentation](https://developers.notion.com/docs/get-started-with-mcp)
- [Notion MCP Server GitHub](https://github.com/makenotion/notion-mcp-server)
- [Notion API Authentication](https://developers.notion.com/reference/authentication)


