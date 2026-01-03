# Notion MCP OAuth Token Fix

## Problem

The remote Notion MCP server (`https://mcp.notion.com/mcp`) was returning `401 Unauthorized` with error `"Invalid token format"`. This was because:

1. We were storing Supabase's access token instead of Notion's OAuth token
2. Integration tokens (50 chars, start with `ntn_` or `secret_`) don't work with remote MCP server
3. Remote MCP server requires OAuth tokens (longer, different format)

## Solution

### 1. Token Verification in Callback

Updated `app/auth/callback/route.ts` to verify tokens before storing:

```typescript
// Verify token is actually a Notion OAuth token by testing with Notion API
const testResponse = await fetch("https://api.notion.com/v1/users/me", {
  headers: {
    Authorization: `Bearer ${tokenToStore}`,
    "Notion-Version": "2022-06-28",
  },
})

if (testResponse.ok) {
  // Token is valid for Notion API - store it
  verifiedNotionToken = tokenToStore
}
```

### 2. Token Type Detection

Created `lib/mcp/notion-token-detector.ts` to:
- Detect token type (OAuth vs integration)
- Verify token format
- Provide guidance based on token type

### 3. Enhanced Error Messages

Updated `lib/mcp/notion-client-enhanced.ts` to:
- Detect integration tokens and reject them with helpful error
- Provide clear guidance on what to do
- Log token analysis for debugging

## What We Capture During OAuth

### Current Flow:
1. User authenticates with Notion via Supabase Auth
2. Supabase handles OAuth flow
3. We attempt to extract `provider_token` from session
4. **NEW**: We verify it's a valid Notion token before storing
5. Store verified token in `user_settings.notion_access_token`

### Limitations:
- Supabase may not expose `provider_token` (security reasons)
- If `provider_token` unavailable, we can't get Notion OAuth token
- User may need to authenticate directly with Notion (not via Supabase)

## Alternative: Direct Notion OAuth

If Supabase doesn't provide `provider_token`, we can:
1. Handle Notion OAuth separately from Supabase Auth
2. Exchange authorization code directly with Notion API
3. Store the Notion access token

See `lib/mcp/notion-oauth-exchange.ts` for implementation.

## Testing

After this fix:
1. Authenticate with Notion OAuth
2. Check logs for token verification
3. Toggle Notion MCP ON
4. Should connect successfully if token is valid OAuth token

## References

- [Notion MCP Documentation](https://developers.notion.com/docs/get-started-with-mcp)
- [Notion OAuth Documentation](https://developers.notion.com/reference/authentication)


