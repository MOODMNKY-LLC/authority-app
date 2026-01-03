/**
 * Notion Token Type Detector
 * Determines if a token is an OAuth token or integration token
 * OAuth tokens: Longer, different format, from OAuth flow
 * Integration tokens: Start with "ntn_" or "secret_", from integration settings
 */

export type NotionTokenType = "oauth" | "integration" | "unknown"

export interface TokenAnalysis {
  type: NotionTokenType
  isValid: boolean
  length: number
  prefix: string
  description: string
}

/**
 * Analyze a Notion token to determine its type
 */
export function analyzeNotionToken(token: string): TokenAnalysis {
  const length = token.length
  const prefix = token.substring(0, 10)

  // Integration tokens typically:
  // - Start with "ntn_" (new format) or "secret_" (old format)
  // - Are around 50-60 characters
  if (token.startsWith("ntn_") || token.startsWith("secret_")) {
    return {
      type: "integration",
      isValid: length > 40 && length < 100,
      length,
      prefix,
      description: "Integration token (works with local MCP server, not remote)",
    }
  }

  // OAuth tokens:
  // - Don't have a specific prefix
  // - Are typically longer (100+ characters)
  // - Come from OAuth flow
  if (length > 80) {
    return {
      type: "oauth",
      isValid: true,
      length,
      prefix,
      description: "OAuth token (works with remote MCP server)",
    }
  }

  return {
    type: "unknown",
    isValid: false,
    length,
    prefix,
    description: "Unknown token format",
  }
}

/**
 * Verify token works with Notion API
 */
export async function verifyTokenWithNotionAPI(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
      },
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Determine if token can be used with remote MCP server
 */
export async function canUseWithRemoteMCP(token: string): Promise<boolean> {
  const analysis = analyzeNotionToken(token)
  
  // Remote MCP requires OAuth tokens
  if (analysis.type !== "oauth") {
    return false
  }

  // Verify it works with Notion API
  return await verifyTokenWithNotionAPI(token)
}

/**
 * Determine if token can be used with local MCP server
 */
export async function canUseWithLocalMCP(token: string): Promise<boolean> {
  const analysis = analyzeNotionToken(token)
  
  // Local MCP accepts integration tokens
  if (analysis.type !== "integration") {
    return false
  }

  // Verify it works with Notion API
  return await verifyTokenWithNotionAPI(token)
}


