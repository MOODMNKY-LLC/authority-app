# Notion Foreign Data Wrapper (FDW) Analysis

## Current Status

**We are NOT currently using the Notion FDW.** We're using:
- Direct Notion API calls via HTTP
- PostgreSQL sync tables for cached reads
- Change detection and automatic syncing

## What is the Notion FDW?

The [Notion FDW](https://fdw.dev/catalog/notion/) is a WebAssembly foreign data wrapper that allows you to query Notion data directly from PostgreSQL as if it were a table.

**Capabilities:**
- ✅ Read-only access (SELECT queries)
- ✅ Supports Pages, Databases, Blocks, Users entities
- ✅ Query pushdown for `id` and `page_id` columns
- ✅ JSON attribute access via `attrs` column
- ❌ No INSERT/UPDATE/DELETE (read-only)

## Best Use Cases in Our App

### 1. **Block Extraction for RAG** ⭐ PRIMARY USE CASE
**Current:** Not implemented - would need API pagination  
**With FDW:** 
```sql
SELECT * FROM notion.blocks WHERE page_id = 'page-id';
```
**Benefit:** Recursive block fetching built-in, perfect for extracting page content for vector embeddings

### 2. **On-Demand Fresh Queries**
**Current:** Query sync tables (may be stale) or API (slower)  
**With FDW:**
```sql
SELECT * FROM notion.pages WHERE id = 'page-id';
```
**Benefit:** Always fresh data, no sync needed for one-off queries

### 3. **Complex Joins**
**Current:** Multiple API calls, join in application  
**With FDW:**
```sql
SELECT p.*, d.attrs->>'title' as db_title
FROM notion.pages p
JOIN notion.databases d ON p.attrs->>'parent'->>'database_id' = d.id;
```
**Benefit:** Single query, database handles joins

### 4. **Database Schema Inspection**
**Current:** API call to retrieve database structure  
**With FDW:**
```sql
SELECT attrs FROM notion.databases WHERE id = 'db-id';
```
**Benefit:** Can inspect properties, structure, etc.

## Per-User Configuration

**Challenge:** Each user has their own Notion integration token.

### Option A: One FDW Server Per User ✅ RECOMMENDED
- Create foreign server when user connects Notion
- Store server name in `user_settings.notion_fdw_server`
- Create foreign tables per user (or use RLS)
- **Pros:** Clean separation, RLS works naturally
- **Cons:** Many servers, requires management

### Option B: Single Server, Dynamic Queries
- One FDW server with system token
- Use SECURITY DEFINER functions to switch context
- **Pros:** Simpler, one server
- **Cons:** Complex function logic, less secure

### Option C: Hybrid Approach ✅ BEST FOR OUR APP
- System FDW server for admin/RAG (if pages are shared)
- User-specific via sync tables (current approach)
- On-demand FDW queries via temporary tables
- **Pros:** Flexible, covers all use cases
- **Cons:** More complex setup

## Recommended Implementation

### Phase 1: System-Level FDW (Simple)
For admin queries and RAG (if using shared pages):

```sql
-- Enable wrappers extension
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Enable Wasm wrapper
CREATE FOREIGN DATA WRAPPER wasm_wrapper
  HANDLER wasm_fdw_handler
  VALIDATOR wasm_fdw_validator;

-- Create server with system Notion token
CREATE SERVER notion_fdw_server
  FOREIGN DATA WRAPPER wasm_wrapper
  OPTIONS (
    fdw_package_url 'https://github.com/supabase/wrappers/releases/download/wasm_notion_fdw_v0.2.0/notion_fdw.wasm',
    fdw_package_name 'supabase:notion-fdw',
    fdw_package_version '0.2.0',
    api_key '<system-notion-token>'
  );

-- Create foreign tables
CREATE FOREIGN TABLE notion.pages (
  id text,
  url text,
  created_time timestamp,
  last_edited_time timestamp,
  archived boolean,
  attrs jsonb
) SERVER notion_fdw_server
OPTIONS (object 'page');

CREATE FOREIGN TABLE notion.blocks (
  id text,
  page_id text,
  type text,
  created_time timestamp,
  last_edited_time timestamp,
  archived boolean,
  attrs jsonb
) SERVER notion_fdw_server
OPTIONS (object 'block');
```

### Phase 2: Per-User FDW Servers (Advanced)
For user-specific queries:

```sql
-- Function to create FDW server for user
CREATE OR REPLACE FUNCTION create_user_notion_fdw_server(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  server_name TEXT;
  notion_token TEXT;
BEGIN
  -- Get user's Notion token
  SELECT notion_token INTO notion_token
  FROM user_settings
  WHERE user_id = p_user_id;
  
  IF notion_token IS NULL THEN
    RAISE EXCEPTION 'User has no Notion token';
  END IF;
  
  server_name := 'notion_server_' || encode(digest(p_user_id, 'sha256'), 'hex');
  
  -- Create server
  EXECUTE format('
    CREATE SERVER %I
    FOREIGN DATA WRAPPER wasm_wrapper
    OPTIONS (
      fdw_package_url ''https://github.com/supabase/wrappers/releases/download/wasm_notion_fdw_v0.2.0/notion_fdw.wasm'',
      fdw_package_name ''supabase:notion-fdw'',
      fdw_package_version ''0.2.0'',
      api_key %L
    )',
    server_name,
    notion_token
  );
  
  -- Store server name
  UPDATE user_settings
  SET notion_fdw_server = server_name
  WHERE user_id = p_user_id;
  
  RETURN server_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Integration with Current System

### Keep Sync Tables For:
- ✅ Fast cached reads (frequent queries)
- ✅ Offline capability
- ✅ Rate limit protection
- ✅ Change detection (only syncs changes)

### Use FDW For:
- ✅ Block extraction (RAG content)
- ✅ On-demand fresh queries
- ✅ Complex joins with Notion data
- ✅ Database schema inspection

### Hybrid Query Function:
```sql
CREATE OR REPLACE FUNCTION get_notion_page_fresh(
  p_user_id TEXT,
  p_page_id TEXT,
  use_fdw BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF use_fdw THEN
    -- Use FDW for fresh data
    SELECT attrs INTO result
    FROM notion.pages
    WHERE id = p_page_id;
  ELSE
    -- Use sync table for fast cached data
    SELECT properties INTO result
    FROM notion_pages_sync
    WHERE notion_page_id = p_page_id
      AND user_id = p_user_id;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Setup Steps

1. **Enable Wrappers Extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;
   ```

2. **Enable Wasm Wrapper:**
   ```sql
   CREATE FOREIGN DATA WRAPPER wasm_wrapper
     HANDLER wasm_fdw_handler
     VALIDATOR wasm_fdw_validator;
   ```

3. **Create FDW Server** (system-level or per-user)

4. **Create Foreign Tables** (pages, databases, blocks, users)

5. **Test Queries:**
   ```sql
   SELECT * FROM notion.pages LIMIT 5;
   SELECT * FROM notion.blocks WHERE page_id = 'your-page-id';
   ```

## When to Use FDW vs Sync Tables

| Use Case | Use FDW? | Use Sync Tables? |
|----------|----------|------------------|
| Frequent character/world lookups | ❌ | ✅ |
| Block extraction for RAG | ✅ | ❌ |
| On-demand fresh page query | ✅ | ❌ |
| Search across all content | ❌ | ✅ |
| Complex joins with Notion data | ✅ | ❌ |
| Offline capability | ❌ | ✅ |

## Conclusion

**Recommendation:** Implement FDW for **block extraction (RAG)** and **on-demand fresh queries**, while keeping sync tables for **fast cached reads**. This hybrid approach gives us the best of both worlds:
- Fast cached reads via sync tables
- Fresh real-time queries via FDW
- Perfect for RAG content extraction


