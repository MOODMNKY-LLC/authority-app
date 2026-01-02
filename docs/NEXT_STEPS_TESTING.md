# Next Steps - Testing the Sync System

## Current Status

✅ **Infrastructure Complete:**
- Sync tables created
- Sync functions implemented
- Cron jobs scheduled
- API routes updated

✅ **Code Updates:**
- `/api/notion/sync-to-postgres` - Fixed authentication
- `/api/notion/query-synced` - New endpoint for querying synced data
- `/api/notion/search` - Updated to use sync tables first

## Testing Steps

### 1. Test Sync API Route

**With Authentication (Browser/Postman):**
```bash
# Make sure you're logged in, then:
curl -X POST http://localhost:3000/api/notion/sync-to-postgres \
  -H "Content-Type: application/json" \
  --cookie "your-auth-cookies"
```

**Check Response:**
- Should return `{"success": true, "results": [...]}` or `{"success": true, "synced_count": N}`

### 2. Verify Data in Sync Tables

```sql
-- Check if data was synced
SELECT COUNT(*) FROM notion_characters_sync;
SELECT COUNT(*) FROM notion_worlds_sync;
SELECT COUNT(*) FROM notion_stories_sync;

-- View sample data
SELECT name, description, last_synced_at 
FROM notion_characters_sync 
LIMIT 5;
```

### 3. Test Query Synced Endpoint

```bash
# Query synced characters
curl -X POST http://localhost:3000/api/notion/query-synced \
  -H "Content-Type: application/json" \
  -d '{"type": "character"}'

# Search synced content
curl -X POST http://localhost:3000/api/notion/query-synced \
  -H "Content-Type: application/json" \
  -d '{"query": "magic"}'
```

### 4. Test Updated Search Route

```bash
# Search with sync fallback (default)
curl -X POST http://localhost:3000/api/notion/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test character"}'

# Should return source: "synced" if data is fresh
# Should return source: "notion_api" if data is stale or missing
```

### 5. Test Cron Job Execution

```sql
-- Manually trigger sync function
SELECT * FROM sync_all_users_notion_databases();

-- Check cron job status
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-notion-databases')
ORDER BY start_time DESC 
LIMIT 5;
```

## Troubleshooting

### If Sync Returns Empty Results

1. **Check Notion connection:**
   ```sql
   SELECT user_id, 
     CASE 
       WHEN notion_access_token IS NOT NULL THEN 'OAuth'
       WHEN notion_token IS NOT NULL THEN 'Integration'
       ELSE 'None'
     END as token_type
   FROM user_settings
   WHERE user_id = 'your-user-id';
   ```

2. **Verify databases are synced:**
   ```sql
   SELECT notion_databases FROM user_settings WHERE user_id = 'your-user-id';
   ```

3. **Check for errors in sync:**
   - Look at browser console/network tab
   - Check server logs for `[Authority]` messages

### If Query Returns No Results

1. **Verify sync happened:**
   ```sql
   SELECT COUNT(*) FROM notion_characters_sync WHERE user_id = 'your-user-id';
   ```

2. **Check data freshness:**
   ```sql
   SELECT 
     name,
     last_synced_at,
     EXTRACT(EPOCH FROM (NOW() - last_synced_at))/60 as age_minutes
   FROM notion_characters_sync
   WHERE user_id = 'your-user-id'
   LIMIT 5;
   ```

3. **Trigger manual sync:**
   ```bash
   curl -X POST http://localhost:3000/api/notion/sync-to-postgres
   ```

## Expected Behavior

### After First Sync
- Sync tables should have data
- Query endpoints should return results
- Search should use synced data if fresh

### After 15 Minutes
- Cron job should automatically sync
- Data should stay fresh
- Queries should continue to use synced data

### If Sync Fails
- Search should fall back to Notion API
- User should still get results
- Error should be logged

## Performance Expectations

- **Sync time:** ~1-5 seconds per database (depends on page count)
- **Query time:** <100ms for synced data (vs 500-2000ms for Notion API)
- **Cron execution:** Should complete within 30 seconds for all users

## Next: Integration

Once testing is successful:

1. **Update frontend** to use new endpoints
2. **Add UI indicators** for data freshness
3. **Monitor sync performance** via cron logs
4. **Add error notifications** if sync fails repeatedly


