# Notion Webhooks and Previews Integration Plan

## Executive Summary

This document outlines the seamless integration of Notion webhooks (for real-time bidirectional sync) and Notion page previews (for rich content display) into Authority. These features enhance the user experience by providing instant updates and professional content presentation.

## Current State Analysis

### Existing Infrastructure
- ✅ Notion sync system (`/api/notion/sync-to-postgres`) with 15-minute cron polling
- ✅ Progressive enhancement model (OAuth vs Integration Token tiers)
- ✅ Webhook capability detection (`lib/notion/capabilities.ts`)
- ✅ Forge pages displaying Notion content as table data
- ✅ Supabase Realtime infrastructure

### Gaps Identified
- ❌ No inbound Notion webhooks (Notion → Authority)
- ❌ No real-time sync (requires manual refresh or polling)
- ❌ No rich Notion page previews (only table rows)
- ❌ No webhook subscription management UI

## Integration Architecture

### Phase 1: Notion Webhook Infrastructure

#### 1.1 Webhook Endpoint (`/api/webhooks/notion/route.ts`)
```typescript
POST /api/webhooks/notion
- Verify signature using X-Notion-Signature header
- Handle verification challenge (GET request with challenge parameter)
- Process events: page.created, page.updated, page.deleted
- Map Notion page IDs to sync tables
- Upsert to Supabase sync tables
- Emit Supabase Realtime events for UI updates
```

**Event Processing Flow:**
1. Receive webhook payload from Notion
2. Verify signature using stored webhook secret
3. Extract event type and page data
4. Identify which sync table to update (based on database_id)
5. Fetch full page data from Notion API
6. Update corresponding sync table
7. Emit Realtime event for UI notification

#### 1.2 Database Schema Updates
```sql
-- Add webhook storage to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notion_webhooks JSONB DEFAULT '{}'::jsonb;

-- Structure:
-- {
--   "database_id": {
--     "webhook_id": "abc123",
--     "secret": "secret_key",
--     "active": true,
--     "created_at": "2024-01-01T00:00:00Z"
--   }
-- }
```

### Phase 2: Webhook Subscription Management

#### 2.1 API Endpoints
- `POST /api/notion/webhooks/create` - Create webhook subscription for a database
- `GET /api/notion/webhooks/list` - List all active webhook subscriptions
- `DELETE /api/notion/webhooks/delete` - Remove webhook subscription

#### 2.2 UI Component (`NotionWebhookSection`)
- Toggle switches for each synced database
- Status indicators (Active/Inactive)
- Webhook health monitoring
- Error handling and retry logic

**Features:**
- Only visible when integration token exists (Enhanced Mode)
- One-click enable/disable per database
- Visual feedback for webhook status
- Error messages with troubleshooting tips

### Phase 3: Notion Page Preview Components

#### 3.1 Preview Component (`NotionPagePreview`)
```typescript
interface NotionPagePreviewProps {
  pageId: string
  databaseId?: string
  onClose?: () => void
}
```

**Implementation Options:**
1. **Notion oEmbed API** (if available)
   - `https://www.notion.so/api/v3/getPublicPageData`
   - Requires public page or authenticated access

2. **Notion Public URL with iframe**
   - `https://www.notion.so/{pageId}?v={viewId}`
   - Works for public pages

3. **Rich Text Rendering** (Fallback)
   - Use sync table data (`properties` JSONB)
   - Render formatted content client-side
   - Show images, embeds, formatted text

#### 3.2 Integration Points
- Add "Preview" button to `ForgeDatabaseTable` rows
- Modal/drawer component for preview display
- "Open in Notion" link for full editing
- Auto-refresh when webhook updates content

### Phase 4: Real-time UI Updates

#### 4.1 Supabase Realtime Subscriptions
```typescript
// Subscribe to sync table changes
supabase
  .channel('notion-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'notion_characters_sync',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Show toast notification
    // Refresh affected Forge pages
    // Update preview if open
  })
  .subscribe()
```

