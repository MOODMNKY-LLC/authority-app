# Notion Wrapper & pg_cron Implementation Guide

## Overview

This document outlines how to leverage the Notion wrapper and pg_cron extensions to enhance the Authority app with automated syncing, faster queries, and better data consistency.

## Architecture

### Current Flow
```
User Action → Next.js API → Notion API → Response
```

### New Flow (with extensions)
```
User Action → Next.js API → PostgreSQL (synced data) → Response
                ↓
         pg_cron (background) → Notion API → PostgreSQL sync tables
```

## Benefits

### 1. Performance
- **Faster reads**: Query PostgreSQL instead of external Notion API
- **Reduced latency**: No network round-trip to Notion
- **Better caching**: PostgreSQL handles caching automatically

### 2. Reliability
- **Offline capability**: App works with cached Notion data
- **Rate limit protection**: Sync on schedule, not on-demand
- **Consistent data**: Single source of truth in PostgreSQL

### 3. Features
- **Unified search**: Search chats, characters, worlds in one query
- **Smart suggestions**: "You mentioned X character, here's their info"
- **Analytics**: Automated stats generation
- **RAG capabilities**: Vector search across Notion content

## Implementation Status

### ✅ Completed
- Migration 019: Created sync tables for Notion data
- Migration 020: Created sync and query functions
- Migration 021: Set up pg_cron jobs for automation

### 🔄 Next Steps

1. **Implement actual Notion wrapper integration**
   - Configure Notion wrapper extension connection
   - Update sync functions to use wrapper API
   - Test sync functionality

2. **Update API routes**
   - Modify `/api/notion/search` to query PostgreSQL first
   - Add fallback to Notion API if data stale
   - Update character/world lookup endpoints

3. **Add vector embeddings**
   - Create embeddings for Notion content
   - Enable semantic search with pg_vector
   - Integrate with chat context

4. **Monitoring**
   - Add logging for sync jobs
   - Track sync success/failure rates
   - Alert on sync failures

## Usage Examples

### Query synced Notion characters
```sql
SELECT * FROM get_notion_character('user-id', 'Aragorn');
```

### Search across all Notion content
```sql
SELECT * FROM search_notion_content('user-id', 'magic system');
```

### Manual sync trigger
```sql
SELECT * FROM sync_all_notion_databases('user-id');
```

## Cron Jobs

1. **sync-notion-databases** - Every 15 minutes
   - Syncs all user's Notion databases to PostgreSQL

2. **cleanup-temporary-chats** - Daily at 2 AM
   - Removes temporary chats older than 30 days

3. **aggregate-writing-stats** - Daily at 3 AM
   - Generates daily writing statistics

4. **refresh-notion-indexes** - Weekly on Sunday at 1 AM
   - Refreshes table statistics for better query performance

5. **cleanup-old-sync-records** - Weekly on Sunday at 4 AM
   - Removes sync records older than 90 days

## Future Enhancements

1. **Real-time sync** - Use Supabase Realtime to notify when Notion data changes
2. **Conflict resolution** - Detect and resolve conflicts between app and Notion
3. **Bidirectional sync** - Sync changes from PostgreSQL back to Notion
4. **Advanced analytics** - Writing patterns, character usage, world development metrics
5. **Smart recommendations** - "Characters you haven't used in a while"


