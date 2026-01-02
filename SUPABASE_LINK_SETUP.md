# Supabase Project Linking

## ✅ Manual Link Configuration Created

A manual link configuration has been created in `.supabase/config.toml` with your production project reference:
- **Project ID**: `wfzcuaessqrdzoczjbrz`
- **Project URL**: `https://wfzcuaessqrdzoczjbrz.supabase.co`

## 🔐 Full Linking (Requires Access Token)

For full functionality (database pulls, migrations sync, etc.), you'll need to authenticate with Supabase CLI:

### Option 1: Interactive Login (Recommended)
```bash
cd /root/apps/authority-app
supabase login
```
This will open a browser for authentication.

### Option 2: Use Access Token
If you have a Supabase access token:

```bash
export SUPABASE_ACCESS_TOKEN=your_access_token_here
cd /root/apps/authority-app
supabase link --project-ref wfzcuaessqrdzoczjbrz --password MOODMNKY1088
```

### Getting Your Access Token

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to Account Settings → Access Tokens
3. Create a new access token (or use an existing one)
4. Copy the token and use it as shown above

## 📋 Current Configuration

The project is configured with:
- **Local Development**: Running on `http://127.0.0.1:54321`
- **Production Project**: `wfzcuaessqrdzoczjbrz`
- **Database Password**: Configured (from .env.master)

## 🔄 Useful Commands After Linking

Once fully linked, you can:

```bash
# Pull remote database schema
supabase db pull

# Push local migrations to production
supabase db push

# Generate TypeScript types from production schema
supabase gen types typescript --linked > types/supabase.ts

# View linked project info
supabase projects list
```

## ⚠️ Important Notes

1. **Local vs Production**: The local instance runs independently. Linking allows you to sync schema and migrations.
2. **Migrations**: Always test migrations locally before pushing to production.
3. **Environment Variables**: Local development uses `.env.local`, production uses your deployment environment.

## 🚀 Next Steps

1. Complete the link by running `supabase login` or setting `SUPABASE_ACCESS_TOKEN`
2. Pull production schema: `supabase db pull` (optional, to sync local with production)
3. Continue local development with the linked project reference
