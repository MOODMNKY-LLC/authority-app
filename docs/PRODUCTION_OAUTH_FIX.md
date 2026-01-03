# Production Notion OAuth Fix

## Issues Identified

1. **Missing `NEXT_PUBLIC_SITE_URL` environment variable** in Vercel
2. **Token extraction may fail silently** if Supabase doesn't expose `provider_token`
3. **Redirect URL construction** needs better handling for production
4. **HTTPS enforcement** needed in production

## Fixes Applied

### 1. Enhanced Redirect URL Handling

**Files Modified:**
- `app/auth/callback/route.ts`
- `components/auth/notion-auth.tsx`

**Changes:**
- Added fallback to `VERCEL_URL` environment variable
- Enforced HTTPS in production
- Better logging for debugging
- Improved redirect URL construction logic

### 2. Improved Token Extraction

**File Modified:**
- `app/auth/callback/route.ts`

**Changes:**
- Added comprehensive logging (without exposing tokens)
- Check multiple possible token locations
- Better error handling and user feedback

## Required Vercel Environment Variables

Add these to your Vercel project settings:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

**Important:** Replace `your-production-domain.com` with your actual Vercel deployment URL or custom domain.

## Supabase Configuration

### 1. Notion OAuth Provider

In Supabase Dashboard → Authentication → Providers → Notion:

- **Enabled**: ✅ ON
- **Client ID**: Your Notion OAuth Client ID
- **Client Secret**: Your Notion OAuth Client Secret

### 2. Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://your-production-domain.com
```

**Additional Redirect URLs:**
```
https://your-production-domain.com/auth/callback
https://your-production-domain.com/*
```

## Notion OAuth App Configuration

In [Notion Integrations](https://www.notion.so/my-integrations):

1. Select your integration
2. Go to "OAuth Domain and URIs" tab
3. Add redirect URI:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```

**Important:** This is the Supabase callback URL, NOT your Next.js app URL. Supabase handles the OAuth flow and then redirects to your app.

## Verification Steps

1. **Check Environment Variables:**
   ```bash
   # In Vercel Dashboard → Settings → Environment Variables
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```

2. **Test OAuth Flow:**
   - Click "Sign in with Notion"
   - Complete OAuth authorization
   - Check browser console for redirect URL logs
   - Verify token is stored in `user_settings.notion_access_token`

3. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Logs → Auth Logs
   - Look for OAuth callback events
   - Check for any errors

4. **Verify Token Storage:**
   ```sql
   SELECT user_id, notion_access_token, notion_token, notion_workspace_id
   FROM user_settings
   WHERE notion_access_token IS NOT NULL OR notion_token IS NOT NULL;
   ```

## Troubleshooting

### Issue: OAuth redirects to wrong URL

**Solution:** Ensure `NEXT_PUBLIC_SITE_URL` is set correctly in Vercel environment variables.

### Issue: Token not being stored

**Solution:** 
1. Check Supabase logs for OAuth callback errors
2. Verify Notion OAuth app has correct redirect URI
3. Check browser console for token extraction logs
4. If token extraction fails, user can add integration token manually

### Issue: "redirect_uri_mismatch" error

**Solution:**
1. Verify Notion OAuth app redirect URI matches Supabase callback URL exactly
2. Check Supabase `redirect_uri` configuration
3. Ensure no trailing slashes or protocol mismatches

## Next Steps

After deploying these fixes:

1. Set `NEXT_PUBLIC_SITE_URL` in Vercel
2. Verify Supabase Notion OAuth configuration
3. Test OAuth flow in production
4. Monitor logs for any issues
5. If token extraction still fails, users can use integration token as fallback



