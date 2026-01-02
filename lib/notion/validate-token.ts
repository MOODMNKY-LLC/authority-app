import { Client } from "@notionhq/client"

export interface TokenValidationResult {
  valid: boolean
  workspaceId?: string
  workspaceName?: string
  botId?: string
  error?: string
}

/**
 * Validate a Notion API token by making a test API call
 * 
 * @param token - Notion API token to validate
 * @returns Validation result with workspace info if valid
 */
export async function validateNotionToken(token: string): Promise<TokenValidationResult> {
  try {
    const notion = new Client({ auth: token })
    
    // Test token by getting user info
    const user = await notion.users.me()
    
    return {
      valid: true,
      workspaceId: user.id,
      workspaceName: user.name || undefined,
      botId: user.type === "bot" ? user.id : undefined,
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || "Invalid token",
    }
  }
}