#### 4.2 UI Enhancements
- Toast notifications: "Character 'Aragorn' updated in Notion"
- Auto-refresh Forge database tables
- Update preview modals in real-time
- "Last synced" timestamps with live updates
- Visual indicators for recently updated items

## Implementation Steps

### Step 1: Database Migration
```sql
-- Migration: 040_add_notion_webhooks.sql
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS notion_webhooks JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.notion_webhooks IS 'Notion webhook subscriptions: {database_id: {webhook_id, secret, active, created_at}}';
```

### Step 2: Webhook Endpoint
Create `/app/api/webhooks/notion/route.ts`:
- Handle GET (verification challenge)
- Handle POST (event processing)
- Signature verification
- Event routing to sync tables
- Realtime event emission

### Step 3: Webhook Management APIs
- `/app/api/notion/webhooks/create/route.ts`
- `/app/api/notion/webhooks/list/route.ts`
- `/app/api/notion/webhooks/delete/route.ts`

### Step 4: UI Components
- `components/notion-webhook-section.tsx` - Settings UI
- `components/notion-page-preview.tsx` - Preview component
- Update `components/forge-database-table.tsx` - Add preview buttons
- Update `components/notion-section.tsx` - Integrate webhook section

### Step 5: Real-time Integration
- Add Realtime subscriptions to Forge pages
- Toast notification system for updates
- Auto-refresh logic for database tables

## User Experience Flow

### Enabling Webhooks
1. User navigates to Settings → Notion
2. Sees "Webhooks" section (only if integration token exists)
3. Toggles "Enable Webhooks" for each database
4. System creates Notion webhook subscriptions automatically
5. Status indicator shows "Active" when working
6. Real-time updates appear automatically

### Viewing Previews
1. User browses Forge database table
2. Clicks "Preview" button on any row
3. Modal opens with rich Notion content
4. Shows formatted text, images, embeds
5. "Open in Notion" link for full editing
6. Preview updates automatically when content changes

### Real-time Updates
1. User edits content in Notion
2. Webhook triggers within seconds
3. Authority receives update via webhook
4. Supabase sync table updates
5. Realtime event fires
6. Toast notification appears: "Character updated"
7. Forge page auto-refreshes
8. Preview modal updates if open

## Benefits

### For Users
- ✅ Instant sync (no 15-minute delay)
- ✅ Rich content display (better than tables)
- ✅ Real-time collaboration feel
- ✅ Professional presentation
- ✅ Seamless bidirectional sync

### For Authority
- ✅ Reduced API calls (webhooks vs polling)
- ✅ Better user experience
- ✅ Competitive feature set
- ✅ Natural upgrade path (Enhanced Mode)
- ✅ Scalable architecture

## Technical Considerations

### Security
- Webhook signature verification (prevent spoofing)
- Secret key storage (encrypted in database)
- User-specific webhook routing
- Rate limiting on webhook endpoint

### Reliability
- Webhook retry logic (if Notion retries)
- Fallback to polling if webhooks fail
- Health monitoring and alerts
- Error logging and debugging

### Performance
- Efficient event processing
- Batch updates when possible
- Cache preview data
- Optimize Realtime subscriptions

## Progressive Enhancement Integration

### Tier 1: Connected Mode (OAuth Only)
- ❌ Webhooks not available
- ✅ Manual sync button
- ✅ Basic previews (from sync data)
- ✅ 15-minute polling sync

### Tier 2: Enhanced Mode (OAuth + Integration Token)
- ✅ Webhooks enabled
- ✅ Real-time sync
- ✅ Rich Notion previews
- ✅ Instant updates

## Success Metrics

- Webhook delivery rate > 99%
- Average sync latency < 5 seconds
- Preview load time < 2 seconds
- User engagement increase
- Reduced support tickets about sync delays

## Future Enhancements

1. **Webhook Analytics Dashboard**
   - Delivery rates
   - Event frequency
   - Error tracking

2. **Advanced Preview Features**
   - Inline editing
   - Comment threads
   - Version history

3. **Multi-workspace Support**
   - Webhooks per workspace
   - Cross-workspace sync

4. **Webhook Filters**
   - Subscribe to specific events only
   - Filter by page properties
   - Custom event routing



