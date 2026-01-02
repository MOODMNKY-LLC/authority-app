# Notion Sync Troubleshooting Guide

## Issue: Template Not Found During Sync

If the sync process isn't finding your duplicated Authority template, follow these steps:

### Step 1: Check Debug Endpoint

Call the debug endpoint to see what Notion API can access:

```bash
GET /api/notion/debug-search
```

This will show you:
- Token validity
- All pages and databases visible to your integration
- Template page matches
- Stored template page ID status

### Step 2: Verify Template Title

The sync process searches for pages matching these patterns:
- "Authority Template"
- "AUTHORITY_TEMPLATE"
- "Authority"
- "authority template"

**Action:** Ensure your duplicated template page title contains one of these patterns (case-insensitive).

### Step 3: Check Integration Permissions

Your Notion integration must have access to:
1. The template page itself
2. All child databases within the template

**Action:** 
- Go to your Notion workspace
- Open the duplicated template page
- Click "..." menu → "Add connections" → Select your integration
- For each database in the template, click "..." → "Add connections" → Select your integration

### Step 4: Run Discovery First

Before syncing, run the discovery endpoint:

```bash
GET /api/notion/discover-databases
```

This will:
- Search for template pages
- Extract child databases
- Store the template page ID

### Step 5: Check Logs

The sync process logs detailed information:
- `[Authority] Searching for template pages...`
- `[Authority] Found X candidate template pages`
- `[Authority] Template page "..." has X databases`
- `[Authority] Getting databases from template page: ...`

**Action:** Check your server logs for these messages to see where the process fails.

### Common Issues

#### Issue: "No template databases found"
**Cause:** Template page ID stored but page not accessible, or child databases not shared with integration.

**Solution:**
1. Run `/api/notion/discover-databases` to re-discover template
2. Ensure template page and databases are shared with integration
3. Check template page title matches expected patterns

#### Issue: "Template page not accessible"
**Cause:** Template page ID stored but integration lost access, or page was moved/deleted.

**Solution:**
1. Re-share template page with integration
2. Run discovery again to get new page ID
3. Verify page exists in your workspace

#### Issue: "Search returns 0 results"
**Cause:** Integration token doesn't have access to workspace, or token is invalid.

**Solution:**
1. Verify token is valid: `/api/notion/debug-search`
2. Re-authenticate with Notion OAuth
3. Ensure integration is added to workspace

#### Issue: "Child databases not found"
**Cause:** Databases exist but aren't shared with integration, or aren't child_database blocks.

**Solution:**
1. Ensure databases are added as child_database blocks to template page
2. Share each database with integration
3. Check database titles match expected names

### Debug Checklist

- [ ] Token is valid (`/api/notion/debug-search`)
- [ ] Template page title matches pattern
- [ ] Template page shared with integration
- [ ] All child databases shared with integration
- [ ] Discovery endpoint finds template (`/api/notion/discover-databases`)
- [ ] Template page ID stored in user_settings
- [ ] Sync endpoint can access template page (`/api/notion/sync-databases`)

### Enhanced Logging

The sync process now includes:
- Pagination through all search results
- Detailed logging at each step
- Error messages with context
- Template page access verification

Check server logs for `[Authority]` prefixed messages to track the sync process.


