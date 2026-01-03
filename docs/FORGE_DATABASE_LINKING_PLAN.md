# Forge Database Linking - Comprehensive Implementation Plan

## Executive Summary

This document outlines the complete architecture and implementation plan for linking Authority's Forge builders to Notion databases, enabling seamless synchronization of generated content with Notion workspaces.

## Current State Analysis

### Forge Builders
1. **Character Forge** → Characters database
2. **World Forge** → Worlds database
3. **Storyline Forge** → Stories database
4. **Magic System Forge** → Magic Systems database
5. **Faction Forge** → Factions & Organizations database
6. **Lore & History Forge** → Lore & History database

### Existing Infrastructure
- ✅ Notion sync tables (`notion_characters_sync`, `notion_worlds_sync`, `notion_stories_sync`, `notion_pages_sync`)
- ✅ Sync API endpoint (`/api/notion/sync-to-postgres`)
- ✅ Query API endpoint (`/api/notion/query-synced`)
- ✅ Generic sync endpoint (`/api/notion/sync`) for creating/updating Notion pages
- ✅ Supabase tables with `notion_page_id` fields

### Current Workflow Gap
- ❌ No UI for selecting Notion databases during Forge generation
- ❌ No display of existing linked items
- ❌ No option to link to existing vs create new
- ❌ No visual sync status indicators

## Component Architecture

### 1. Database Selector Component (`components/forge-database-selector.tsx`)

**Purpose**: Allow users to select target Notion database and link mode

**Features**:
- Combobox for database selection (if multiple databases available)
- Toggle between "Create New" and "Link Existing" modes
- Visual indicator showing selected database
- Badge showing sync status

**Props**:
```typescript
interface DatabaseSelectorProps {
  forgeType: "character" | "world" | "storyline" | "magic" | "faction" | "lore"
  selectedDatabaseId?: string
  onDatabaseSelect: (databaseId: string) => void
  linkMode: "create" | "link"
  onLinkModeChange: (mode: "create" | "link") => void
}
```

**UI Pattern**: shadcn Combobox with Command component

### 2. Existing Items List Component (`components/forge-existing-items.tsx`)

**Purpose**: Display and allow selection of existing Notion items

**Features**:
- Searchable list of existing items from Notion sync tables
- Command palette interface for quick selection
- Shows item metadata (name, description, last updated)
- Visual indicators for sync status
- "Open in Notion" link

**Props**:
```typescript
interface ExistingItemsListProps {
  forgeType: string
  databaseId: string
  onItemSelect: (item: NotionItem) => void
  selectedItemId?: string
}
```

**UI Pattern**: shadcn Command component in Popover

### 3. Link Status Badge Component (`components/forge-link-status.tsx`)

**Purpose**: Visual indicator of sync/link status

**Features**:
- Shows sync status (synced, pending, error)
- Last sync timestamp
- Click to open in Notion
- Refresh sync button

**Props**:
```typescript
interface LinkStatusBadgeProps {
  notionPageId?: string
  lastSyncedAt?: string
  status: "synced" | "pending" | "error" | "not_linked"
}
```

**UI Pattern**: Badge with icon and tooltip

### 4. Forge Database Panel Component (`components/forge-database-panel.tsx`)

**Purpose**: Main container integrating all database linking components

**Features**:
- Combines DatabaseSelector, ExistingItemsList, and LinkStatusBadge
- Manages state for database selection and linking
- Handles API calls for querying and linking
- Provides callbacks for parent component

**Props**:
```typescript
interface ForgeDatabasePanelProps {
  forgeType: string
  forgeData: ForgeInputs
  onLinkComplete: (notionPageId: string) => void
}
```

## API Endpoints

### 1. `/api/notion/forge/query-items` (GET)

**Purpose**: Query existing items from Notion sync tables for a specific Forge type

**Request**:
```typescript
{
  forgeType: "character" | "world" | "storyline" | "magic" | "faction" | "lore"
  databaseId?: string  // Optional: specific database ID
  search?: string      // Optional: search query
  limit?: number       // Optional: default 50
}
```

**Response**:
```typescript
{
  success: boolean
  items: Array<{
    id: string
    notion_page_id: string
    notion_database_id: string
    title: string
    description?: string
    properties: Record<string, any>
    last_synced_at: string
    updated_at: string
  }>
  count: number
}
```

**Implementation**: Query appropriate sync table based on `forgeType`

