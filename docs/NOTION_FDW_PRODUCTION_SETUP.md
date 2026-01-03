# Notion FDW Production Setup

## Important: Wrappers Extension

The Notion FDW requires the **Supabase Wrappers extension** to be enabled. This may need to be enabled in your Supabase project dashboard.

## Enable Wrappers in Supabase

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Search for **`wrappers`**
4. Click **Enable**

### Option 2: Via SQL (If Available)

```sql
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;
```

### Option 3: Check if Already Enabled

```sql
-- Check if wrappers extension exists
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'wrappers';

-- Check if handlers exist
SELECT proname 
FROM pg_proc 
WHERE proname IN ('wasm_fdw_handler', 'wasm_fdw_validator');
```

## Verification

After enabling wrappers, verify FDW setup:

```sql
-- Check FDW wrapper exists
SELECT fdwname FROM pg_foreign_data_wrapper WHERE fdwname = 'wasm_wrapper';

-- Check helper functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%notion_fdw%';
```

## Local vs Production

- **Local:** Wrappers extension is already enabled ✅
- **Production:** May need to enable via dashboard ⚠️

## Troubleshooting

### Error: "function wasm_fdw_handler() does not exist"

**Solution:** Enable the wrappers extension in your Supabase project dashboard.

### Error: "extension wrappers does not exist"

**Solution:** 
1. Check if your Supabase plan supports extensions
2. Enable wrappers via dashboard
3. Or contact Supabase support

### FDW Functions Work Locally But Not in Production

**Solution:** Ensure wrappers extension is enabled in production. The migration will skip FDW creation if handlers don't exist, but functions will still be created (they'll fail at runtime if wrappers isn't enabled).

## Alternative: Use Sync Tables Only

If wrappers extension is not available in production, you can:
- ✅ Continue using sync tables (already working)
- ✅ Use direct Notion API calls for fresh queries
- ✅ Skip FDW setup (functions will exist but won't work)

The app will function normally without FDW - it's an enhancement, not a requirement.




