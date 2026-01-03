# Feature Tier Implementation Guide

## Tier Structure

### Tier 1: "Connected Mode" (OAuth Only)
**Token Required**: `notion_access_token` (OAuth)

**Available Features**:
- ✅ All world-building features (Characters, Worlds, Stories, etc.)
- ✅ Read/write to granted Notion pages and databases
- ✅ Template duplication and initial sync
- ✅ View and edit existing content
- ✅ Basic search within granted resources
- ✅ Seed data sync to Notion
- ✅ Create pages in existing databases
- ✅ Update page properties
- ✅ Basic content synchronization

**Limitations**:
- ⚠️ Search may return fewer results than integration tokens
- ⚠️ Bulk operations may be slower
- ⚠️ No webhook support
- ⚠️ Limited automation capabilities

### Tier 2: "Enhanced Mode" (OAuth + Integration Token)
**Tokens Required**: `notion_access_token` (OAuth) + `notion_token` (Integration Token)

**Additional Features**:
- ✅ Database creation capabilities
- ✅ Advanced search across entire workspace
- ✅ Bulk operations and batch processing
- ✅ Webhook support for real-time sync
- ✅ Automation workflows
- ✅ Advanced sync options
- ✅ Background processing capabilities
- ✅ Enhanced performance for large operations

## Implementation Pattern

### Capability Detection

```typescript
// lib/notion/capabilities.ts
export function getNotionCapabilities(settings: UserSettings) {
  const hasOAuth = !!settings.notion_access_token
  const hasIntegrationToken = !!settings.notion_token
  
  return {
    tier: hasIntegrationToken ? 'enhanced' : hasOAuth ? 'connected' : 'none',
    canCreateDatabases: hasIntegrationToken,
    canUseWebhooks: hasIntegrationToken,
    canBulkOperations: hasIntegrationToken,
    canAdvancedSearch: hasIntegrationToken,
    hasBasicAccess: hasOAuth,
  }
}
```

### Feature Gating Example

```typescript
// components/forge-page.tsx
const capabilities = getNotionCapabilities(userSettings)

{capabilities.canCreateDatabases && (
  <Button onClick={handleCreateDatabase}>
    Create New Database
  </Button>
)}

{capabilities.tier === 'enhanced' && (
  <Badge>Enhanced Mode</Badge>
)}
```

## Migration Path

1. **Phase 1**: Implement capability detection system
2. **Phase 2**: Add UI indicators for tier status
3. **Phase 3**: Gate advanced features behind integration token check
4. **Phase 4**: Add upgrade prompts for enhanced features
5. **Phase 5**: Implement enhanced features that require integration tokens



