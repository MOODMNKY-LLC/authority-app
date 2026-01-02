# Authority Authentication System

This document outlines the complete authentication system for Authority, built using Supabase Auth and styled with the new Supabase UI Library patterns.

## Overview

Authority uses a multi-layered authentication approach:
- **Supabase Auth** for user management and sessions
- **Email/Password authentication** for traditional sign-in
- **Notion OAuth** for seamless workspace integration
- **Splash screen** for first-time visitors
- **Middleware protection** for all routes

## Architecture

### Components

#### 1. Password Authentication (`components/auth/password-auth.tsx`)
- Built following Supabase UI Library patterns
- Unified login/signup in tabbed interface
- Email/password validation
- Loading states and error handling
- Email confirmation workflow

#### 2. Social Authentication (`components/auth/social-auth.tsx`)
- Notion OAuth integration
- Extensible for additional providers
- Error handling and loading states

#### 3. Splash Screen (`components/splash-screen.tsx`)
- Animated entrance for new users
- 3-second auto-redirect to login
- Gothic branding with smooth transitions

### Routes

#### Authentication Routes
- `/splash` - First-time visitor landing page
- `/auth/login` - Login page with password + Notion auth
- `/auth/signup` - Signup page with same options
- `/auth/callback` - OAuth callback handler

#### Protected Routes
- `/` - Main chat interface (requires auth)
- All other routes protected by middleware

### Middleware (`proxy.ts`)

The middleware handles:
- Session validation on every request
- Automatic redirects for unauthenticated users → `/splash`
- Automatic redirects for authenticated users on auth pages → `/`
- Public route exceptions for auth flows

**Public Routes:**
- `/auth/login`
- `/auth/signup`
- `/auth/callback`
- `/splash`
- Static assets (images, CSS, etc.)

## User Flow

### New User Registration
1. User visits app → middleware redirects to `/splash`
2. Splash screen animates → auto-redirects to `/auth/login`
3. User clicks "Sign Up" tab
4. User enters email/password
5. System sends confirmation email
6. User clicks email link → `/auth/callback` → main app

### Existing User Login
1. User visits `/auth/login`
2. User enters credentials
3. Successful auth → redirect to `/`
4. Session persisted in Supabase

### Notion OAuth Flow
1. User clicks "Sign in with Notion"
2. Redirects to Notion OAuth consent
3. User authorizes Authority
4. Notion redirects to `/auth/callback?code=...`
5. Callback exchanges code for session
6. User redirected to main app

## Supabase Configuration

### Required Settings

In your Supabase dashboard:

1. **Enable Email Auth**
   - Go to Authentication → Providers
   - Enable Email provider
   - Set email templates (confirmation, reset, etc.)

2. **Configure OAuth (Notion)**
   - Add Notion as OAuth provider
   - Add redirect URLs:
     - Development: `http://localhost:3000/auth/callback`
     - Production: `https://authority-app.moodmnky.com/auth/callback`

3. **Site URL**
   - Set to your production domain
   - Used for email confirmation links

### Environment Variables

Required in Vercel/deployment:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

For Notion OAuth (when enabled):
```bash
NOTION_OAUTH_CLIENT_ID=your_notion_client_id
NOTION_OAUTH_CLIENT_SECRET=your_notion_client_secret
```

## Security Features

### Row Level Security (RLS)
All database tables have RLS enabled, restricting access to:
- Users can only read/write their own data
- Chat messages tied to user sessions
- Projects, characters, worlds scoped to user_id

### Session Management
- HTTP-only cookies for session tokens
- Automatic token refresh via Supabase client
- Server-side session validation in middleware

### Password Requirements
- Minimum 8 characters (enforced by Supabase)
- Email confirmation required for new accounts
- Password reset flow via email

## Styling

The authentication system follows Authority's gothic aesthetic:
- Dark gradient backgrounds (gray-950 → purple-950)
- Purple/pink accent colors
- Backdrop blur effects for depth
- Smooth animations with Framer Motion
- Consistent with shadcn/ui design system

## Extending Authentication

### Adding New OAuth Providers

1. Enable provider in Supabase dashboard
2. Add button to `social-auth.tsx`:
```tsx
const handleProviderAuth = async (provider: string) => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as any,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
```

### Custom Email Templates

Customize in Supabase Dashboard → Authentication → Email Templates:
- Confirmation email
- Password reset
- Magic link
- Email change

## Testing

### Local Development
1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Should redirect to splash → login
4. Create test account
5. Check email for confirmation link

### Production Testing
1. Deploy to Vercel
2. Update Supabase redirect URLs
3. Test full OAuth flow
4. Verify session persistence

## Troubleshooting

### "User not confirmed" error
- Check email for confirmation link
- Resend confirmation via Supabase dashboard
- Verify email provider settings

### OAuth redirect fails
- Check redirect URLs in Supabase match exactly
- Ensure HTTPS in production
- Verify OAuth client credentials

### Session not persisting
- Clear browser cookies
- Check middleware configuration
- Verify Supabase client initialization

## Next Steps

Planned enhancements:
- Magic link authentication
- Multi-factor authentication (MFA)
- Social auth (GitHub, Google, Discord)
- Account settings page
- Profile management
- Team workspaces

---

**Last Updated:** January 2025
**Status:** Production Ready