### 2. `/api/notion/forge/create-link` (POST)

**Purpose**: Create new Notion page and link to Forge content

**Request**:
```typescript
{
  forgeType: string
  databaseId: string
  forgeData: {
    // Type-specific data (characterName, worldName, etc.)
  }
  linkToSupabase?: boolean  // Whether to also create Supabase record
  supabaseRecordId?: string  // If linking to existing Supabase record
}
```

**Response**:
```typescript
{
  success: boolean
  notion_page_id: string
  notion_database_id: string
  supabase_id?: string
  message: string
}
```

**Implementation**: 
- Use existing `/api/notion/sync` endpoint pattern
- Create Notion page with mapped properties
- Optionally create/update Supabase record with `notion_page_id`

### 3. `/api/notion/forge/link-existing` (POST)

**Purpose**: Link existing Notion page to Forge content

**Request**:
```typescript
{
  forgeType: string
  notionPageId: string
  supabaseRecordId?: string  // If linking to Supabase record
}
```

**Response**:
```typescript
{
  success: boolean
  notion_page_id: string
  supabase_id?: string
  message: string
}
```

**Implementation**: Update Supabase record with `notion_page_id`

## Database Mapping

### Character Forge → Characters Database

**Forge Inputs**:
- `characterName` → `Name` (title)
- `characterDescription` → `Description` (rich_text)
- `characterAge` → `Age` (number)
- `characterRole` → `Role` (select)

**Notion Properties**:
- Name (title)
- User ID (rich_text)
- Supabase ID (rich_text)
- Description (rich_text)
- Age (number)
- Role (select)
- Backstory (rich_text)
- Motivations (rich_text)
- Goals (rich_text)

### World Forge → Worlds Database

**Forge Inputs**:
- `worldName` → `World Name` (title)
- `worldConcept` → `Concept/Premise` (rich_text)
- `worldTechLevel` → `Technology Level` (select)
- `worldTheme` → `Theme` (multi_select)

**Notion Properties**:
- World Name (title)
- User ID (rich_text)
- Supabase ID (rich_text)
- Concept/Premise (rich_text)
- Technology Level (select)
- Theme (multi_select)
- Geography (rich_text)
- Cultures & Civilizations (rich_text)

### Storyline Forge → Stories Database

**Forge Inputs**:
- `storyTitle` → `Story Title` (title)
- `storyPremise` → `Premise` (rich_text)
- `storyGenre` → `Genre` (select)
- `storyTone` → `Tone` (select)

**Notion Properties**:
- Story Title (title)
- User ID (rich_text)
- Supabase ID (rich_text)
- Premise (rich_text)
- Genre (select)
- Tone (select)
- Plot Structure (rich_text)

### Magic System Forge → Magic Systems Database

**Forge Inputs**:
- `magicName` → `Name` (title)
- `magicConcept` → `Concept` (rich_text)
- `magicSource` → `Power Source` (select)
- `magicCost` → `Cost/Limitation` (rich_text)

**Notion Properties**:
- Name (title)
- User ID (rich_text)
- Supabase ID (rich_text)
- Concept (rich_text)
- Power Source (select)
- Cost/Limitation (rich_text)
- Rules (rich_text)
- Power Tiers (rich_text)

### Faction Forge → Factions & Organizations Database

**Forge Inputs**:
- `factionName` → `Name` (title)
- `factionPurpose` → `Purpose` (rich_text)
- `factionType` → `Type` (select)
- `factionPower` → `Power Level` (select)

**Notion Properties**:
- Name (title)
- User ID (rich_text)
- Supabase ID (rich_text)
- Purpose (rich_text)
- Type (select)
- Power Level (select)
- Hierarchy (rich_text)
- Goals (rich_text)

### Lore & History Forge → Lore & History Database

**Forge Inputs**:
- `loreName` → `Name` (title)
- `loreOverview` → `Overview` (rich_text)
- `loreTimePeriod` → `Time Period` (select)
- `loreSignificance` → `Significance` (rich_text)

**Notion Properties**:
- Name (title)
- User ID (rich_text)
- Supabase ID (rich_text)
- Overview (rich_text)
- Time Period (select)
- Significance (rich_text)
- Historical Context (rich_text)

## Implementation Steps

### Phase 1: API Endpoints (Foundation)

1. **Create `/api/notion/forge/query-items`**
   - Query sync tables based on forgeType
   - Support search and filtering
   - Return formatted item list

