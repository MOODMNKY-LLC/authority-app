# Supabase Notion OAuth Setup Guide

Based on [Official Supabase Documentation](https://supabase.com/docs/guides/auth/social-login/auth-notion)

## Overview

This guide follows the official Supabase Notion OAuth setup process to ensure proper configuration for production environments.

## Step 1: Create Notion Integration

1. Go to [developers.notion.com](https://developers.notion.com)
2. Click **"View my integrations"** and log in at [login.notion.so](https://login.notion.so)
3. Navigate to [notion.so/my-integrations](https://notion.so/my-integrations)
4. Click **"New integration"** or **"Create new integration"**
5. Fill in integration details:
   - **Integration type**: Select **"Public integration"**
   - **Capabilities**: Enable **"Read user information including email addresses"**
   - **Redirect URIs**: Add the Supabase callback URL (see Step 2)

## Step 2: Get Supabase Callback URL

The callback URL format is: `https://<project-ref>.supabase.co/auth/v1/callback`

### How to Find Your Callback URL:

1. Go to your **Supabase Project Dashboard**
2. Click **Authentication** in the left sidebar
3. Click **Providers** under Configuration
4. Click **Notion** from the accordion list to expand
5. Find your **Callback URL** (you can click **Copy** to copy it)

**Example**: `https://wfzcuaessqrdzoczjbrz.supabase.co/auth/v1/callback`

### Add to Notion Integration:

1. Go back to your Notion integration settings
2. Go to **"OAuth Domain and URIs"** tab
3. Add the callback URL exactly as shown in Supabase Dashboard
4. **Important**: Must match exactly (including `https://`, no trailing slash)

## Step 3: Configure Supabase Dashboard

1. In Supabase Dashboard → **Authentication** → **Providers** → **Notion**
2. Toggle **Notion Enabled** to **ON**
3. Enter your **Notion Client ID** (from Notion integration)
4. Enter your **Notion Client Secret** (from Notion integration)
5. Click **Save**

## Step 4: Configure Redirect URLs

### In Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://your-production-domain.com`
3. Add **Additional Redirect URLs**:
   ```
   https://your-production-domain.com/auth/callback
   https://your-production-domain.com/*
   ```

### In Notion Integration:

The Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) must be registered in Notion integration settings.

## Step 5: Set Production Environment Variables

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

## Step 6: Verify Implementation

### Client-Side Code (components/auth/notion-auth.tsx)

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'notion',
  options: {
    redirectTo: `${origin}/auth/callback`, // Must be in Supabase allowed redirect URLs
  },
})
```

### Server-Side Callback (app/auth/callback/route.ts)

```typescript
if (code) {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }
  
  // Handle redirect with x-forwarded-host support for production
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  
  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`)
  } else {
    return NextResponse.redirect(`${origin}${next}`)
  }
}
```

## Common Issues & Solutions

### Issue 1: "Missing or invalid redirect_uri"

**Cause**: The redirect URI sent to Notion doesn't match what's registered

**Solution**:
1. Verify Supabase callback URL is registered in Notion integration
2. Check exact match (no trailing slash, correct protocol)
3. Ensure Supabase dashboard has correct Notion credentials

### Issue 2: Redirect fails after OAuth

**Cause**: `redirectTo` URL not in Supabase allowed redirect URLs

**Solution**:
1. Add production domain to Supabase → Authentication → URL Configuration
2. Ensure `NEXT_PUBLIC_SITE_URL` is set correctly
3. Verify `redirectTo` matches allowed URLs exactly

### Issue 3: Code exchange fails

**Cause**: Invalid code or session expired

**Solution**:
1. Check error logs for specific error message
2. Verify code is being passed correctly
3. Ensure callback route handles errors properly

## Verification Checklist

- [ ] Notion integration created with "Public integration" type
- [ ] Supabase callback URL added to Notion integration redirect URIs
- [ ] Supabase dashboard has Notion enabled with correct credentials
- [ ] Production domain added to Supabase allowed redirect URLs
- [ ] `NEXT_PUBLIC_SITE_URL` set in production environment
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set correctly
- [ ] Callback route handles `x-forwarded-host` header
- [ ] Error page exists at `/auth/auth-code-error`

## Reference

- [Official Supabase Notion OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-notion)
- [Notion Developer Portal](https://developers.notion.com)
- [Notion Integrations](https://notion.so/my-integrations)

---

**Last Updated**: 2026-01-03
**Status**: ✅ Based on Official Supabase Documentation

