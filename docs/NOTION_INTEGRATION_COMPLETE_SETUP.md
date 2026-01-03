# Notion Integration Complete Setup Guide

## 🔗 All Required URLs

Based on your `NEXT_PUBLIC_SITE_URL` environment variable, here are all the URLs you need:

### 1. Webhook URL (for Real-time Sync)
```
https://your-domain.com/api/webhooks/notion
```
**Purpose:** Receives webhook events from Notion when pages/databases change  
**Configure in:** Notion webhook settings for each database

---

### 2. OAuth Authorize URL (for Link Preview/Unfurl)
```
https://your-domain.com/api/auth/notion/authorize
```
**Purpose:** Used by Notion to initiate user authorization with your integration  
**Configure in:** Notion integration settings → External authorization setup

---

### 3. OAuth Token URL (for Link Preview/Unfurl)
```
https://your-domain.com/api/auth/notion/token
```
**Purpose:** Called by Notion to retrieve an access token for the unfurl callback URL  
**Configure in:** Notion integration settings → External authorization setup

---

### 4. Deleted Token Callback URL (for Link Preview/Unfurl)
```
https://your-domain.com/api/auth/notion/deleted
```
**Purpose:** Called by Notion when a user removes your integration  
**Configure in:** Notion integration settings → External authorization setup

---

## 📋 Notion Integration Settings Form

When configuring your Notion integration, fill in these fields:

| Field | Value |
|-------|-------|
| **OAuth Authorize URL** | `https://your-domain.com/api/auth/notion/authorize` |
| **OAuth Token URL** | `https://your-domain.com/api/auth/notion/token` |
| **OAuth Client ID** | `simeon.bowman@moodmnky.com` (or your Notion integration client ID) |
| **OAuth Client Secret** | (Your Notion OAuth client secret - stored securely) |
| **OAuth Scopes** | `read` (or leave empty) |
| **Deleted Token Callback URL** | `https://your-domain.com/api/auth/notion/deleted` |

---

## 🎯 How to Get Your URLs

### Option 1: In the App (Easiest)
1. Go to **Settings → Notion**
2. Scroll to the **"Integration URLs"** section at the bottom
3. All URLs are displayed with copy buttons
4. Copy each URL and paste into Notion settings

### Option 2: Via API
Call `GET /api/integrations/notion/urls` to get all URLs programmatically.

### Option 3: Manual
Replace `your-domain.com` with your `NEXT_PUBLIC_SITE_URL` value.

---

## ⚙️ Environment Variables Required

Add these to your `.env.local` and production:

```bash
# Your app's base URL (REQUIRED - used for all callback URLs)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Notion OAuth credentials (for link preview/unfurl)
NOTION_OAUTH_CLIENT_ID=simeon.bowman@moodmnky.com
NOTION_OAUTH_CLIENT_SECRET=your-notion-oauth-client-secret
NOTION_OAUTH_SCOPES=read

# For Vercel deployments, this is auto-set:
# VERCEL_URL=your-app.vercel.app
```

---

## ✅ Implementation Status

All endpoints are implemented and ready:

- ✅ `/api/webhooks/notion` - Webhook endpoint (GET for verification, POST for events)
- ✅ `/api/auth/notion/authorize` - OAuth authorization endpoint
- ✅ `/api/auth/notion/token` - OAuth token exchange endpoint
- ✅ `/api/auth/notion/deleted` - Token deletion callback endpoint
- ✅ `/api/auth/notion/callback` - Internal OAuth callback (not configured in Notion)

---

## 🔄 OAuth Flow for Link Preview/Unfurl

1. User clicks a link in Notion
2. Notion calls `/api/auth/notion/authorize` with `client_id`, `redirect_uri`, `state`
3. We redirect user to Notion OAuth authorization page
4. User authorizes
5. Notion redirects to `/api/auth/notion/callback` with `code`
6. We redirect back to Notion's `redirect_uri` with the `code`
7. Notion calls `/api/auth/notion/token` with the `code`
8. We exchange the code with Notion for an access token
9. We return the access token to Notion
10. Notion uses the token to fetch preview content

---

## 📝 Notes

- All URLs use HTTPS in production (required by Notion)
- Webhook endpoint handles verification challenges automatically
- OAuth endpoints follow OAuth 2.0 specification
- URLs are dynamically generated based on `NEXT_PUBLIC_SITE_URL`
- The OAuth callback URL (`/api/auth/notion/callback`) is internal and not configured in Notion

---

## 🚀 Quick Start

1. **Set `NEXT_PUBLIC_SITE_URL`** in your environment variables
2. **Go to Settings → Notion** in the app
3. **Copy all URLs** from the "Integration URLs" section
4. **Paste into Notion integration settings**
5. **Save your OAuth Client ID and Secret**
6. **Test webhook** by creating a webhook in Notion

---

## 🔍 Verification

After configuring:
- Test webhook by creating a webhook in Notion (should receive verification challenge)
- Test OAuth by clicking a link in Notion (should initiate OAuth flow)
- Check logs for any errors in webhook/OAuth processing