2. **Create `/api/notion/forge/create-link`**
   - Map Forge data to Notion properties
   - Create Notion page via API
   - Optionally create/update Supabase record
   - Return notion_page_id

3. **Create `/api/notion/forge/link-existing`**
   - Validate Notion page exists
   - Update Supabase record with notion_page_id
   - Return success status

### Phase 2: Core Components

1. **Database Selector Component**
   - Install shadcn Combobox if not present
   - Create component with database selection
   - Add link mode toggle
   - Style to match app theme

2. **Existing Items List Component**
   - Use Command component for searchable list
   - Fetch items from API endpoint
   - Display with metadata
   - Handle selection

3. **Link Status Badge Component**
   - Create badge with status colors
   - Show sync timestamp
   - Add "Open in Notion" link
   - Refresh button

### Phase 3: Integration

1. **Forge Database Panel**
   - Combine all components
   - Manage state and API calls
   - Handle callbacks

2. **Integrate into Forge Dialogs**
   - Add panel to each Forge builder
   - Update handleForgeGenerate to include linking
   - Show link status after generation

3. **Update Forge Workflow**
   - Add database selection before generation
   - Show linking options after generation
   - Display linked status in chat/UI

### Phase 4: Enhancement

1. **Auto-linking**
   - Option to auto-link after generation
   - Smart matching to existing items
   - Batch linking for multiple items

2. **Sync Status Dashboard**
   - Show all linked items
   - Sync status overview
   - Manual sync triggers

3. **Bidirectional Sync**
   - Update Notion pages when Forge data changes
   - Handle conflicts
   - Sync indicators

## UI/UX Design Specifications

### Visual Design
- **Theme**: Glassmorphism with red/black/white color scheme
- **Components**: shadcn UI components (Combobox, Command, Badge, Popover)
- **Icons**: Lucide React icons
- **Layout**: Integrated into existing Forge dialog

### User Flow

1. **User opens Forge builder**
   - Sees database selector at top
   - Can choose database (if multiple available)
   - Can toggle between "Create New" and "Link Existing"

2. **If "Link Existing" selected**
   - Existing items list appears
   - User can search and select item
   - Selected item highlighted

3. **User fills Forge inputs**
   - Standard Forge form below database panel
   - Link status badge shows current status

4. **User clicks "Generate"**
   - Content generated via AI
   - If database selected, linking happens automatically
   - Success message with Notion link

5. **After generation**
   - Link status badge updates
   - "Open in Notion" button appears
   - Sync status visible

### Error Handling

- **Database not configured**: Show setup prompt
- **Sync failed**: Show error message with retry
- **Notion API error**: Fallback to Supabase-only storage
- **Network error**: Queue for retry

## Testing Plan

### Unit Tests
- Component rendering
- API endpoint responses
- Data mapping functions
- Error handling

### Integration Tests
- Full Forge → Notion flow
- Database selection → linking
- Existing item selection
- Sync status updates

### E2E Tests
- Complete user workflow
- Multiple Forge types
- Error scenarios
- Sync verification

## Success Metrics

- ✅ All 6 Forge types linked to databases
- ✅ Database selection UI functional
- ✅ Existing items searchable and selectable
- ✅ Linking works for create and link modes
- ✅ Sync status visible and accurate
- ✅ Error handling robust

## Future Enhancements

1. **Bulk Operations**: Link multiple items at once
2. **Smart Suggestions**: AI-powered item matching
3. **Template System**: Pre-configured database templates
4. **Version History**: Track changes in Notion
5. **Collaboration**: Multi-user linking and sync

## Dependencies

- shadcn/ui components (Combobox, Command, Popover, Badge)
- Notion API client
- Supabase client
- Existing sync infrastructure

## Timeline Estimate

- **Phase 1 (API)**: 2-3 hours
- **Phase 2 (Components)**: 4-5 hours
- **Phase 3 (Integration)**: 3-4 hours
- **Phase 4 (Enhancement)**: 2-3 hours
- **Testing & Polish**: 2-3 hours

**Total**: ~13-18 hours

## Risk Mitigation

- **Notion API rate limits**: Use sync tables for reads, batch writes
- **Sync conflicts**: Last-write-wins with timestamps
- **User confusion**: Clear UI labels and tooltips
- **Performance**: Debounce search, lazy load lists

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: API endpoint implementation
3. Create component specifications
4. Implement and test incrementally
5. Deploy and monitor



