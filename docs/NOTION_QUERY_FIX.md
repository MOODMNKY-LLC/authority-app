# Notion Query Method Fix

## Problem

The Notion SDK's `databases.query()` method was returning `undefined` due to Next.js/Turbopack bundling issues. This caused errors like:

```
TypeError: notion.databases.query is not a function
```

## Root Cause

1. The code was calling `notion.databases.query()` directly instead of using the `queryNotionDatabase` helper function
2. The helper function exists with fallback logic to raw HTTP API calls, but wasn't being used
3. Client recreation didn't fix the issue because it's a bundling problem, not a client initialization problem

## Solution

### 1. Updated Helper Function (`lib/notion/query-database.ts`)

- Added optional `token` parameter for explicit token passing
- Improved token extraction from Client instance with multiple fallback methods
- Enhanced error messages

### 2. Replaced All Direct Calls

Replaced all 17+ direct `notion.databases.query()` calls with `queryNotionDatabase()` calls in:
- `app/api/notion/sync-databases/route.ts` (16 calls)
- `app/api/notion/sync-to-postgres/route.ts` (1 call)

### 3. Removed Client Recreation Logic

Removed all try-catch blocks that attempted to recreate the client, as this doesn't solve the bundling issue. The helper function now handles fallback automatically.

## How It Works

1. **First Attempt**: Try to use SDK's `notion.databases.query()` method
2. **If Missing**: Automatically fall back to raw HTTP API call using `fetch()`
3. **Token Handling**: Extracts token from Client instance or uses explicitly passed token

## Benefits

- ✅ No more "query is not a function" errors
- ✅ Automatic fallback to raw HTTP when SDK method unavailable
- ✅ Cleaner code without repetitive try-catch blocks
- ✅ More reliable token handling

## Files Modified

- `lib/notion/query-database.ts` - Enhanced helper function
- `app/api/notion/sync-databases/route.ts` - Replaced all direct calls
- `app/api/notion/sync-to-postgres/route.ts` - Replaced direct call

## Testing

After this fix, all database queries should work correctly, falling back to raw HTTP API calls when the SDK method is unavailable due to bundling issues.



