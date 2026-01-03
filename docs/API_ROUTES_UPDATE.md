# API Routes Update - Using Sync Tables

## Overview

API routes have been updated to use PostgreSQL sync tables for faster queries, with fallback to Notion API when needed.

## Updated Routes

### 1. `/api/notion/sync-to-postgres` (Fixed)

**Changes:**
- ✅ Better authentication handling (supports cron jobs with user_id in body)
- ✅ Handles empty request body gracefully
- ✅ Improved error messages

**Usage:**
```bash
# Authenticated request (syncs current user)
curl -X POST http://localhost:3000/api/notion/sync-to-postgres \
  -H "Content-Type: application/json"

# Cron job request (with user_id)
curl -X POST http://localhost:3000/api/notion/sync-to-postgres \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-id-here"}'

# Sync specific database
curl -X POST http://localhost:3000/api/notion/sync-to-postgres \
  -H "Content-Type: application/json" \
  -d '{"database_id": "abc123", "database_name": "Characters"}'
```

### 2. `/api/notion/query-synced` (New)

**Purpose:** Query synced Notion data from PostgreSQL (fast reads)

**Request:**
```json
{
  "query": "magic system",  // Optional: full-text search
  "type": "character",      // Optional: "character", "world", or "story"
  "limit": 50               // Optional: default 50
}
```

**Response:**
```json
{
  "success": true,
  "results": [...],
  "count": 10,
  "is_stale": false,
  "age_minutes": 5,
  "message": "Data is fresh."
}
```

**Usage:**
```bash
# Search across all synced content
curl -X POST http://localhost:3000/api/notion/query-synced \
  -H "Content-Type: application/json" \
  -d '{"query": "magic system"}'

# Get all characters
curl -X POST http://localhost:3000/api/notion/query-synced \
  -H "Content-Type: application/json" \
  -d '{"type": "character"}'
```

### 3. `/api/notion/search` (Updated)

**Changes:**
- ✅ Checks sync tables first if `use_sync=true` (default)
- ✅ Returns synced data if fresh (< 15 minutes old)
- ✅ Falls back to Notion API if sync data is stale or unavailable
- ✅ Returns `source` field indicating data source

**Request:**
```json
{
  "query": "character name",
  "use_sync": true,  // Optional: default true
  "filter": {...}    // Optional: Notion API filter
}
```

**Response:**
```json
{
  "success": true,
  "source": "synced",  // or "notion_api"
  "results": [...],
  "count": 5
}
```

**Usage:**
```bash
# Search with sync fallback (default)
curl -X POST http://localhost:3000/api/notion/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Aragorn"}'

# Force Notion API search (bypass sync)
curl -X POST http://localhost:3000/api/notion/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Aragorn", "use_sync": false}'
```

## Query Flow

### Search Flow
```
User Request → /api/notion/search
    ↓
Check sync tables (if use_sync=true)
    ↓
Data fresh? (< 15 min)
    ├─ Yes → Return synced data ✅
    └─ No → Query Notion API → Return results
```

### Query Synced Flow
```
User Request → /api/notion/query-synced
    ↓
Query PostgreSQL sync tables
    ↓
Return results + freshness info
```

## Benefits

1. **Faster Reads** - PostgreSQL queries are much faster than Notion API
2. **Reduced API Calls** - Less load on Notion API, fewer rate limits
3. **Offline Capability** - App works with cached data
4. **Automatic Freshness** - Cron jobs keep data updated every 15 minutes
5. **Fallback Safety** - Always falls back to Notion API if sync fails

## Data Freshness

- **Fresh:** Data synced within last 15 minutes
- **Stale:** Data older than 15 minutes
- **Missing:** No synced data available

When data is stale, the API:
- Still returns synced data (fast)
- Indicates `is_stale: true` in response
- Optionally triggers background sync

## Next Steps

1. **Test the endpoints:**
   ```bash
   # Sync data first
   curl -X POST http://localhost:3000/api/notion/sync-to-postgres
   
   # Query synced data
   curl -X POST http://localhost:3000/api/notion/query-synced \
     -d '{"type": "character"}'
   
   # Search with sync
   curl -X POST http://localhost:3000/api/notion/search \
     -d '{"query": "test"}'
   ```

2. **Update frontend** to use new endpoints

3. **Monitor sync performance** - Check cron job logs

4. **Add more query endpoints** as needed (world lookup, story lookup, etc.)




