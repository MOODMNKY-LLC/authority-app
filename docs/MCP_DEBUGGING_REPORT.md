# MCP Debugging Report: Notion & N8n Issues

## Executive Summary

This report provides a comprehensive analysis of why Notion and N8n MCP servers are not working, with detailed debugging steps and solutions.

## Issue Overview

### Notion MCP
- **Status**: ❌ Not Working (despite test showing success)
- **Symptoms**: Tools not loading in UI, connection failures
- **Test Results**: Previously showed 21 tools, but UI integration failing

### N8n MCP
- **Status**: ❌ Not Working
- **Symptoms**: JSON parsing error during initialization
- **Error**: "Unterminated string in JSON at position 131"

## Root Cause Analysis

### Notion MCP Issues

#### Issue 1: Missing Notion-Version Header
**Problem**: Notion MCP server requires `Notion-Version: 2022-06-28` header, but generic client doesn't include it.

**Evidence**:
- `notion-client-enhanced.ts` includes this header
- Generic client doesn't check for Notion-specific requirements
- Notion API documentation requires this header

**Impact**: Requests may fail or return incorrect responses.

#### Issue 2: Token Format Validation
**Problem**: Notion tokens come in different formats:
- OAuth tokens: `ntn_...` format
- Integration tokens: `secret_...` format
- May need validation before use

**Evidence**:
- Token retrieval logic checks multiple sources
- No validation of token format
- No verification that token is valid before use

**Impact**: Invalid tokens may cause authentication failures.

#### Issue 3: Session Management
**Problem**: Session ID might not be properly maintained for Notion specifically.

**Evidence**:
- Generic client handles sessions generically
- Notion might have special session requirements
- Session ID extraction might fail silently

**Impact**: Tools/list requests fail without session ID.

### N8n MCP Issues

#### Issue 1: Server-Side JSON Parsing Error
**Problem**: N8n MCP server returns malformed JSON during initialization.

**Evidence**:
- Error: "Unterminated string in JSON at position 131"
- Response is not valid JSON
- This is a server-side bug, not client issue

**Impact**: Cannot initialize connection, tools unavailable.

#### Issue 2: No Error Recovery
**Problem**: Client doesn't handle malformed JSON gracefully.

**Evidence**:
- Generic client throws error on JSON parse failure
- No retry logic for server errors
- No fallback mechanisms

**Impact**: Complete failure, no recovery possible.

## Debugging Steps

### Step 1: Test Notion MCP Authentication

```bash
# Use the debug endpoint
GET /api/integrations/mcp/debug
```

This will check:
1. Token availability (OAuth, integration, env)
2. Token format validation
3. Endpoint configuration
4. Initialize request/response
5. Session ID extraction
6. Tools/list request/response

### Step 2: Verify Token Sources

Check `user_settings` table:
```sql
SELECT 
  user_id,
  notion_access_token IS NOT NULL as has_oauth,
  notion_token IS NOT NULL as has_integration,
  LENGTH(notion_access_token) as oauth_length,
  LENGTH(notion_token) as integration_length
FROM user_settings
WHERE user_id = '<your_user_id>';
```

### Step 3: Test Direct API Calls

Test Notion MCP directly:
```bash
curl -X POST https://notion-mcp.moodmnky.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer <your_token>" \
  -H "Notion-Version: 2022-06-28" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test",
        "version": "1.0.0"
      }
    }
  }'
```

### Step 4: Check N8n Server Logs

The N8n MCP server needs to be checked for:
1. JSON serialization errors
2. Response formatting issues
3. Server configuration problems

## Solutions Implemented

### Fix 1: Added Notion-Version Header

**File**: `lib/mcp/generic-client.ts`

**Change**: Automatically add `Notion-Version: 2022-06-28` header when detecting Notion MCP endpoint or Bearer token.

```typescript
// Notion MCP requires Notion-Version header
if (config.url.includes("notion-mcp") || config.headers?.Authorization?.includes("Bearer")) {
  headers["Notion-Version"] = "2022-06-28"
}
```

**Impact**: Notion MCP requests now include required header.

### Fix 2: Created Debug Endpoint

**File**: `app/api/integrations/mcp/debug/route.ts`

