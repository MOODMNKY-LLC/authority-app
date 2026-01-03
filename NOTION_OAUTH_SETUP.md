# Notion OAuth Setup Guide

Complete guide for setting up Notion OAuth authentication for both local development and production environments.

## Overview

This guide follows the [Supabase Notion Auth documentation](https://supabase.com/docs/guides/auth/social-login/auth-notion) and ensures proper configuration for both local development and production deployments.

## Prerequisites

- Supabase project (local or hosted)
- Notion account
- Next.js application configured with Supabase

## Part 1: Create Notion Integration

1. Go to [Notion Developer Portal](https://developers.notion.com)
2. Click "View my integrations" and log in at [login.notion.so](https://login.notion.so)
3. Navigate to [notion.so/my-integrations](https://notion.so/my-integrations)
4. Click "New integration" or "Create new integration"
5. Fill in the integration details:
   - **Integration type**: Select "Public integration"
   - **Capabilities**: Enable "Read user information including email addresses"
   - **Redirect URIs**: Add the callback URLs (see below)

### Redirect URIs to Add

#### For Local Development:
```
https://127.0.0.1:54510/auth/v1/callback
https://localhost:54510/auth/v1/callback
```

#### For Production:
```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

**Note**: Replace `<your-project-ref>` with your actual Supabase project reference (found in your Supabase dashboard URL).

6. Click "Submit" to create the integration
7. Copy your **OAuth client ID** and **OAuth client secret** from the "OAuth Domain and URIs" tab

## Part 2: Configure Supabase

### Local Development Configuration

Edit `supabase/config.toml`:

```toml
[auth.external.notion]
enabled = true
client_id = "your-notion-client-id"
secret = "env(NOTION_OAUTH_CLIENT_SECRET)"
redirect_uri = "https://127.0.0.1:54510/auth/v1/callback"
skip_nonce_check = true
email_optional = false
```

**Important**: 
- The `redirect_uri` must match one of the URIs you added in Notion
- `skip_nonce_check = true` is required for local development
- Use environment variable for the secret (never commit secrets to git)

### Production Configuration

Configure in Supabase Dashboard:

1. Go to your Supabase Project Dashboard
2. Click **Authentication** in the left sidebar
3. Click **Providers** under Configuration
4. Click **Notion** to expand
5. Toggle **Notion Enabled** to ON
6. Enter your **Notion Client ID**
7. Enter your **Notion Client Secret**
8. Click **Save**

### Additional Redirect URLs

Ensure your Supabase project has the correct redirect URLs configured:

#### Local Development (`supabase/config.toml`):
```toml
[auth]
site_url = "https://127.0.0.1:3000"
additional_redirect_urls = [
  "https://127.0.0.1:3000",
  "https://127.0.0.1:3000/auth/callback",
  "https://localhost:3000",
  "https://localhost:3000/auth/callback",
]
```

#### Production (Supabase Dashboard):
- Go to Authentication → URL Configuration
- Add your production callback URL: `https://yourdomain.com/auth/callback`
- Ensure `site_url` matches your production domain

## Part 3: Environment Variables

### Local Development (`.env.local`)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://127.0.0.1:54510
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Notion OAuth
NOTION_OAUTH_CLIENT_ID=your-notion-client-id
NOTION_OAUTH_CLIENT_SECRET=your-notion-client-secret

# Site URL
NEXT_PUBLIC_SITE_URL=https://localhost:3000
```

### Production (Vercel/Deployment Platform)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

# Notion OAuth
NOTION_OAUTH_CLIENT_ID=your-notion-client-id
NOTION_OAUTH_CLIENT_SECRET=your-notion-client-secret

# Site URL
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Part 4: Application Code

### Notion Auth Component

The `NotionAuth` component handles the OAuth flow:

```typescript
// components/auth/notion-auth.tsx
const { error } = await supabase.auth.signInWithOAuth({
  provider: "notion",
  options: {
    redirectTo: `${origin}/auth/callback`,
  },
})
```

**Key Points**:
- Uses `NEXT_PUBLIC_SITE_URL` environment variable when available
- Falls back to `window.location.origin` for flexibility
- Normalizes `0.0.0.0` to `localhost` for local development

### Callback Route

The callback route (`app/auth/callback/route.ts`) handles the OAuth code exchange:

```typescript
const { error } = await supabase.auth.exchangeCodeForSession(code)
if (!error) {
  // Success - redirect to app
  return NextResponse.redirect(`${origin}${next}`)
}
// Error - redirect to error page
return NextResponse.redirect(`${origin}/auth/auth-code-error`)
```

**Features**:
- Handles `next` parameter for post-auth redirects
- Proper error handling with error page redirect
- Production support with `x-forwarded-host` header handling

## Part 5: OAuth Flow

### Complete Flow Diagram

```
1. User clicks "Sign in with Notion"
   ↓
2. Next.js calls supabase.auth.signInWithOAuth()
   ↓
3. Browser redirects to Notion OAuth
   ↓
4. User authorizes application
   ↓
5. Notion redirects to Supabase callback:
   https://127.0.0.1:54510/auth/v1/callback?code=...
   ↓
6. Supabase processes OAuth and redirects to:
   https://localhost:3000/auth/callback?code=...
   ↓
7. Next.js callback route exchanges code for session
   ↓
8. User redirected to app (or error page if failed)
```

## Troubleshooting

### Certificate Errors (Local Development)

**Error**: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`

**Solution**: The `server.js` file already includes `NODE_TLS_REJECT_UNAUTHORIZED=0` for local development. This is safe for local dev only.

### Invalid Redirect URI

**Error**: `redirect_uri_mismatch` or similar

**Check**:
1. Notion OAuth app has the correct redirect URI
2. Supabase config has matching `redirect_uri`
3. `additional_redirect_urls` includes your app's callback URL

### 0.0.0.0 Redirect Issue

**Error**: Browser tries to redirect to `https://0.0.0.0:3000`

**Solution**: Already handled in `NotionAuth` component - normalizes `0.0.0.0` to `localhost`

### Production Issues

**Common Problems**:
1. **Load Balancer**: Ensure `x-forwarded-host` header is handled (already in callback route)
2. **HTTPS Required**: Notion requires HTTPS - ensure production uses HTTPS
3. **Domain Mismatch**: Verify `NEXT_PUBLIC_SITE_URL` matches your production domain

## Verification Checklist

### Local Development
- [ ] Notion integration created with correct redirect URIs
- [ ] Supabase `config.toml` has Notion provider configured
- [ ] `.env.local` has `NOTION_OAUTH_CLIENT_SECRET` set
- [ ] Certificates generated and configured
- [ ] `additional_redirect_urls` includes local callback URLs
- [ ] Test OAuth flow end-to-end

### Production
- [ ] Notion integration has production redirect URI
- [ ] Supabase Dashboard has Notion provider enabled
- [ ] Environment variables set in deployment platform
- [ ] Production domain added to `additional_redirect_urls`
- [ ] HTTPS enabled and working
- [ ] Test OAuth flow in production

## Security Notes

1. **Never commit secrets**: Use environment variables for `NOTION_OAUTH_CLIENT_SECRET`
2. **HTTPS Required**: Notion OAuth requires HTTPS (use self-signed certs for local dev)
3. **Redirect URI Validation**: Always validate redirect URIs match exactly
4. **Production Certificates**: Use proper SSL certificates in production (not self-signed)

## References

- [Supabase Notion Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-notion)
- [Supabase Local Development Docs](https://supabase.com/docs/guides/local-development)
- [Notion Developer Portal](https://developers.notion.com)




