# Notion Link Preview (Unfurling) Setup Guide

This guide explains how to configure Notion link previews/unfurling for your Authority app.

## Overview

Notion's unfurling feature allows Notion pages to display rich previews of URLs from your domain. When a user shares a link to your app in Notion, Notion will call your unfurl callback endpoint to fetch preview data.

## Prerequisites

- Notion integration created and configured
- OAuth URLs already set up
- Domain accessible via HTTPS (required for production)

## Setup Steps

### 1. Configure Unfurl Callback URL

1. Go to your Notion integration settings: https://www.notion.so/my-integrations
2. Select your Authority integration
3. Navigate to the "Unfurling domain & patterns" section
4. Enter your **Unfurl Callback URL**:
   ```
   https://your-domain.com/api/notion/unfurl
   ```
   (Use the URL displayed in your app's settings panel)

### 2. Verify Your Domain

1. In the same "Unfurling domain & patterns" section:
2. Add your domain (e.g., `your-domain.com` or `app.your-domain.com`)
3. Click "Verify Domain"
4. Follow Notion's verification process (usually involves adding a DNS TXT record or HTML file)

**Important:** Domain verification is a **one-time setup** that must be completed in Notion's integration settings. This cannot be automated and must be done manually.

### 3. Configure URL Patterns (Optional)

You can specify URL patterns that should trigger unfurling:

- `*` - All URLs from your domain
- Specific patterns like `/forge/*` or `/chat/*`

## Environment Variables

Add to your `.env.local` (or production environment):

```bash
# Your app's base URL (used for domain verification)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Additional domains allowed for unfurling (comma-separated)
NOTION_UNFURL_DOMAINS=app.your-domain.com,www.your-domain.com
```

## How It Works

### POST Request (Unfurl Request)

When a user shares a link from your domain in Notion, Notion sends a POST request to your unfurl callback:

```json
{
  "url": "https://your-domain.com/forge/characters/123",
  "user_id": "notion-user-id",
  "workspace_id": "notion-workspace-id"
}
```

Your endpoint should return:

```json
{
  "type": "page",
  "page": {
    "id": "page-id",
    "title": "Character Name",
    "description": "Character description...",
    "icon": "https://...",
    "cover": "https://...",
    "url": "https://your-domain.com/forge/characters/123"
  }
}
```

### DELETE Request (Unfurl Removal)

When a user removes a link preview or mention, Notion sends a DELETE request:

```json
{
  "url": "https://your-domain.com/forge/characters/123",
  "user_id": "notion-user-id",
  "workspace_id": "notion-workspace-id"
}
```

Your endpoint should return:

```json
{
  "success": true
}
```

## Implementation Details

The unfurl endpoint (`/api/notion/unfurl`) handles:

1. **Domain verification** - Ensures requests are for allowed domains
2. **Page data fetching** - Retrieves preview data from your app
3. **Response formatting** - Returns data in Notion's expected format

## Troubleshooting

### Domain Not Verified

If you see "Domain not verified" errors:
1. Ensure domain verification is completed in Notion's integration settings
2. Check that your domain matches exactly (including subdomain)
3. Verify DNS records if using TXT record verification

### Preview Not Showing

If previews aren't appearing in Notion:
1. Check that the unfurl callback URL is correctly configured
2. Verify your endpoint is accessible (test with curl or Postman)
3. Check server logs for errors
4. Ensure your domain is HTTPS-enabled (required for production)

### CORS Issues

If you encounter CORS errors:
- Notion makes server-to-server requests, so CORS shouldn't be an issue
- If testing locally, ensure you're using the correct callback URL

## Security Considerations

- The unfurl endpoint should verify the requesting domain
- Consider rate limiting to prevent abuse
- Validate and sanitize URLs before processing
- Use environment variables for domain configuration (not hardcoded)

## Testing

To test your unfurl endpoint:

```bash
# Test POST request
curl -X POST https://your-domain.com/api/notion/unfurl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/forge/characters/123",
    "user_id": "test-user",
    "workspace_id": "test-workspace"
  }'

# Test DELETE request
curl -X DELETE https://your-domain.com/api/notion/unfurl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/forge/characters/123",
    "user_id": "test-user",
    "workspace_id": "test-workspace"
  }'
```

## Notes

- Domain verification is a **manual, one-time process** in Notion's UI
- This cannot be automated or handled programmatically
- The unfurl callback URL is displayed in your app's settings for easy copying
- Domain configuration is handled via environment variables for security



