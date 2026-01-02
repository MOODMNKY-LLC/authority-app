# Authority Deployment Guide

## Pre-Deployment Checklist

### 1. Run Database Migrations
Execute all SQL scripts in order in your Supabase SQL editor:
\`\`\`bash
scripts/001_create_chat_tables.sql
scripts/002_create_world_building_tables.sql
scripts/003_create_workspace_tables.sql
scripts/004_update_user_settings_table.sql
scripts/005_update_projects_and_images.sql
scripts/006_separate_projects_and_chats.sql
scripts/007_add_default_model_setting.sql
scripts/008_add_background_image_setting.sql
scripts/009_create_user_profiles_table.sql
scripts/010_create_ticker_messages_table.sql
scripts/011_create_admin_config_table.sql
scripts/012_add_notion_sync_fields.sql
scripts/013_add_notion_page_ids.sql
\`\`\`

### 2. Required Environment Variables

Add these to your Vercel project:

#### Supabase (Already Connected)
- `SUPABASE_URL` 
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### OpenAI API (Required for chat)
- `OPENAI_API_KEY` - Your OpenAI API key

#### Vercel Blob (Already Connected)
- `BLOB_READ_WRITE_TOKEN`

#### Optional Integrations
- `ELEVENLABS_API_KEY` - For voice generation
- `GOOGLE_CLOUD_TTS_API_KEY` - For Google voices (optional)
- `OLLAMA_HOST` - For local Ollama models (optional, e.g., http://localhost:11434)
- `N8N_WEBHOOK_URL` - For automation webhooks (optional)

#### Discord Bot (Optional - for future integration)
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_CHANNEL_ID`
- `WEBHOOK_SECRET`

### 3. Deploy to Vercel

**Option 1: From v0 Interface**
Click the "Publish" button in the top right of the editor

**Option 2: Using GitHub**
1. Push code to GitHub repository
2. Import in Vercel dashboard
3. Add environment variables
4. Deploy

**Option 3: Vercel CLI**
\`\`\`bash
vercel
vercel --prod
\`\`\`

### 4. Post-Deployment Steps

1. **Test the deployment**: Open your deployed URL
2. **Run migrations**: Execute SQL scripts in Supabase dashboard
3. **Configure admin settings**: Use the admin panel (Cmd/Ctrl + K → Admin)
4. **Set up authentication**: Configure Supabase Auth providers if needed
5. **Test chat functionality**: Send a message to verify OpenAI integration

### 5. Production Optimizations

#### Enable Supabase Connection Pooling
Use the `POSTGRES_PRISMA_URL` for better performance in production.

#### Configure CORS (if needed)
Add your deployment domain to Supabase allowed origins:
- Go to Supabase Dashboard → Settings → API
- Add your Vercel domain to "Site URL"

#### Set up Custom Domain (optional)
1. In Vercel project settings → Domains
2. Add your custom domain
3. Update Supabase redirect URLs if using auth

## Troubleshooting

### Database Connection Errors
- Verify Supabase env vars are correct
- Check if RLS policies are properly set
- Ensure migrations have been run

### OpenAI API Errors
- Verify API key is valid
- Check API key has sufficient credits
- Ensure OPENAI_API_KEY env var is set

### Build Errors
- Run `pnpm install` locally to check dependencies
- Review build logs in Vercel dashboard
- Check for TypeScript errors

### Runtime Errors
- Check Vercel function logs
- Verify all required env vars are set
- Test API routes individually

## Database Schema Overview

The app uses the following main tables:
- `chat_hub_messages` - Main chat interface messages
- `chat_sessions` - Individual chat sessions
- `projects` - Project organization
- `images` - Generated images and assets
- `user_settings` - Per-user configuration
- `user_profiles` - User profile data
- `admin_config` - System-wide settings
- `ticker_messages` - Dynamic ticker messages

All tables use Row Level Security (RLS) for data protection.

## Next Steps After Deployment

1. **Test all Forge tools**: Character, World, Story, Magic System, Faction, Location
2. **Configure voice models**: Add ElevenLabs key for TTS
3. **Set up Discord bot**: Follow DISCORD_BOT_SETUP.md
4. **Enable Notion sync**: Run remaining Notion scripts when ready
5. **Customize branding**: Update ticker messages, admin config, user profiles

## Support

For issues or questions:
- Check Vercel deployment logs
- Review Supabase database logs
- Test API endpoints individually
- Verify all environment variables are set correctly
