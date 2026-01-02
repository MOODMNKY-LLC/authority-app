# Notion Token Architecture Decision

## Overview

This document explains the architectural decision for handling Notion API access tokens in the Authority app.

## Two Approaches Available

### 1. OAuth Token (Current Attempt)
**How it works:**
- User authenticates with Notion via Supabase Auth OAuth
- Supabase handles the OAuth flow
- We attempt to extract the Notion access token from the session

**Pros:**
- Seamless user experience (one-click auth)
- No manual token entry required
- Integrated with Supabase Auth

**Cons:**
- Supabase Auth may not expose provider tokens directly
- OAuth tokens might have limited scopes/permissions
- Tokens might expire and need refresh handling
- Less control over permissions

**Current Status:**
- We're storing `notion_access_token` in `user_settings`
- But we need to extract it from Supabase session metadata
- May require additional OAuth callback handling

### 2. Personal Integration Token (Recommended)
**How it works:**
- User creates a personal Notion integration at notion.so/my-integrations
- User grants specific permissions (read/write databases, pages, etc.)
- User copies their integration token
- User enters token in Authority app settings

**Pros:**
- ✅ **Full control** - User explicitly grants permissions
- ✅ **More reliable** - Direct API access, no OAuth complexity
- ✅ **Better permissions** - Can request exactly what we need
- ✅ **Long-term access** - Tokens don't expire (unless revoked)
- ✅ **User-managed** - User can revoke/regenerate as needed
- ✅ **Works with duplicated templates** - Can access any workspace content

**Cons:**
- Requires manual setup step
- User needs to understand how to create integration
- Slightly more friction in onboarding

## Recommendation: Hybrid Approach

**Best Practice:** Support both methods, but prioritize personal integration token:

1. **Primary Method: Personal Integration Token**
   - Store in `user_settings.notion_token` (already exists)
   - Use for all Notion API operations
   - More reliable and predictable

2. **Fallback: OAuth Token** (if we can extract it)
   - Extract from Supabase session metadata if available
   - Use as fallback if personal token not set
   - Store in `user_settings.notion_access_token`

## Implementation Strategy

### Current State
- We have `notion_token` field (for personal integration tokens)
- We have `notion_access_token` field (for OAuth tokens)
- Verification endpoint checks `notion_access_token` first

### Recommended Changes

1. **Update verification to check both:**
   ```typescript
   const token = settings.notion_token || settings.notion_access_token
   ```

2. **Add UI for personal integration token entry:**
   - Settings page with token input
   - Instructions for creating integration
   - Token validation

3. **OAuth token extraction (if possible):**
   - Try to extract from `user.app_metadata.provider_token` during callback
   - Store in `notion_access_token` as fallback

## Why Personal Integration Token is Better

1. **Reliability**: OAuth tokens through Supabase might not be accessible or might expire
2. **Permissions**: Personal integrations allow explicit permission grants
3. **Control**: Users can manage their own tokens
4. **Template Access**: Works seamlessly with duplicated templates
5. **Long-term**: Tokens don't expire unless user revokes them

## User Flow (Recommended)

1. User authenticates with Authority (email/password or Notion OAuth)
2. User goes to Settings → Notion Integration
3. User creates integration at notion.so/my-integrations
4. User grants permissions (read/write databases, pages)
5. User copies integration token
6. User pastes token in Authority settings
7. Authority validates token and stores it
8. Authority verifies template databases exist
9. Ready to sync!

## Security Considerations

- ✅ Store tokens encrypted in database
- ✅ Never expose tokens in client-side code
- ✅ Use server-side API routes for all Notion operations
- ✅ Validate tokens before storing
- ✅ Allow users to revoke/regenerate tokens

## Conclusion

**Use Personal Integration Token as primary method** because:
- More reliable and predictable
- Better user control
- Works seamlessly with duplicated templates
- Aligns with Notion's best practices

OAuth token can remain as a fallback if we can extract it, but personal integration token should be the recommended approach.


