# Notion OAuth Sync Flow

## Overview

This document describes the OAuth-based Notion database sync flow for Authority app.

## Flow Diagram

```
1. User clicks "Sign in with Notion" (OAuth)
   ↓
2. User authorizes Authority in Notion
   ↓
3. Supabase processes OAuth callback
   ↓
4. Attempt to extract OAuth token (may not be available)
   ↓
5. User duplicates Authority template in Notion workspace
   ↓
6. User clicks "Sync with Notion" button
   ↓
7. App checks for OAuth/integration token
   ↓
8. App searches Notion workspace for databases
   ↓
9. App stores database IDs in user_settings
   ↓
10. App displays database status cards
```

## Implementation Details

### 1. OAuth Authentication

**File:** `app/auth/callback/route.ts`

- Handles Notion OAuth callback
- Attempts to extract provider token from session metadata
- Stores token in `user_settings.notion_access_token` if available

**Note:** Supabase may not expose provider tokens directly. If unavailable, users can:
- Use integration token as fallback
- Sync will work with either token type

### 2. Database Sync Endpoint

**File:** `app/api/notion/sync-databases/route.ts`

**Functionality:**
- Checks for OAuth or integration token
- Searches Notion workspace for required databases:
  - Characters
  - Worlds
  - Stories
  - Chat Sessions
- Queries each database to get:
  - Total page count
  - Sample pages (first 5)
  - Last edited dates
- Stores database IDs in `user_settings.notion_databases`
- Returns database info for UI display

### 3. Sync Button Component

**File:** `components/notion-sync-button.tsx`

**Features:**
- "Sync with Notion" button
- Loading state during sync
- Success/error feedback
- Database status cards showing:
  - Database name and ID
  - Total page count
  - Recent pages with links
  - Last edited dates

### 4. OAuth Status Check

**File:** `app/api/notion/check-oauth/route.ts`

**Purpose:**
- Checks if user has OAuth token
- Checks if user has integration token
- Determines if sync is possible
- Provides guidance if not ready

## User Flow

### Step 1: Authenticate with Notion

1. User clicks "Sign in with Notion" in login page
2. Redirects to Notion OAuth consent screen
3. User authorizes Authority
4. Redirects back to app
5. OAuth callback processes session

### Step 2: Duplicate Template

1. User receives Authority template link
2. User duplicates template in their Notion workspace
3. Template includes pre-configured databases:
   - Characters
   - Worlds
   - Stories
   - Chat Sessions

### Step 3: Sync Databases

1. User opens Admin Panel → API Keys → Notion
2. User clicks "Sync with Notion" button
3. App checks for OAuth/integration token
4. App searches workspace for databases
5. App stores database IDs
6. App displays database status cards

### Step 4: Use Synced Databases

1. Databases are now available for:
   - Content sync (Characters, Worlds, Stories → Notion)
   - Chat session sync
   - RAG integration
   - Knowledge base queries

## Token Handling

### OAuth Token (Preferred)

- Extracted during OAuth callback (if available)
- Stored in `user_settings.notion_access_token`
- Used for all Notion API operations
- May not be accessible (Supabase limitation)

### Integration Token (Fallback)

- User creates personal integration
- User enters token manually
- Stored in `user_settings.notion_token`
- More reliable, full API access

### Hybrid Approach

The sync endpoint checks both token types:
```typescript
const notionToken = settings.notion_access_token || settings.notion_token
```

## Database Discovery

### Search Process

1. Use Notion Search API to find all databases
2. Filter by database title matching required names
3. For each found database:
   - Query to verify accessibility
   - Get total page count
   - Get sample pages
   - Store database ID

### Database Storage

Stored in `user_settings.notion_databases` as JSON:
```json
{
  "Characters": "database-id-1",
  "Worlds": "database-id-2",
  "Stories": "database-id-3",
  "Chat Sessions": "database-id-4"
}
```

## Error Handling

### No Token Available
- Shows message: "Please authenticate with Notion OAuth"
- Provides link to OAuth flow
- Suggests integration token as alternative

### Databases Not Found
- Lists missing databases
- Provides instructions to duplicate template
- Shows which databases are synced vs missing

### API Errors
- Catches Notion API errors
- Shows user-friendly error messages
- Logs detailed errors for debugging

## UI Components

### Sync Button
- Prominent "Sync with Notion" button
- Loading spinner during sync
- Success/error indicators
- Disabled state when no token

### Database Status Cards
- Green pulsing indicator for synced databases
- Database name and ID
- Page count badge
- Recent pages list with Notion links
- Last edited dates

### Status Overview
- Quick view of all database sync status
- Count of synced vs total databases
- Visual indicators (green = synced, gray = not synced)

## Future Enhancements

1. **Auto-sync on template duplication**
   - Webhook to detect template duplication
   - Automatic database discovery

2. **Real-time sync status**
   - Poll for database changes
   - Update status indicators

3. **Database validation**
   - Verify database schema matches template
   - Check required properties exist

4. **Bulk operations**
   - Sync all content at once
   - Progress indicators for large syncs

## Troubleshooting

### Token Not Available
**Problem:** OAuth token not accessible after authentication

**Solution:**
- Use integration token as fallback
- Token extraction may not be supported by Supabase
- Integration token provides same functionality

### Databases Not Found
**Problem:** Sync doesn't find databases

**Solution:**
- Verify template was duplicated correctly
- Check database names match exactly
- Ensure databases are in user's workspace
- Verify token has access to workspace

### Sync Fails
**Problem:** Sync button shows error

**Solution:**
- Check token is valid
- Verify Notion API access
- Check network connectivity
- Review error message for details

## Security Considerations

- Tokens stored encrypted in database
- Never exposed to client-side
- Server-side validation only
- Per-user token isolation
- User can revoke access anytime


