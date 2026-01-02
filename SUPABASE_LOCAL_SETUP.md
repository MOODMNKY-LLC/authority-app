# Supabase Local Development Setup

## ✅ Setup Complete

Supabase has been successfully configured for local development with Notion OAuth support.

## 🔧 Configuration Summary

### 1. Supabase Local Instance
- **Status**: Running
- **Project URL**: `http://127.0.0.1:54321`
- **Studio**: `http://127.0.0.1:54323`
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### 2. Environment Variables
All environment variables have been configured in `.env.local`:
- Supabase API URLs and keys
- Database connection strings
- Storage (S3) credentials
- Notion OAuth credentials

### 3. Notion OAuth Configuration
Notion OAuth has been configured in `supabase/config.toml`:
- **Enabled**: `true`
- **Client ID**: Configured
- **Redirect URI**: `http://localhost:54321/auth/v1/callback`
- **Skip Nonce Check**: `true` (required for local development)

## ⚠️ IMPORTANT: Notion OAuth Redirect URI Setup

**You MUST update your Notion OAuth app configuration** to allow the local redirect URI:

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Select your integration (Client ID: `2dcd872b-594c-80d4-853c-0037c4a41403`)
3. Navigate to "OAuth Domain and URIs" tab
4. Add the following redirect URI:
   ```
   http://localhost:54321/auth/v1/callback
   ```
5. Save the changes

**Note**: Notion may require you to add both:
- `http://localhost:54321/auth/v1/callback` (for Supabase auth callback)
- `http://localhost:3000` (for your Next.js app redirect, if needed)

## 🚀 Usage

### Start Supabase
```bash
cd /root/apps/authority-app
supabase start
```

### Stop Supabase
```bash
supabase stop
```

### View Status
```bash
supabase status
```

### Access Supabase Studio
Open in browser: `http://127.0.0.1:54323`

### View Email Testing (Mailpit)
Open in browser: `http://127.0.0.1:54324`

## 📝 Environment Variables Reference

All variables are in `.env.local`. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL`: `http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Local anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Local service role key
- `DATABASE_URL`: Local PostgreSQL connection string
- `NOTION_OAUTH_REDIRECT_URI`: `http://localhost:54321/auth/v1/callback`

## 🔐 Security Notes

1. **Local Development Only**: These credentials are for local development only
2. **Never Commit**: `.env.local` is gitignored - never commit these values
3. **Production**: Use production Supabase project credentials for deployment

## 🐛 Troubleshooting

### OAuth Not Working?
1. Verify Notion redirect URI is added (see above)
2. Check that Supabase is running: `supabase status`
3. Verify config.toml has `skip_nonce_check = true` for Notion
4. Restart Supabase: `supabase stop && supabase start`

### Database Connection Issues?
1. Ensure Supabase is running: `supabase status`
2. Check DATABASE_URL in `.env.local`
3. Verify port 54322 is not in use

### Port Conflicts?
If ports are already in use, you can modify them in `supabase/config.toml`:
- API: `[api].port`
- Database: `[db].port`
- Studio: `[studio].port`

## 📚 Resources

- [Supabase Local Development Docs](https://supabase.com/docs/guides/local-development)
- [Notion OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-notion)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
