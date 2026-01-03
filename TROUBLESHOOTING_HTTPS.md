# Troubleshooting HTTPS Dev Server

## Problem: Can't Access App in Browser

### Common Issues

#### 1. Port Already in Use
**Symptoms**: Server fails to start or you see "EADDRINUSE" error

**Solution**:
```powershell
# Check what's using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess

# Kill the process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force

# Or use a different port
$env:PORT=3001; pnpm dev:https
```

#### 2. Browser Security Warning
**Symptoms**: Browser blocks connection or shows "Not Secure" warning

**Solution**:
- Click "Advanced" or "Show Details"
- Click "Proceed to localhost" or "Accept the Risk"
- This is normal for self-signed certificates in development

#### 3. Wrong URL
**Symptoms**: Connection refused or can't connect

**Try these URLs**:
- `https://localhost:3000` (most common)
- `https://127.0.0.1:3000`
- `https://10.3.0.94:3000` (if on network)

**Don't use**:
- `http://localhost:3000` (HTTP won't work with HTTPS server)
- `localhost:3000` (missing protocol)

#### 4. Certificates Missing
**Symptoms**: Server crashes on startup with "ENOENT" error

**Solution**:
```powershell
# Check if certificates exist
Test-Path certs\key.pem
Test-Path certs\cert.pem

# If missing, generate them (requires mkcert)
# Install mkcert: https://github.com/FiloSottile/mkcert
mkcert -install
mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 10.3.0.94 ::1
```

#### 5. Firewall Blocking
**Symptoms**: Can't access from network IP (10.3.0.94)

**Solution**:
- Windows Firewall may be blocking Node.js
- Allow Node.js through firewall when prompted
- Or disable firewall temporarily for testing

### Quick Fix Steps

1. **Stop all Node processes**:
   ```powershell
   Get-Process -Name node | Stop-Process -Force
   ```

2. **Verify certificates exist**:
   ```powershell
   Test-Path certs\key.pem
   Test-Path certs\cert.pem
   ```

3. **Start server**:
   ```powershell
   pnpm dev:https
   ```

4. **Check server output**:
   - Should see: `✅ HTTPS Server Started Successfully!`
   - Should list available URLs

5. **Access in browser**:
   - Go to: `https://localhost:3000`
   - Accept security warning if prompted

### Debugging

**Check if server is running**:
```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object State, OwningProcess
```

**Check server logs**:
- Look for error messages in terminal
- Check for certificate errors
- Check for port conflicts

**Test connection**:
```powershell
# PowerShell
Invoke-WebRequest -Uri https://localhost:3000 -SkipCertificateCheck

# Or use curl
curl -k https://localhost:3000
```

### Still Not Working?

1. Check Windows Firewall settings
2. Try a different browser
3. Clear browser cache
4. Check if antivirus is blocking Node.js
5. Try accessing from `127.0.0.1` instead of `localhost`
6. Check if proxy settings are interfering


