# PostgreSQL Extensions Status

## ✅ Enabled Extensions (Local)

| Extension | Version | Purpose |
|-----------|---------|---------|
| `wrappers` | 0.5.7 | Foreign Data Wrappers (FDW) - enables Notion FDW |
| `vector` | 0.8.0 | Vector similarity search (pg_vector) - for RAG embeddings |
| `pg_cron` | 1.6.4 | Scheduled jobs - automated Notion syncing |
| `pg_net` | 0.19.5 | HTTP client from PostgreSQL - cron job API calls |
| `uuid-ossp` | 1.1 | UUID generation - for primary keys |
| `pg_trgm` | 1.6 | Trigram matching - full-text search |
| `pgcrypto` | 1.3 | Cryptographic functions |
| `pg_stat_statements` | 1.11 | Query statistics |

## 🔧 Extension Usage

### wrappers (Notion FDW)
- **Status:** ✅ Enabled locally
- **Purpose:** Query Notion data directly from PostgreSQL
- **Use Cases:** Block extraction (RAG), fresh queries, complex joins
- **Production:** May need enabling via Supabase dashboard

### vector (pg_vector)
- **Status:** ✅ Enabled
- **Purpose:** Vector similarity search for RAG
- **Use Cases:** Semantic search across Notion content, chat context
- **Next:** Create embeddings table and store Notion content vectors

### pg_cron
- **Status:** ✅ Enabled
- **Purpose:** Automated scheduled jobs
- **Use Cases:** 
  - Sync Notion databases every 15 minutes
  - Cleanup old temporary chats daily
  - Aggregate writing statistics daily
  - Refresh indexes weekly

### pg_net
- **Status:** ✅ Enabled
- **Purpose:** HTTP client from PostgreSQL
- **Use Cases:** Cron jobs calling API routes for sync

### uuid-ossp
- **Status:** ✅ Enabled
- **Purpose:** UUID generation
- **Use Cases:** Primary keys in sync tables and other tables

## 📊 Extension Dependencies

```
wrappers
  └── wasm_wrapper (FDW)
      └── Notion FDW (per-user servers)

vector
  └── RAG embeddings (future)

pg_cron
  └── sync_notion_databases (every 15 min)
  └── cleanup_temporary_chats (daily)
  └── aggregate_writing_stats (daily)
  └── refresh_notion_indexes (weekly)
  └── cleanup_old_sync_records (weekly)

pg_net
  └── sync_notion_database_via_api() (cron jobs)
```

## 🚀 Next Steps

1. **Verify Production Extensions:**
   - Check Supabase dashboard → Database → Extensions
   - Enable `wrappers` if not already enabled
   - Verify all extensions match local

2. **Test FDW:**
   - Create FDW for test user
   - Query blocks from a Notion page
   - Verify RAG extraction works

3. **Vector Embeddings:**
   - Create embeddings table
   - Store Notion content as vectors
   - Enable semantic search

## 📝 Notes

- All extensions are enabled locally ✅
- Production may need manual enabling via dashboard
- FDW functions work once wrappers is enabled
- Sync tables work independently of FDW


