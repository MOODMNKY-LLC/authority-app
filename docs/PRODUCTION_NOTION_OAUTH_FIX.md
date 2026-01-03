# Production Notion OAuth Redirect URI Fix

## Issue

Getting "missing or invalid redirect_uri" error from Notion during OAuth in production.

## Root Cause

The redirect URI sent to Notion doesn't match what's configured in:
1. Notion Integration settings
2. Supabase Dashboard configuration

## Solution

### Step 1: Verify Supabase Project Reference

Find your Supabase project reference:
- Check your Supabase dashboard URL: `https://supabase.com/dashboard/project/<project-ref>`
- Or check `NEXT_PUBLIC_SUPABASE_URL`: `https://<project-ref>.supabase.co`

### Step 2: Configure Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Select your integration
3. Go to **"OAuth Domain and URIs"** tab
4. Add redirect URI:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-project-ref>` with your actual Supabase project reference.

5. **Important**: The redirect URI must match **exactly** (including protocol, domain, and path)

### Step 3: Verify Supabase Dashboard Configuration

1. Go to Supabase Dashboard → **Authentication** → **Providers** → **Notion**
2. Ensure:
   - ✅ **Notion Enabled**: ON
   - ✅ **Client ID**: Your Notion OAuth Client ID
   - ✅ **Client Secret**: Your Notion OAuth Client Secret

3. Go to **Authentication** → **URL Configuration**
4. Verify:
   - **Site URL**: `https://your-production-domain.com`
   - **Additional Redirect URLs**: Include your production domain callback:
     ```
     https://your-production-domain.com/auth/callback
     ```

### Step 4: Set Production Environment Variables

In your production environment (Vercel/Netlify/etc.):

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com

# Notion OAuth
NOTION_OAUTH_CLIENT_ID=your-client-id
NOTION_OAUTH_CLIENT_SECRET=your-client-secret
```

**Critical**: `NEXT_PUBLIC_SITE_URL` must be set to your production domain.

### Step 5: Verify Redirect URI Construction

The OAuth flow works as follows:

1. **User clicks "Continue with Notion"**
   - Component: `components/auth/notion-auth.tsx`
   - Calls: `supabase.auth.signInWithOAuth({ provider: "notion" })`
   - Redirects to: Supabase OAuth endpoint

2. **Supabase redirects to Notion**
   - Supabase constructs: `https://api.notion.com/v1/oauth/authorize?redirect_uri=https://<project-ref>.supabase.co/auth/v1/callback`
   - **This redirect_uri MUST match Notion integration settings**

3. **Notion redirects back to Supabase**
   - Notion sends code to: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Supabase processes the OAuth callback

4. **Supabase redirects to your app**
   - Supabase redirects to: `${redirectTo}` (from step 1)
   - Which is: `https://your-production-domain.com/auth/callback`
   - **This must be in Supabase's allowed redirect URLs**

## Common Issues

### Issue 1: Redirect URI Mismatch

**Symptom**: "missing or invalid redirect_uri" error

**Cause**: The redirect URI sent to Notion doesn't match what's registered

**Fix**:
1. Check Notion integration settings
2. Ensure exact match: `https://<project-ref>.supabase.co/auth/v1/callback`
3. No trailing slashes, exact protocol (https)

### Issue 2: Missing NEXT_PUBLIC_SITE_URL

**Symptom**: Redirects to wrong domain or fails

**Cause**: `NEXT_PUBLIC_SITE_URL` not set in production

**Fix**: Set `NEXT_PUBLIC_SITE_URL=https://your-production-domain.com` in production environment

### Issue 3: Supabase Redirect URL Not Allowed

**Symptom**: OAuth succeeds but redirect fails

**Cause**: Final redirect URL not in Supabase's allowed list

**Fix**: Add `https://your-production-domain.com/auth/callback` to Supabase → Authentication → URL Configuration → Additional Redirect URLs

## Debugging

### Check What Redirect URI Is Being Sent

Add logging to see what's being sent:

```typescript
// In components/auth/notion-auth.tsx
console.log("[OAuth] Redirect To:", redirectTo)
console.log("[OAuth] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("[OAuth] Site URL:", process.env.NEXT_PUBLIC_SITE_URL)
```

### Verify Notion Integration Settings

1. Go to Notion Integration → OAuth Domain and URIs
2. Check registered redirect URIs
3. Ensure production Supabase callback is listed

### Verify Supabase Configuration

1. Check Supabase Dashboard → Authentication → Providers → Notion
2. Verify client ID and secret are correct
3. Check Authentication → URL Configuration for allowed redirects

## Quick Checklist

- [ ] Notion integration has: `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] Supabase dashboard has correct Notion client ID and secret
- [ ] Supabase dashboard has production domain in allowed redirect URLs
- [ ] `NEXT_PUBLIC_SITE_URL` is set in production environment
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- [ ] Production domain matches exactly (no www vs non-www mismatch)

---

**Last Updated**: 2026-01-03
**Status**: 🔧 Production OAuth Fix Guide

