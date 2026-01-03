# API Key Encryption and Verification Implementation

## Overview

All API keys are now encrypted at rest using AES-256-GCM encryption and stored securely in Supabase. API keys are verified when added, and user information is displayed as proof of successful connection.

## Implementation Details

### Encryption

- **Method**: AES-256-GCM (Web Crypto API)
- **Storage**: Encrypted keys stored as base64-encoded strings in `user_settings` table
- **Encryption Key**: Stored in environment variable `ENCRYPTION_KEY` (must be 32+ characters)
- **Retrieval**: Keys are decrypted server-side only when needed for API calls

### Hardcoded URLs

The following URLs are hardcoded from environment variables and not editable by users:

- **Flowise**: `NEXT_PUBLIC_FLOWISE_HOST` (default: `https://flowise.ai`)
- **N8n**: `NEXT_PUBLIC_N8N_HOST` (default: `https://slade-n8n.moodmnky.com`)
- **Discord Bot**: `NEXT_PUBLIC_DISCORD_CLIENT_ID` (for bot invite URL generation)

### API Key Verification

When a user adds an API key, it is automatically verified:

1. **Flowise**: Calls `/api/v1/user` endpoint
2. **N8n**: Calls `/api/v1/me` endpoint
3. **AI Providers**: 
   - OpenAI: Calls `/v1/models` endpoint
   - Anthropic: Calls `/v1/messages` endpoint (test call)
4. **Notion**: Uses existing token validation

Verification status and user information are stored in `user_settings`:
- `{service}_verified` (boolean)
- `{service}_user_info` (JSONB with name, email, id, etc.)

### User Experience

1. User enters API key
2. Clicks "Save & Verify" or "Verify" button
3. System encrypts and saves the key
4. System verifies the key by calling the service API
5. If verified, displays:
   - Green checkmark badge
   - User name/email from the service
   - "Verified" status indicator
6. User can then use verified integrations

### Security Features

- API keys never displayed in full (masked as `••••••••` when saved)
- Encryption happens server-side
- Decryption only occurs when making API calls
- Verification prevents invalid keys from being saved
- User information proves successful connection

## Environment Variables Required

```bash
# Encryption key (32+ characters, change in production!)
ENCRYPTION_KEY=your-secure-encryption-key-here-32-chars-min

# Service URLs (hardcoded, not editable by users)
NEXT_PUBLIC_FLOWISE_HOST=https://flowise.ai
NEXT_PUBLIC_N8N_HOST=https://slade-n8n.moodmnky.com

# Discord Bot (for invite URL generation)
NEXT_PUBLIC_DISCORD_CLIENT_ID=your-discord-bot-client-id
```

## Database Schema

New columns added to `user_settings`:

```sql
-- Verification status
flowise_verified BOOLEAN DEFAULT false
flowise_user_info JSONB
n8n_verified BOOLEAN DEFAULT false
n8n_user_info JSONB
ai_provider_verified BOOLEAN DEFAULT false
ai_provider_user_info JSONB
notion_token_verified BOOLEAN DEFAULT false
notion_token_user_info JSONB
```

## Migration

Run migration `041_encrypt_api_keys.sql` to add verification columns. Existing API keys will need to be re-entered and verified by users (one-time migration).

## API Routes Updated

- `/api/integrations/flowise` - Encrypts/decrypts API keys, uses hardcoded URL
- `/api/integrations/flowise/verify` - Verifies Flowise API key
- `/api/integrations/n8n` - Encrypts/decrypts API keys, uses hardcoded URL
- `/api/integrations/n8n/verify` - Verifies N8n API key
- `/api/integrations/ai-provider` - Encrypts/decrypts API keys
- `/api/integrations/ai-provider/verify` - Verifies AI provider API key

## UI Components Updated

All integration sections now:
- Remove base URL inputs (hardcoded from .env)
- Show verification status with badges
- Display user information when verified
- Include comprehensive tooltips
- Auto-verify after saving API key
- Mask saved API keys (`••••••••`)



