# MCP Server Installation & Integration Guide

Complete guide for integrating MCP servers into Next.js and other applications.

## 📋 Quick Reference

### All Server Endpoints

| Server | Endpoint URL | Transport | Auth Required |
|--------|-------------|-----------|--------------|
| Notion | `https://notion-mcp.moodmnky.com/mcp` | HTTP/SSE | ✅ Bearer Token |
| Firecrawl | `https://firecrawl-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| Supabase | `https://supabase-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| Fetch | `https://fetch-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| Filesystem | `https://filesystem-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| Memory | `https://memory-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| n8n | `https://n8n-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| Magic | `https://magic-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| MagicUI | `https://magicui-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| Brave Search | `https://brave-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| Tavily | `https://tavily-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| GitHub | `https://github-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |
| Sequential Thinking | `https://sequential-thinking-mcp.moodmnky.com/mcp` | HTTP/SSE | ❌ None |

## 🔑 Environment Variables

### Required for Server-Side Usage

Add these to your `.env.local` file (Next.js) or `.env` file:

```bash
# ==============================================================================
# MCP SERVER ENDPOINTS
# ==============================================================================

# Notion MCP Server
MCP_NOTION_URL=https://notion-mcp.moodmnky.com/mcp
MCP_NOTION_TOKEN=ntn_h87200563322kIxmXHtz1C2dKPwuAnsja69XIXeRGtdeTT

# Firecrawl MCP Server
MCP_FIRECRAWL_URL=https://firecrawl-mcp.moodmnky.com/mcp
MCP_FIRECRAWL_API_KEY=fc-38c356eab8bb481e9c54a0ea7b87217d

# Supabase MCP Server
MCP_SUPABASE_URL=https://supabase-mcp.moodmnky.com/mcp
MCP_SUPABASE_PROJECT_REF=wfzcuaessqrdzoczjbrz
MCP_SUPABASE_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmemN1YWVzc3FyZHpvY3pqYnJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIzMDk4OCwiZXhwIjoyMDgyODA2OTg4fQ.pwL9vDIYM5FsTm_z8QSwen8UP3L3A2QBJeddy5rOBR4

# Fetch MCP Server
MCP_FETCH_URL=https://fetch-mcp.moodmnky.com/mcp

# Filesystem MCP Server
MCP_FILESYSTEM_URL=https://filesystem-mcp.moodmnky.com/mcp

# Memory MCP Server
MCP_MEMORY_URL=https://memory-mcp.moodmnky.com/mcp

# n8n MCP Server
MCP_N8N_URL=https://n8n-mcp.moodmnky.com/mcp

# Magic MCP Server (@21st-dev/magic)
MCP_MAGIC_URL=https://magic-mcp.moodmnky.com/mcp
MCP_MAGIC_API_KEY=ccb5589f1c59f4535a74c14d14d75fdc02f69f571344fdc47b8cda007f9420f2

# MagicUI MCP Server
MCP_MAGICUI_URL=https://magicui-mcp.moodmnky.com/mcp

# Brave Search MCP Server
MCP_BRAVE_URL=https://brave-mcp.moodmnky.com/mcp
MCP_BRAVE_API_KEY=BSArD2QB4pyWBoLUP2dxCv2qZkAz79l

# Tavily MCP Server
MCP_TAVILY_URL=https://tavily-mcp.moodmnky.com/mcp
MCP_TAVILY_API_KEY=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

# GitHub MCP Server
MCP_GITHUB_URL=https://github-mcp.moodmnky.com/mcp
MCP_GITHUB_TOKEN=your_github_personal_access_token_here

# Sequential Thinking MCP Server
MCP_SEQUENTIAL_THINKING_URL=https://sequential-thinking-mcp.moodmnky.com/mcp
MCP_DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

## 📦 Installation

### 1. Install MCP SDK

```bash
npm install @modelcontextprotocol/sdk
```

### 2. Install Additional Dependencies (if needed)

```bash
npm install node-fetch @types/node-fetch  # For fetch support
```

## 🚀 Next.js Integration

### Server Actions Setup

Create `app/lib/mcp/client.ts`:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface MCPServerConfig {
  url: string;
  headers?: Record<string, string>;
}

export async function createMCPClient(config: MCPServerConfig) {
  const transport = new SSEClientTransport(
    new URL(config.url),
    {
      headers: config.headers || {},
    }
  );

  const client = new Client(
    {
      name: 'nextjs-app',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  return client;
}
```

### Example: Server Action for Notion

