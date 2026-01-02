# HTTPS Local Development Setup

This project uses HTTPS for local development to support OAuth providers like Notion that require secure connections.

## Prerequisites

- `mkcert` installed and CA installed in system trust store
- Certificates generated in `certs/` directory

## Setup Steps

### 1. Install mkcert (if not already installed)

```bash
# Download and install mkcert
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Install local CA
mkcert -install
```

### 2. Generate Certificates

```bash
cd /root/apps/authority-app
mkdir -p certs
cd certs
mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 10.3.0.94 ::1
```

This generates certificates valid for:
- `localhost`
- `127.0.0.1`
- `10.3.0.94` (network address)
- `::1` (IPv6 localhost)

### 3. Start Supabase with TLS

```bash
cd /root/apps/authority-app
supabase start
```

Supabase will automatically use the certificates configured in `supabase/config.toml`:
- `cert_path = "./certs/cert.pem"`
- `key_path = "./certs/key.pem"`

### 4. Start Next.js Dev Server with HTTPS

```bash
pnpm dev:https
```

This starts the Next.js dev server on:
- `https://localhost:3000`
- `https://10.3.0.94:3000` (network address)

## Configuration Files

### Supabase (`supabase/config.toml`)
- TLS enabled: `[api.tls] enabled = true`
- Certificate paths configured
- Redirect URLs updated to HTTPS

### Next.js (`server.js`)
- Custom HTTPS server using mkcert certificates
- Listens on `0.0.0.0:3000` to accept network connections

### Environment Variables (`.env.local`)
- All Supabase URLs updated to `https://localhost:54321`
- Site URLs updated to `https://localhost:3000`

## OAuth Flow

1. User clicks "Continue with Notion"
2. Redirects to: `https://localhost:54321/auth/v1/authorize?provider=notion&...`
3. Notion OAuth redirects back to: `https://localhost:54321/auth/v1/callback`
4. Supabase processes and redirects to: `https://localhost:3000/auth/callback` or `https://10.3.0.94:3000/auth/callback`
5. Next.js callback route exchanges code for session

## Troubleshooting

### Certificate Errors
- Ensure `mkcert -install` was run successfully
- Verify certificates exist in `certs/` directory
- Check certificate paths in `supabase/config.toml`

### Connection Refused
- Ensure Supabase is running: `supabase status`
- Check that ports 3000 and 54321 are not in use
- Verify firewall settings for network access

### OAuth Redirect Errors
- Ensure Notion OAuth app has redirect URI: `https://localhost:54321/auth/v1/callback`
- Check `additional_redirect_urls` in `supabase/config.toml` includes your URLs
- Verify HTTPS URLs in `.env.local`

## Notes

- Certificates expire on 2 April 2028 (regenerate before then)
- The `certs/` directory is gitignored (do not commit certificates)
- Both HTTP and HTTPS redirect URLs are allowed for flexibility during development
