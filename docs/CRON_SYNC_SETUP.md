# Cron Sync Setup Guide

## Overview

The cron sync system automatically syncs Notion databases to PostgreSQL every 15 minutes using pg_cron and pg_net extensions.

## Prerequisites

- ✅ `pg_cron` extension enabled
- ✅ `pg_net` extension enabled
- ✅ Sync API route `/api/notion/sync-to-postgres` implemented
- ✅ Sync tables created (migration 019)

## Setup Steps

### 1. Configure API URL

Set the API URL that PostgreSQL can reach:

```sql
-- For local development (from Docker container to host)
SELECT set_sync_api_url('http://host.docker.internal:3000');

-- For production
SELECT set_sync_api_url('https://your-api-domain.com');
```

### 2. Verify Cron Jobs

Check that cron jobs are scheduled:

```sql
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'sync-notion-databases';
```

### 3. Test Manual Sync

Test the sync function manually:

```sql
-- Sync a specific database for a user
SELECT sync_notion_database(
  'user-id-here',
  'notion-database-id',
  'Characters'
);

-- Sync all databases for a user
SELECT * FROM sync_all_notion_databases('user-id-here');
```

### 4. Monitor Cron Execution

Check cron job execution history:

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-notion-databases')
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### Cron Job Not Running

1. **Check pg_cron is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check cron jobs exist:**
   ```sql
   SELECT * FROM cron.job;
   ```

3. **Check cron worker is running:**
   ```sql
   SELECT * FROM pg_stat_activity WHERE application_name = 'pg_cron';
   ```

### API Calls Failing

1. **Verify API URL is set:**
   ```sql
   SHOW app.api_url;
   ```

2. **Test API route manually:**
   ```bash
   curl -X POST http://localhost:3000/api/notion/sync-to-postgres \
     -H "Content-Type: application/json" \
     -d '{"database_id": "test-id", "database_name": "Characters"}'
   ```

3. **Check network connectivity:**
   - From Docker container: `ping host.docker.internal`
   - Verify API route is accessible

### Sync Not Working

1. **Check sync tables:**
   ```sql
   SELECT COUNT(*) FROM notion_characters_sync;
   SELECT COUNT(*) FROM notion_worlds_sync;
   ```

2. **Check for errors in cron logs:**
   ```sql
   SELECT return_message 
   FROM cron.job_run_details 
   WHERE status = 'failed'
   ORDER BY start_time DESC;
   ```

3. **Verify Notion tokens:**
   ```sql
   SELECT user_id, 
     CASE 
       WHEN notion_access_token IS NOT NULL THEN 'OAuth'
       WHEN notion_token IS NOT NULL THEN 'Integration'
       ELSE 'None'
     END as token_type
   FROM user_settings
   WHERE notion_access_token IS NOT NULL OR notion_token IS NOT NULL;
   ```

## Alternative: External Cron Service

If pg_net HTTP calls don't work reliably, you can use an external cron service:

1. **Set up cron job on host machine:**
   ```bash
   # Run every 15 minutes
   */15 * * * * curl -X POST http://localhost:3000/api/notion/sync-to-postgres
   ```

2. **Or use a service like:**
   - GitHub Actions scheduled workflows
   - Vercel Cron Jobs
   - AWS EventBridge
   - Google Cloud Scheduler

## Performance Tuning

- **Adjust sync frequency:** Change cron schedule in migration 021
- **Batch size:** Currently syncs 100 pages at a time (configurable in API route)
- **Parallel syncs:** Can sync multiple databases in parallel (future enhancement)

## Security Considerations

- Sync functions use `SECURITY DEFINER` to run with elevated privileges
- API route requires authentication
- RLS policies protect sync tables
- API URL should be HTTPS in production