Create `app/actions/notion.ts`:

```typescript
'use server';

import { createMCPClient } from '@/lib/mcp/client';

export async function queryNotion(query: string) {
  const client = await createMCPClient({
    url: process.env.MCP_NOTION_URL!,
    headers: {
      'Authorization': `Bearer ${process.env.MCP_NOTION_TOKEN}`,
    },
  });

  try {
    // List available tools
    const { tools } = await client.listTools();
    
    // Call a tool (example)
    const result = await client.callTool({
      name: 'query_database', // Replace with actual tool name
      arguments: {
        query: query,
      },
    });

    return result;
  } finally {
    await client.close();
  }
}
```

### Example: Server Action for Brave Search

Create `app/actions/brave.ts`:

```typescript
'use server';

import { createMCPClient } from '@/lib/mcp/client';

export async function searchBrave(query: string, count: number = 10) {
  const client = await createMCPClient({
    url: process.env.MCP_BRAVE_URL!,
  });

  try {
    const result = await client.callTool({
      name: 'brave_search',
      arguments: {
        query: query,
        count: count,
      },
    });

    return result;
  } finally {
    await client.close();
  }
}
```

### Example: API Route Handler

Create `app/api/mcp/[server]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createMCPClient } from '@/lib/mcp/client';

const SERVER_CONFIGS: Record<string, { url: string; headers?: Record<string, string> }> = {
  notion: {
    url: process.env.MCP_NOTION_URL!,
    headers: {
      'Authorization': `Bearer ${process.env.MCP_NOTION_TOKEN}`,
    },
  },
  brave: {
    url: process.env.MCP_BRAVE_URL!,
  },
  firecrawl: {
    url: process.env.MCP_FIRECRAWL_URL!,
  },
  // Add other servers...
};

export async function POST(
  request: NextRequest,
  { params }: { params: { server: string } }
) {
  const config = SERVER_CONFIGS[params.server];
  
  if (!config) {
    return NextResponse.json(
      { error: 'Server not found' },
      { status: 404 }
    );
  }

  const body = await request.json();
  const client = await createMCPClient(config);

  try {
    if (body.method === 'tools/list') {
      const result = await client.listTools();
      return NextResponse.json(result);
    }

    if (body.method === 'tools/call') {
      const result = await client.callTool({
        name: body.name,
        arguments: body.arguments || {},
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Method not supported' }, { status: 400 });
  } catch (error) {
    console.error('MCP Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
```

## 🔧 Client Configuration Examples

### TypeScript Configuration

Create `lib/mcp/config.ts`:

```typescript
export const MCP_SERVERS = {
  notion: {
    url: process.env.MCP_NOTION_URL!,
    token: process.env.MCP_NOTION_TOKEN!,
    requiresAuth: true,
  },
  brave: {
    url: process.env.MCP_BRAVE_URL!,
    apiKey: process.env.MCP_BRAVE_API_KEY!,
    requiresAuth: false,
  },
  firecrawl: {
    url: process.env.MCP_FIRECRAWL_URL!,
    apiKey: process.env.MCP_FIRECRAWL_API_KEY!,
    requiresAuth: false,
  },
  supabase: {
    url: process.env.MCP_SUPABASE_URL!,
    projectRef: process.env.MCP_SUPABASE_PROJECT_REF!,
    accessToken: process.env.MCP_SUPABASE_ACCESS_TOKEN!,
    requiresAuth: false,
  },
  // Add other servers...
} as const;

export type MCPServerName = keyof typeof MCP_SERVERS;
```

### React Hook Example

Create `hooks/useMCP.ts`:

```typescript
'use client';

import { useState } from 'react';

export function useMCP(serverName: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const callTool = async (toolName: string, args: Record<string, any>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mcp/${serverName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'tools/call',
          name: toolName,
          arguments: args,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { callTool, loading, error };
}
```

## 📝 Usage Examples

### Example 1: Search with Brave

```typescript
'use client';

import { useMCP } from '@/hooks/useMCP';

export function SearchComponent() {
  const { callTool, loading, error } = useMCP('brave');

  const handleSearch = async (query: string) => {
    try {
      const results = await callTool('brave_search', {
        query: query,
        count: 10,
      });
      console.log('Search results:', results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  return (
    <div>
      <button onClick={() => handleSearch('Next.js best practices')}>
        Search
      </button>
      {loading && <p>Searching...</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Example 2: Query Notion Database

```typescript
'use server';

