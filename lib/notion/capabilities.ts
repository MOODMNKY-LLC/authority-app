/**
 * Notion Integration Capabilities Detection
 * 
 * Determines available features based on token types:
 * - Tier 1 (Connected Mode): OAuth token only - baseline functionality
 * - Tier 2 (Enhanced Mode): OAuth + Integration token - advanced features
 */

export interface UserSettings {
  notion_access_token?: string | null
  notion_token?: string | null
  notion_databases?: Record<string, string> | null
  notion_template_page_id?: string | null
}

export interface NotionCapabilities {
  tier: 'none' | 'connected' | 'enhanced'
  hasOAuth: boolean
  hasIntegrationToken: boolean
  canCreateDatabases: boolean
  canUseWebhooks: boolean
  canBulkOperations: boolean
  canAdvancedSearch: boolean
  canAutomation: boolean
  hasBasicAccess: boolean
  displayName: string
  description: string
}

/**
 * Get Notion capabilities based on available tokens
 */
export function getNotionCapabilities(settings: UserSettings | null | undefined): NotionCapabilities {
  if (!settings) {
    return {
      tier: 'none',
      hasOAuth: false,
      hasIntegrationToken: false,
      canCreateDatabases: false,
      canUseWebhooks: false,
      canBulkOperations: false,
      canAdvancedSearch: false,
      canAutomation: false,
      hasBasicAccess: false,
      displayName: 'Not Connected',
      description: 'Connect Notion to unlock world-building features',
    }
  }

  const hasOAuth = !!settings.notion_access_token
  const hasIntegrationToken = !!settings.notion_token
  const isEnhanced = hasOAuth && hasIntegrationToken
  const isConnected = hasOAuth && !hasIntegrationToken

  if (isEnhanced) {
    return {
      tier: 'enhanced',
      hasOAuth: true,
      hasIntegrationToken: true,
      canCreateDatabases: true, // Integration tokens excel at database creation
      canUseWebhooks: true, // Webhooks work best with integration tokens
      canBulkOperations: true, // Better performance for bulk operations
      canAdvancedSearch: true, // Integration tokens can search more comprehensively
      canAutomation: true, // Automation features require integration tokens
      hasBasicAccess: true,
      displayName: 'Enhanced Mode',
      description: 'Full access to all Notion features including automation, webhooks, and advanced search',
    }
  }

  if (isConnected) {
    return {
      tier: 'connected',
      hasOAuth: true,
      hasIntegrationToken: false,
      canCreateDatabases: false, // OAuth can create databases but integration tokens are more reliable
      canUseWebhooks: false, // Webhooks require integration tokens for reliable operation
      canBulkOperations: false, // OAuth works but integration tokens perform better
      canAdvancedSearch: false, // OAuth search may be limited compared to integration tokens
      canAutomation: false, // Automation requires integration tokens
      hasBasicAccess: true,
      displayName: 'Connected Mode',
      description: 'Full world-building features with Notion sync. Add an integration token to unlock automation and advanced features.',
    }
  }

  return {
    tier: 'none',
    hasOAuth: false,
    hasIntegrationToken: false,
    canCreateDatabases: false,
    canUseWebhooks: false,
    canBulkOperations: false,
    canAdvancedSearch: false,
    canAutomation: false,
    hasBasicAccess: false,
    displayName: 'Not Connected',
    description: 'Connect Notion to unlock world-building features',
  }
}

/**
 * Check if a specific feature is available
 */
export function canUseFeature(
  capabilities: NotionCapabilities,
  feature: keyof Omit<NotionCapabilities, 'tier' | 'hasOAuth' | 'hasIntegrationToken' | 'hasBasicAccess' | 'displayName' | 'description'>
): boolean {
  return capabilities[feature] === true
}

/**
 * Get upgrade message for enhanced features
 */
export function getUpgradeMessage(feature: string): string {
  return `Add a Notion integration token to unlock ${feature}. Integration tokens enable automation, webhooks, and advanced search capabilities.`
}



