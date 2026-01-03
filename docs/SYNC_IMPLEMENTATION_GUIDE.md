# Notion Sync Implementation Guide

## Overview

The sync system bridges Notion API data with PostgreSQL sync tables, enabling fast queries and automated background syncing.

## Architecture

```
Notion API → /api/notion/sync-to-postgres → PostgreSQL Sync Tables
                ↓
         pg_cron (every 15 min) → Triggers sync for all users
```

## API Endpoint

### POST `/api/notion/sync-to-postgres`

Syncs Notion database content to PostgreSQL sync tables.

**Request Body:**
```json
{
  "database_id": "optional-database-id",
  "database_name": "optional-database-name",
  "user_id": "optional-user-id"
}
```

**If no database_id provided:** Syncs all databases for the user.

**Response:**
```json
{
  "success": true,
  "synced_count": 42,
  "database_name": "Characters"
}
```

Or for multiple databases:
```json
{
  "success": true,
  "results": [
    {
      "database_name": "Characters",
      "synced_count": 10,
      "status": "success"
    },
    {
      "database_name": "Worlds",
      "synced_count": 5,
      "status": "success"
    }
  ]
}
```

## How It Works

1. **Fetches pages from Notion** - Uses Notion API with pagination
2. **Extracts data** - Maps Notion properties to sync table columns
3. **Change detection** - Uses content hash to skip unchanged pages
4. **Upserts to PostgreSQL** - Updates sync tables efficiently

## Data Mapping

### Characters Database
- `Name` (title) → `name`
- `Description`/`Bio`/`Backstory` (rich_text) → `description`
- All properties → `properties` (JSONB)

### Worlds Database
- `World Name` (title) → `name`
- `Concept/Premise` (rich_text) → `description`
- All properties → `properties` (JSONB)

### Stories Database
- `Story Title` (title) → `title`
- `Premise` (rich_text) → `description`
- All properties → `properties` (JSONB)

### Chat Sessions Database
- `Session Title` (title) → `title`
- `Raw Transcript` (rich_text) → `transcript`
- `Message Count` (number) → `message_count`
- All properties → `properties` (JSONB)

## Usage

### Manual Sync (via API)

```bash
curl -X POST http://localhost:3000/api/notion/sync-to-postgres \
  -H "Content-Type: application/json" \
  -d '{"database_id": "abc123", "database_name": "Characters"}'
```

### Automatic Sync (via Cron)

The cron job `sync-notion-databases` runs every 15 minutes and calls `sync_all_users_notion_databases()`.

**Note:** Currently, the cron job function is a placeholder. To make it work:

1. **Option A:** Use pg_net extension to make HTTP calls from PostgreSQL
2. **Option B:** Keep sync logic in API route, trigger via external cron service
3. **Option C:** Implement sync logic directly in PostgreSQL function (requires Notion wrapper)

## Change Detection

The sync uses MD5 hashes of page properties + last_edited_time to detect changes:

- If hash matches existing record → Skip update
- If hash differs → Update sync table
- If page doesn't exist → Insert new record

This prevents unnecessary database writes and maintains accurate `updated_at` timestamps.

## Error Handling

- Individual page errors are logged but don't stop the sync
- Database-level errors return error status
- Failed syncs can be retried manually

## Performance Considerations

- **Pagination:** Processes 100 pages at a time
- **Batch upserts:** Uses PostgreSQL UPSERT for efficiency
- **Change detection:** Skips unchanged pages
- **Indexes:** Sync tables have indexes on `user_id`, `notion_page_id`, and `name`/`title`

## Next Steps

1. **Enable pg_net extension** to allow cron jobs to call API route
2. **Add monitoring** - Track sync success/failure rates
3. **Implement retry logic** - Handle transient Notion API errors
4. **Add sync statistics** - Track sync duration, pages processed, etc.
5. **Integrate Notion wrapper** - Direct PostgreSQL queries when available




