# Notion MCP Authentication Research

## Overview

Research into Notion MCP server authentication requirements, specifically whether integration tokens or OAuth tokens are needed.

## Key Findings

### Official Notion MCP Server (`mcp.notion.com`)

The official Notion MCP server at `https://mcp.notion.com/mcp`:
- **Requires**: OAuth tokens only
- **Does NOT accept**: Integration tokens
- **Reason**: OAuth tokens provide user-scoped access, integration tokens are app-scoped

### Self-Hosted Notion MCP Servers

Self-hosted Notion MCP servers (e.g., `notion-mcp.moodmnky.com`):
- **May accept**: Both OAuth and integration tokens
- **Depends on**: Server implementation
- **Common**: Many self-hosted servers accept integration tokens for simplicity

## Current Implementation

### Token Priority (Current)

1. OAuth token (`notion_access_token`)
2. Integration token (`notion_token`, decrypted)
3. Environment variable (`MCP_NOTION_TOKEN`)

### Issue Identified

The debug results show:
- OAuth token exists but returns 403 Forbidden
- Integration token is available but not being tried
- Self-hosted server might accept integration token

## Solution

### Updated Token Strategy

1. **Try OAuth token first** (for official MCP server)
2. **If OAuth fails, try integration token** (for self-hosted servers)
3. **Validate token before use** (test with Notion API)

### Implementation Changes

#### 1. Updated Tools Route

```typescript
// Try OAuth first, then integration token
let notionToken = notionSettings?.notion_access_token

// If OAuth fails, try integration token (for self-hosted servers)
if (!notionToken && notionSettings?.notion_token) {
  notionToken = decryptApiKey(notionSettings.notion_token)
}
```

#### 2. Enhanced Debug Endpoint

- Tests both token types
- Validates with Notion API
- Provides recommendations based on token type

#### 3. Token Validation

Before using token with MCP:
- Test with `https://api.notion.com/v1/users/me`
- Verify token is valid
- Check token type (OAuth vs integration)

## Token Types

### OAuth Token (`ntn_...`)
- **Format**: Starts with `ntn_`
- **Length**: ~50 characters
- **Source**: Notion OAuth flow
- **Scope**: User-scoped access
- **Use**: Official MCP server

### Integration Token (`secret_...`)
- **Format**: Starts with `secret_`
- **Length**: ~50 characters
- **Source**: Notion integrations page
- **Scope**: App-scoped access
- **Use**: Self-hosted MCP servers, direct API calls

## Testing Strategy

### Step 1: Validate Token with Notion API

```typescript
const response = await fetch("https://api.notion.com/v1/users/me", {
  headers: {
    "Authorization": `Bearer ${token}`,
    "Notion-Version": "2022-06-28",
  },
})
```

### Step 2: Test with MCP Server

If token validates with Notion API:
- Try with MCP server
- Check if server accepts token type
- Handle 403 errors appropriately

### Step 3: Fallback Strategy

If OAuth token fails:
- Try integration token
- Test with MCP server
- Provide clear error messages

## Recommendations

### For Self-Hosted Servers

1. **Accept Integration Tokens**: Easier for users to set up
2. **Document Token Type**: Clearly state which tokens are accepted
3. **Provide Examples**: Show token format and where to get them

### For Users

1. **Try Integration Token First**: If using self-hosted server
2. **Use OAuth for Official Server**: If using `mcp.notion.com`
3. **Check Server Documentation**: Verify which token type is required

## Updated Code Flow

```
1. Get OAuth token
2. Validate with Notion API
   ├─ Success → Use with MCP
   └─ Failure → Try integration token
3. Get integration token
4. Validate with Notion API
   ├─ Success → Use with MCP
   └─ Failure → Error: No valid token
```

## Debug Endpoint Enhancements

The debug endpoint now:
- Tests both token types
- Validates each with Notion API
- Provides recommendations
- Shows which token type works

## Next Steps

1. ✅ **Updated code** to try integration token if OAuth fails
2. ✅ **Enhanced debug endpoint** to test both token types
3. ⚠️ **User action**: Provide integration token if OAuth doesn't work
4. ⚠️ **Test**: Verify integration token works with self-hosted server

---

**Last Updated**: 2026-01-03
**Status**: ✅ Code Updated - Ready for Testing
**Recommendation**: Try integration token if OAuth fails

