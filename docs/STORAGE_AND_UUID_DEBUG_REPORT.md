# Storage Buckets and UUID Extension Debug Report

## Summary

Using Supabase MCP, we've successfully debugged and fixed issues with storage buckets and UUID extensions in production.

## Issues Found and Fixed

### 1. ✅ Storage Policies for `user-backgrounds` Bucket

**Problem:** The `user-backgrounds` bucket existed but had no storage policies, preventing users from uploading/managing their background images.

**Status:** ✅ **FIXED**

**Solution:** Created migration `create_user_backgrounds_storage_policies` with three policies:
- `Users can upload their own backgrounds` (INSERT)
- `Users can read their own backgrounds` (SELECT)
- `Users can delete their own backgrounds` (DELETE)

**Verification:**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%background%';
```

**Result:** All three policies now exist and are active.

### 2. ✅ UUID Extension Functions

**Problem:** Migration 011 was using `uuid_generate_v4()` which requires the `uuid-ossp` extension to be in the search path.

**Status:** ✅ **ALREADY FIXED** (in migration 011)

**Findings:**
- Both `uuid-ossp` (v1.1) and `pgcrypto` (v1.3) extensions are installed
- `uuid_generate_v4()` exists in the `extensions` schema (not public)
- `gen_random_uuid()` exists in both `pg_catalog` and `extensions` schemas
- `gen_random_uuid()` is preferred because it's in `pg_catalog` (always available)

**Current Migration Status:**
- Migration 011 uses `gen_random_uuid()` ✅ (correct)
- Migration 017 enables `uuid-ossp` extension (for other uses if needed)

**Test Results:**
```sql
SELECT uuid_generate_v4() as uuid_ossp_test, gen_random_uuid() as pgcrypto_test;
-- Both functions work correctly
```

## Production Database Status

### Extensions Installed
- ✅ `uuid-ossp` v1.1
- ✅ `pgcrypto` v1.3

### Storage Buckets
- ✅ `avatars` (public: true, 5MB limit)
  - Policies: ✅ All avatar policies exist
- ✅ `user-backgrounds` (public: false, 10MB limit)
  - Policies: ✅ All background policies now exist (just created)

### Storage Policies Summary

**Avatar Policies (4):**
1. Avatar images are publicly accessible (SELECT)
2. Users can upload their own avatars (INSERT)
3. Users can update their own avatars (UPDATE)
4. Users can delete their own avatars (DELETE)

**Background Policies (3):**
1. Users can upload their own backgrounds (INSERT)
2. Users can read their own backgrounds (SELECT)
3. Users can delete their own backgrounds (DELETE)

## Recommendations

1. ✅ **Use `gen_random_uuid()`** instead of `uuid_generate_v4()` in migrations
   - More reliable (in pg_catalog)
   - Doesn't require schema qualification
   - Already implemented in migration 011

2. ✅ **Storage policies are now complete**
   - All buckets have proper RLS policies
   - Users can manage their own files
   - Policies follow the same pattern as avatar policies

3. ✅ **Migration order is correct**
   - Extensions are enabled before they're needed
   - Buckets are created before policies
   - All migrations apply successfully

## Next Steps

1. ✅ Storage policies created - users can now upload backgrounds
2. ✅ UUID functions working - migrations will succeed
3. ✅ Both local and production databases are in sync

## Verification Commands

To verify everything is working:

```sql
-- Check extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- Check buckets
SELECT id, name, public FROM storage.buckets WHERE id IN ('avatars', 'user-backgrounds');

-- Check storage policies
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' 
ORDER BY policyname;

-- Test UUID functions
SELECT gen_random_uuid() as test_uuid;
```

## Conclusion

All issues have been resolved:
- ✅ Storage policies for `user-backgrounds` bucket created
- ✅ UUID extension functions are working correctly
- ✅ Migration 011 uses the correct UUID function (`gen_random_uuid()`)
- ✅ Production database is fully functional

