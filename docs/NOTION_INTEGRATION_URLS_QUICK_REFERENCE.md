# Notion Integration URLs - Quick Reference

## 🔗 All Required URLs

Replace `your-domain.com` with your actual domain (from `NEXT_PUBLIC_SITE_URL`):

### 1. Webhook URL (for Real-time Sync)
```
https://your-domain.com/api/webhooks/notion
```
**Purpose:** Receives webhook events from Notion when pages/databases change

---

### 2. OAuth Authorize URL (for Link Preview/Unfurl)
```
https://your-domain.com/api/auth/notion/authorize
```
**Purpose:** Used by Notion to initiate user authorization with your integration

---

### 3. OAuth Token URL (for Link Preview/Unfurl)
```
https://your-domain.com/api/auth/notion/token
```
**Purpose:** Called by Notion to retrieve an access token for the unfurl callback URL

---

### 4. Deleted Token Callback URL (for Link Preview/Unfurl)
```
https://your-domain.com/api/auth/notion/deleted
```
**Purpose:** Called by Notion when a user removes your integration

---

## 📋 Notion Integration Settings

When configuring your Notion integration, use these values:

| Field | Value |
|-------|-------|
| **OAuth Authorize URL** | `https://your-domain.com/api/auth/notion/authorize` |
| **OAuth Token URL** | `https://your-domain.com/api/auth/notion/token` |
| **OAuth Client ID** | `simeon.bowman@moodmnky.com` (or your Notion integration client ID) |
| **OAuth Client Secret** | (Your Notion OAuth client secret - stored securely) |
| **OAuth Scopes** | `read` (or leave empty) |
| **Deleted Token Callback URL** | `https://your-domain.com/api/auth/notion/deleted` |
| **Webhook URL** | `https://your-domain.com/api/webhooks/notion` |

---

## 🎯 How to Get Your URLs

1. **In the App:** Go to Settings → Notion → Scroll to "Integration URLs" section
2. **Via API:** Call `GET /api/integrations/notion/urls`
3. **Manually:** Replace `your-domain.com` with your `NEXT_PUBLIC_SITE_URL` value

---

## ⚙️ Environment Variable

Make sure this is set:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

**For Vercel:** This is auto-set from `VERCEL_URL`, but you can override it.

**For Local Development:** Use `http://localhost:3000`

---

## ✅ Verification

All endpoints are now implemented and ready to use:

- ✅ `/api/webhooks/notion` - Webhook endpoint (GET for verification, POST for events)
- ✅ `/api/auth/notion/authorize` - OAuth authorization endpoint
- ✅ `/api/auth/notion/token` - OAuth token exchange endpoint
- ✅ `/api/auth/notion/deleted` - Token deletion callback endpoint

---

## 📝 Notes

- All URLs use HTTPS in production (required by Notion)
- Webhook endpoint handles verification challenges automatically
- OAuth endpoints follow OAuth 2.0 specification
- URLs are dynamically generated based on `NEXT_PUBLIC_SITE_URL`



