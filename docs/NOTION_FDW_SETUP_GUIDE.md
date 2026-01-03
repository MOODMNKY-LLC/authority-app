# Notion FDW Setup Guide

## Overview

This guide explains how to set up and use the Notion Foreign Data Wrapper (FDW) in the Authority app. The FDW allows you to query Notion data directly from PostgreSQL as if it were a table.

**Reference:** [Notion FDW Documentation](https://fdw.dev/catalog/notion/)

## Current Status

✅ **Migration 024** sets up the FDW infrastructure  
✅ **Per-user FDW servers** are created automatically when users connect Notion  
✅ **Helper functions** provide easy access to FDW queries

## Architecture

### Per-User Setup

Each user gets their own:
- **FDW Server** - Named `notion_fdw_<user_id_hash>`
- **Schema** - Named `notion_user_<user_id_hash>`
- **Foreign Tables** - Pages, Databases, Blocks, Users

This ensures:
- ✅ Data isolation (users only see their own Notion data)
- ✅ Security (each user's token is isolated)
- ✅ RLS compatibility (can add RLS policies if needed)

## Setup Process

### 1. Run Migration

The migration automatically sets up:
- Wrappers extension
- Wasm wrapper FDW
- Helper functions for per-user setup

```bash
supabase migration up
```

### 2. Automatic Setup (When User Connects Notion)

When a user connects their Notion account (OAuth or integration token), the FDW server and tables are created automatically via:

```sql
-- This happens automatically when user connects Notion
SELECT create_user_notion_fdw_tables('user-id-here');
```

### 3. Manual Setup (If Needed)

If you need to manually create FDW for a user:

```sql
-- Create FDW server and tables for a user
SELECT create_user_notion_fdw_tables('user-id-here');

-- Verify it was created
SELECT notion_fdw_server, notion_fdw_schema 
FROM user_settings 
WHERE user_id = 'user-id-here';
```

## Usage Examples

### Query a Specific Page

```sql
-- Get page data via FDW (always fresh)
SELECT * FROM query_notion_page_fdw('user-id', 'page-id-here');

-- Or query directly (if you know the schema name)
SELECT * FROM notion_user_<hash>.pages WHERE id = 'page-id';
```

### Extract Blocks for RAG

```sql
-- Get all blocks from a page (recursive, perfect for RAG)
SELECT * FROM get_notion_page_blocks_fdw('user-id', 'page-id-here');

-- This returns:
-- - id: Block ID
-- - type: Block type (paragraph, heading, etc.)
-- - content: Plain text content
-- - attrs: Full JSON attributes
```

### Query Databases

```sql
-- Get database structure
SELECT attrs FROM notion_user_<hash>.databases WHERE id = 'db-id';

-- Extract database title
SELECT attrs->'title'->0->>'plain_text' as title
FROM notion_user_<hash>.databases 
WHERE id = 'db-id';
```

### Query Users

```sql
-- Get user information
SELECT * FROM notion_user_<hash>.users WHERE id = 'user-id';

-- Extract user email
SELECT attrs->'person'->>'email' as email
FROM notion_user_<hash>.users 
WHERE id = 'user-id';
```

## Integration with Current System

### When to Use FDW

✅ **Use FDW for:**
- Block extraction (RAG content) - `get_notion_page_blocks_fdw()`
- On-demand fresh queries - `query_notion_page_fdw()`
- Complex joins with Notion data
- Database schema inspection

### When to Use Sync Tables

✅ **Use Sync Tables for:**
- Fast cached reads (frequent queries)
- Search across all content
- Offline capability
- Rate limit protection

### Hybrid Approach

```sql
-- Fast cached read (default)
SELECT * FROM notion_characters_sync WHERE user_id = 'user-id';

-- Fresh on-demand read (when needed)
SELECT * FROM query_notion_page_fdw('user-id', 'page-id');

-- Block extraction for RAG (FDW only)
SELECT * FROM get_notion_page_blocks_fdw('user-id', 'page-id');
```

## API Integration

### Create API Route for FDW Queries

```typescript
// app/api/notion/fdw-blocks/route.ts
export async function POST(request: NextRequest) {
  const { page_id } = await request.json()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Query blocks via FDW
  const { data, error } = await supabase.rpc('get_notion_page_blocks_fdw', {
    p_user_id: user.id,
    p_page_id: page_id
  })
  
  return NextResponse.json({ blocks: data })
}
```

## Troubleshooting

### FDW Server Not Created

```sql
-- Check if user has Notion token
SELECT user_id, 
  CASE 
    WHEN notion_token IS NOT NULL THEN 'Integration'
    WHEN notion_access_token IS NOT NULL THEN 'OAuth'
    ELSE 'None'
  END as token_type
FROM user_settings
WHERE user_id = 'user-id';

-- Manually create FDW server
SELECT create_user_notion_fdw_server('user-id');
```

### Foreign Tables Not Found

```sql
-- Check if schema exists
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name LIKE 'notion_user_%';

-- Recreate tables
SELECT create_user_notion_fdw_tables('user-id');
```

### Query Errors

```sql
-- Test FDW connection
SELECT * FROM notion_user_<hash>.pages LIMIT 1;

-- Check server exists
SELECT srvname FROM pg_foreign_server WHERE srvname LIKE 'notion_fdw_%';
```

## Security Considerations

1. **Per-User Isolation** - Each user's FDW server uses their own token
2. **RLS Ready** - Can add RLS policies to foreign tables if needed
3. **Token Storage** - Tokens stored in `user_settings` (consider Vault for production)
4. **Schema Isolation** - Each user has their own schema

## Performance Notes

- **FDW queries** are slower than sync tables (network calls to Notion API)
- **Use FDW** for on-demand fresh queries or block extraction
- **Use sync tables** for frequent queries (cached, faster)
- **Block queries** can be slow for large pages (recursive fetching)

## Next Steps

1. **Test FDW setup** - Create FDW for a test user
2. **Integrate block extraction** - Use for RAG content extraction
3. **Add API routes** - Create endpoints for FDW queries
4. **Monitor performance** - Track FDW query times vs sync tables

## References

- [Notion FDW Documentation](https://fdw.dev/catalog/notion/)
- [Supabase Wrappers](https://github.com/supabase/wrappers)
- [Notion API Documentation](https://developers.notion.com/reference)




