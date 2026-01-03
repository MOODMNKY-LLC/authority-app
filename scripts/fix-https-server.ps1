# Fix HTTPS Server Issues
# This script clears locks, stops conflicting processes, and prepares for HTTPS server startup

Write-Host "`n=== Fixing HTTPS Server Issues ===" -ForegroundColor Cyan

# 1. Stop all Node processes
Write-Host "`n1. Stopping all Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Stopped $($nodeProcesses.Count) Node process(es)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ✅ No Node processes running" -ForegroundColor Green
}

# 2. Clear Next.js lock files
Write-Host "`n2. Clearing Next.js lock files..." -ForegroundColor Yellow
$lockFiles = Get-ChildItem -Path .next -Recurse -Filter "lock" -ErrorAction SilentlyContinue
if ($lockFiles) {
    $lockFiles | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Removed $($lockFiles.Count) lock file(s)" -ForegroundColor Green
} else {
    Write-Host "   ✅ No lock files found" -ForegroundColor Green
}

# 3. Check port 3000
Write-Host "`n3. Checking port 3000..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($port3000) {
    Write-Host "   ⚠️  Port 3000 is still in use by PID: $($port3000.OwningProcess | Select-Object -Unique)" -ForegroundColor Yellow
    Write-Host "   Attempting to stop..." -ForegroundColor Yellow
    $port3000.OwningProcess | Select-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
    $port3000Check = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($port3000Check) {
        Write-Host "   ❌ Port still in use - you may need to manually stop the process" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Port 3000 is now available" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ Port 3000 is available" -ForegroundColor Green
}

# 4. Verify certificates
Write-Host "`n4. Verifying SSL certificates..." -ForegroundColor Yellow
if ((Test-Path certs\key.pem) -and (Test-Path certs\cert.pem)) {
    Write-Host "   ✅ Certificates exist" -ForegroundColor Green
} else {
    Write-Host "   ❌ Certificates missing!" -ForegroundColor Red
    Write-Host "   Run: mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost 127.0.0.1 10.3.0.94 ::1" -ForegroundColor Yellow
}

Write-Host "`n=== Ready to Start ===" -ForegroundColor Cyan
Write-Host "Run: pnpm dev:https" -ForegroundColor Green
Write-Host "Then access: https://localhost:3000" -ForegroundColor Green
Write-Host ""


