# Authority Notion Sync - Complete Implementation Plan

## Overview
This document outlines the complete architecture for syncing Authority app data with Notion workspaces, creating a downloadable template system for users.

## Phase 1: Notion Database Creation (IN PROGRESS)

### 13 Core Databases to Create

1. **Chat Sessions** - All conversations with AI
2. **Characters** - Character profiles and development
3. **Worlds** - World-building documentation  
4. **Stories** - Story outlines and progress
5. **Chapters** - Individual chapter content
6. **Magic Systems** - Magic/power system design
7. **Factions & Organizations** - Groups and power structures
8. **Lore & History** - Historical events and myths
9. **Locations** - Places and landmarks
10. **Projects** - Organizing related works
11. **Image Gallery** - Generated and uploaded images
12. **Integration Keys** - API keys and service status
13. **Voice Profiles** - ElevenLabs voice configurations

### Universal Properties (ALL Databases)
- User ID (rich_text) - Links to authenticated user
- Supabase ID (rich_text) - UUID from app database
- Created At (created_time) - Auto timestamp
- Last Updated (last_edited_time) - Auto timestamp
- Image File (files) - Direct file upload when applicable
- Image URL (url) - Supabase Blob public URL when applicable

## Phase 2: Supabase → Notion Sync Layer

### API Routes to Create

#### `/api/notion/sync-character`
- POST endpoint
- Receives character data from Character Forge
- Creates/updates Notion page in Characters database
- Returns Notion page ID
- Stores Notion ID in Supabase `characters` table

#### `/api/notion/sync-world`
- Similar pattern for World Forge data

#### `/api/notion/sync-story`
- Similar pattern for Story data

#### `/api/notion/sync-chat`
- Syncs chat sessions in real-time
- Batches messages for efficiency

#### `/api/notion/sync-image`
- Handles image metadata
- Uploads to both Supabase Blob and Notion

### Supabase Schema Updates
Add `notion_page_id` column to all forge tables:
\`\`\`sql
ALTER TABLE characters ADD COLUMN notion_page_id TEXT;
ALTER TABLE worlds ADD COLUMN notion_page_id TEXT;
ALTER TABLE stories ADD COLUMN notion_page_id TEXT;
ALTER TABLE chat_hub_sessions ADD COLUMN notion_page_id TEXT;
\`\`\`

## Phase 3: Bidirectional Sync

### Notion → Supabase
- Webhook listener for Notion changes
- Update Supabase when users edit in Notion
- Maintain data consistency

### Conflict Resolution
- Last-write-wins strategy
- Timestamp comparison
- Optional: Version history

## Phase 4: Template System

### Template Creation
1. All databases live under "AUTHORITY_TEMPLATE" page
2. Users duplicate entire page to their workspace
3. App detects empty databases and populates

### First-Time Setup Flow
1. User clicks "Connect Notion" in Admin Panel
2. OAuth flow or manual token entry
3. App checks for template databases
4. If missing, prompts to duplicate template
5. If present, validates and connects

### Database ID Mapping
Store mapping in `user_settings`:
\`\`\`json
{
  "notion_config": {
    "workspace_id": "...",
    "database_ids": {
      "characters": "...",
      "worlds": "...",
      "stories": "...",
      ...
    }
  }
}
\`\`\`

## Phase 5: RAG Integration

### Notion as Knowledge Base
- Chat can query Notion databases
- Use Notion search API for semantic search
- Reference past creations in conversations

### Example Flow
1. User asks: "What was the name of that dark elf character I made?"
2. AI searches Notion Characters database
3. Finds matching entries
4. Responds with context from Notion

## Phase 6: Advanced Features

### Auto-Linking
- Automatically create relations between entities
- When character mentions world, link them
- Build knowledge graph over time

### Smart Suggestions
- AI suggests related characters/worlds
- Based on Notion database analysis

### Export Features
- Export entire project as PDF
- Generate wiki-style documentation
- Compile story manuscripts

## Implementation Priority

### Week 1: Core Databases
- [ ] Create all 13 Notion databases
- [ ] Test with sample data
- [ ] Document schemas

### Week 2: Basic Sync
- [ ] Character Forge → Notion sync
- [ ] World Forge → Notion sync  
- [ ] Chat → Notion sync
- [ ] Test end-to-end

### Week 3: Template System
- [ ] Finalize template page
- [ ] Add duplication instructions
- [ ] Build first-time setup flow

### Week 4: Advanced Features
- [ ] Bidirectional sync
- [ ] RAG integration
- [ ] Testing and polish

## Technical Architecture

### Tech Stack
- Next.js API Routes for sync endpoints
- Notion SDK (@notionhq/client)
- Supabase for app database
- Vercel Blob for image storage

### Data Flow
\`\`\`
User Action in App
  ↓
Supabase Database Updated
  ↓
Sync API Route Called
  ↓
Notion API Creates/Updates Page
  ↓
Notion Page ID Stored in Supabase
  ↓
Success Response to User
\`\`\`

### Error Handling
- Retry logic for failed syncs
- Queue system for bulk operations
- User notifications for sync status

## Security Considerations

### Notion Token Storage
- Encrypted in Supabase
- Per-user tokens (not shared)
- Secure OAuth flow

### Data Privacy
- Each user has separate Notion workspace
- No cross-user data access
- RLS policies on Supabase

### Rate Limiting
- Respect Notion API limits
- Batch operations when possible
- Queue system for high volume

## Testing Strategy

### Unit Tests
- Sync function logic
- Data transformation
- Error handling

### Integration Tests
- End-to-end sync flow
- Notion API interactions
- Supabase operations

### User Acceptance Testing
- Template duplication
- Real-world usage scenarios
- Performance under load

## Documentation

### User Guides
- How to connect Notion
- Using the template
- Syncing data
- Troubleshooting

### Developer Docs
- API endpoint specifications
- Database schemas
- Sync architecture
- Contributing guidelines

## Success Metrics

- 100% of Forge data synced to Notion
- < 5 second sync latency
- 99.9% sync success rate
- Positive user feedback
- Template downloads/usage

---

**Status**: Phase 1 in progress - Creating databases now
**Next Steps**: Complete all 13 database creations, then move to sync layer implementation