import { createMCPClient } from '@/lib/mcp/client';
import { MCP_SERVERS } from '@/lib/mcp/config';

export async function queryNotionDatabase(databaseId: string, filter?: any) {
  const client = await createMCPClient({
    url: MCP_SERVERS.notion.url,
    headers: {
      'Authorization': `Bearer ${MCP_SERVERS.notion.token}`,
    },
  });

  try {
    const result = await client.callTool({
      name: 'query_database',
      arguments: {
        database_id: databaseId,
        filter: filter,
      },
    });

    return result;
  } finally {
    await client.close();
  }
}
```

### Example 3: Web Scraping with Firecrawl

```typescript
'use server';

import { createMCPClient } from '@/lib/mcp/client';
import { MCP_SERVERS } from '@/lib/mcp/config';

export async function scrapeURL(url: string) {
  const client = await createMCPClient({
    url: MCP_SERVERS.firecrawl.url,
  });

  try {
    const result = await client.callTool({
      name: 'scrape_url',
      arguments: {
        url: url,
      },
    });

    return result;
  } finally {
    await client.close();
  }
}
```

## 🔐 Authentication

### Notion Authentication

Notion requires a Bearer token in the Authorization header:

```typescript
headers: {
  'Authorization': `Bearer ${process.env.MCP_NOTION_TOKEN}`,
}
```

### Other Servers

Most other servers don't require authentication headers, but may need API keys passed as tool arguments (e.g., Brave Search, Tavily).

## 🧪 Testing

### Test Server Connection

```typescript
import { createMCPClient } from '@/lib/mcp/client';

async function testConnection() {
  const client = await createMCPClient({
    url: process.env.MCP_BRAVE_URL!,
  });

  try {
    // Initialize connection
    await client.initialize();
    
    // List available tools
    const { tools } = await client.listTools();
    console.log('Available tools:', tools);
    
    // Test a tool call
    const result = await client.callTool({
      name: tools[0].name,
      arguments: {},
    });
    
    console.log('Tool result:', result);
  } finally {
    await client.close();
  }
}
```

## 📚 Server-Specific Details

### Notion MCP Server
- **Endpoint**: `https://notion-mcp.moodmnky.com/mcp`
- **Auth**: Bearer token required
- **Tools**: Database queries, page operations
- **Token**: Get from https://www.notion.so/my-integrations

### Brave Search MCP Server
- **Endpoint**: `https://brave-mcp.moodmnky.com/mcp`
- **Auth**: None (API key passed in tool arguments)
- **Tools**: `brave_search` - Web search
- **API Key**: Get from https://brave.com/search/api/

### Firecrawl MCP Server
- **Endpoint**: `https://firecrawl-mcp.moodmnky.com/mcp`
- **Auth**: None (API key passed in tool arguments)
- **Tools**: `scrape_url`, `crawl_url` - Web scraping
- **API Key**: Get from https://firecrawl.dev/

### Supabase MCP Server
- **Endpoint**: `https://supabase-mcp.moodmnky.com/mcp`
- **Auth**: None (configured server-side)
- **Tools**: Database operations, RLS policies
- **Project Ref**: From Supabase dashboard

### GitHub MCP Server
- **Endpoint**: `https://github-mcp.moodmnky.com/mcp`
- **Auth**: None (token passed in tool arguments)
- **Tools**: Repository operations, issues, PRs
- **Token**: GitHub Personal Access Token

### Tavily MCP Server
- **Endpoint**: `https://tavily-mcp.moodmnky.com/mcp`
- **Auth**: None (API key passed in tool arguments)
- **Tools**: Research, search
- **API Key**: Get from https://tavily.com/

## 🐛 Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if server URL is correct
   - Verify server is running: `curl https://{server}-mcp.moodmnky.com/mcp`

2. **Authentication Errors**
   - Verify environment variables are set
   - Check token format (Bearer token for Notion)

3. **SSE Transport Issues**
   - Ensure `Accept: application/json, text/event-stream` header is set
   - Check network connectivity

4. **Tool Not Found**
   - List available tools first: `client.listTools()`
   - Verify tool name matches exactly

## 📖 Additional Resources

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://modelcontextprotocol.io)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)

## 🔄 Updates

To update server endpoints or add new servers, update:
1. `.env.local` file
2. `lib/mcp/config.ts`
3. `app/api/mcp/[server]/route.ts` (if using API routes)

---

**Last Updated**: 2026-01-03
**Server Count**: 13 MCP servers available
**Status**: All servers operational ✅

