# Setting Up Local Notion MCP Server

## Overview

The remote Notion MCP server (`https://mcp.notion.com/mcp`) requires OAuth tokens. If you only have integration tokens, you can use the local Notion MCP server instead.

## Why Use Local Server?

- ✅ Works with integration tokens (no OAuth required)
- ✅ More control over the server instance
- ✅ Can run in your infrastructure
- ✅ Same tools and capabilities as remote server

## Setup Options for Next.js App

### Option 1: Separate Service/Container (Recommended)

Run the local MCP server as a separate service:

```bash
# Install the server
npm install -g @notionhq/notion-mcp-server

# Run with Streamable HTTP transport
npx @notionhq/notion-mcp-server --transport http --port 3001 --auth-token "your-secret-auth-token"
```

Then connect from your Next.js app:

```typescript
// Use local server URL instead of remote
const localServerUrl = process.env.NOTION_MCP_LOCAL_URL || "http://localhost:3001/mcp"
```

### Option 2: API Route Proxy

Create an API route that spawns/manages the local server:

```typescript
// app/api/mcp/notion-local/route.ts
// This would spawn the server process and proxy requests
```

### Option 3: Docker Container

Run the server in a Docker container:

```yaml
# docker-compose.yml
services:
  notion-mcp:
    image: mcp/notion
    ports:
      - "3001:3000"
    environment:
      - NOTION_TOKEN=${NOTION_TOKEN}
```

## Configuration

### Environment Variables

```env
# Local MCP Server URL
NOTION_MCP_LOCAL_URL=http://localhost:3001/mcp

# Auth token for local server (if using --auth-token)
NOTION_MCP_LOCAL_AUTH_TOKEN=your-secret-token

# Notion integration token (for the MCP server itself)
NOTION_TOKEN=ntn_****
```

### Using Integration Tokens

The local server uses integration tokens via `NOTION_TOKEN` environment variable:

```bash
NOTION_TOKEN="ntn_your_integration_token" npx @notionhq/notion-mcp-server --transport http
```

## Implementation

See `lib/mcp/notion-client-local.ts` for local server client implementation.

## References

- [Notion MCP Server GitHub](https://github.com/makenotion/notion-mcp-server)
- [Notion MCP Documentation](https://developers.notion.com/docs/get-started-with-mcp)


