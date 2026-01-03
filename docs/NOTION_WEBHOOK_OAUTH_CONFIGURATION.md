# Notion Webhook & OAuth Configuration Guide

## Required URLs for Notion Integration Setup

### 1. Webhook URL (for Real-time Sync)

**Webhook Endpoint:**
```
https://your-domain.com/api/webhooks/notion
```

**For Local Development:**
```
http://localhost:3000/api/webhooks/notion
```

**For Production (Vercel):**
```
https://your-app.vercel.app/api/webhooks/notion
```

**Usage:**
- This URL receives webhook events from Notion when pages/databases change
- Supports GET (verification challenge) and POST (event processing)
- Configure this in Notion's webhook settings for each database

---

### 2. OAuth Configuration URLs (for Link Preview/Unfurl)

#### OAuth Authorize URL
```
https://your-domain.com/api/auth/notion/authorize
```

**For Local Development:**
```
http://localhost:3000/api/auth/notion/authorize
```

**For Production:**
```
https://your-app.vercel.app/api/auth/notion/authorize
```

**Purpose:** Used by Notion to initiate user authorization with your integration when users click on unfurled links.

---

#### OAuth Token URL
```
https://your-domain.com/api/auth/notion/token
```

**For Local Development:**
```
http://localhost:3000/api/auth/notion/token
```

**For Production:**
```
https://your-app.vercel.app/api/auth/notion/token
```

**Purpose:** Called by Notion to retrieve an access token for the unfurl callback URL.

---

#### Deleted Token Callback URL
```
https://your-domain.com/api/auth/notion/deleted
```

**For Local Development:**
```
http://localhost:3000/api/auth/notion/deleted
```

**For Production:**
```
https://your-app.vercel.app/api/auth/notion/deleted
```

**Purpose:** Called by Notion when a user removes your integration. Use this to clean up user data.

---

### 3. OAuth Client Configuration

**OAuth Client ID:** `simeon.bowman@moodmnky.com` (or your Notion integration client ID)

**OAuth Client Secret:** (stored securely, not displayed)

**OAuth Scopes:** (Optional - leave empty or specify required scopes)

---

## Environment Variables

Make sure these are set in your `.env.local` and production:

```bash
# Your app's base URL (used for all callback URLs)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# For Vercel deployments, this is auto-set, but you can override:
# VERCEL_URL=your-app.vercel.app
```

---

## Quick Reference

Replace `your-domain.com` with your actual domain:

| Purpose | URL |
|---------|-----|
| **Webhook Events** | `https://your-domain.com/api/webhooks/notion` |
| **OAuth Authorize** | `https://your-domain.com/api/auth/notion/authorize` |
| **OAuth Token** | `https://your-domain.com/api/auth/notion/token` |
| **Deleted Token Callback** | `https://your-domain.com/api/auth/notion/deleted` |

---

## Next Steps

1. **Set `NEXT_PUBLIC_SITE_URL`** in your environment variables
2. **Create OAuth endpoints** if they don't exist yet (see below)
3. **Configure in Notion:**
   - Go to your Notion integration settings
   - Add the webhook URL
   - Add the OAuth URLs for link preview/unfurl
   - Save your OAuth Client ID and Secret

---

## Implementation Notes

- All URLs use HTTPS in production (required by Notion)
- Webhook endpoint handles verification challenges automatically
- OAuth endpoints need to be created (see implementation below)
- URLs are dynamically generated based on `NEXT_PUBLIC_SITE_URL`