**Purpose**: Comprehensive debugging for Notion and N8n MCP servers.

**Features**:
- Step-by-step debugging
- Token validation
- Header verification
- Session ID tracking
- Error capture and reporting

**Usage**: `GET /api/integrations/mcp/debug`

### Fix 3: Enhanced Error Reporting

**Improvements**:
- Detailed error messages
- Response previews
- Header inspection
- Token format detection

## Testing Checklist

### Notion MCP
- [ ] Token is available and valid
- [ ] Notion-Version header is included
- [ ] Authorization header is correct format
- [ ] Session ID is extracted from initialize
- [ ] Session ID is included in tools/list
- [ ] Tools are returned successfully

### N8n MCP
- [ ] Server is accessible
- [ ] Initialize request format is correct
- [ ] Response is valid JSON (currently failing)
- [ ] Server logs show error details
- [ ] Server configuration is correct

## Recommendations

### Immediate Actions

1. **Run Debug Endpoint**
   ```
   GET /api/integrations/mcp/debug
   ```
   Review the detailed report for both servers.

2. **Verify Notion Token**
   - Check if token exists in `user_settings`
   - Verify token format (should start with `secret_` or `ntn_`)
   - Test token with Notion API directly

3. **Check N8n Server**
   - Review N8n MCP server logs
   - Verify server is running correctly
   - Check server configuration

### Long-Term Improvements

1. **Token Validation**
   - Add token format validation
   - Verify token before use
   - Provide clear error messages

2. **Error Recovery**
   - Implement retry logic
   - Handle malformed JSON gracefully
   - Provide fallback mechanisms

3. **Monitoring**
   - Add logging for MCP requests
   - Track success/failure rates
   - Monitor session management

## Debug Endpoint Usage

### Request
```bash
GET /api/integrations/mcp/debug
```

### Response Format
```json
{
  "timestamp": "2026-01-03T...",
  "servers": {
    "notion": {
      "serverId": "notion",
      "steps": ["Step 1: ...", "Step 2: ..."],
      "tokenInfo": {
        "hasOAuthToken": true,
        "hasIntegrationToken": false,
        "tokenLength": 50,
        "tokenPrefix": "secret_abc",
        "tokenType": "integration"
      },
      "endpoint": "https://notion-mcp.moodmnky.com/mcp",
      "initResponse": {
        "status": 200,
        "headers": {...}
      },
      "sessionInfo": {
        "sessionId": "abc-123",
        "hasSessionId": true
      },
      "toolsResult": {
        "toolCount": 21,
        "tools": ["API-get-user", ...]
      },
      "success": true,
      "errors": [],
      "warnings": []
    },
    "n8n": {
      "serverId": "n8n",
      "errors": [
        "Initialize failed: 401 Unauthorized",
        "Response is not valid JSON"
      ],
      "jsonParseIssue": {
        "message": "Unterminated string in JSON",
        "position131": "..."
      }
    }
  }
}
```

## Debug Results Analysis

### Notion MCP - 403 Forbidden
**Issue**: Token is invalid or expired
**Solution**: Re-authenticate with Notion OAuth
**See**: `MCP_DEBUG_RESULTS_ANALYSIS.md` for detailed steps

### N8n MCP - 401 Unauthorized (Malformed JSON)
**Issue**: Server-side JSON parsing error at position 131
**Solution**: Fix N8n MCP server or use REST API
**See**: `MCP_DEBUG_RESULTS_ANALYSIS.md` for detailed analysis

## Next Steps

1. ✅ **Run Debug Endpoint**: Get detailed diagnostics
2. ✅ **Review Results**: Issues identified
3. 🔧 **Fix Notion**: Re-authenticate to refresh token
4. ⚠️ **Fix N8n**: Server-side fix required
5. 🧪 **Re-test**: Verify fixes work correctly
6. 📊 **Monitor**: Track ongoing health of MCP connections

---

**Last Updated**: 2026-01-03
**Status**: ✅ Issues Identified - Solutions Provided
**Debug Endpoint**: `/api/integrations/mcp/debug`
**Detailed Analysis**: See `MCP_DEBUG_RESULTS_ANALYSIS.md`

