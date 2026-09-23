Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          TicketFlow Flash Sale Platform - Launcher" -ForegroundColor Cyan
Write-Host "          Starting Backend (Spring Boot) and Frontend (Vite)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $rootDir) { $rootDir = $PSScriptRoot }
if (-not $rootDir) { $rootDir = (Get-Location).Path }
Set-Location $rootDir

Write-Host "`n[1/4] Checking and freeing ports 8080 and 3000..." -ForegroundColor Yellow
$conn8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($conn8080) {
    $conn8080 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
$conn3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($conn3000) {
    $conn3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 1

Write-Host "[2/4] Starting Spring Boot Backend on http://localhost:8080 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$rootDir\run-backend.bat`""

Write-Host "[3/4] Waiting 6 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

Write-Host "[4/4] Starting Vite Frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$rootDir\run-frontend.bat`""

Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Both Frontend and Backend are running together!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  - Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "  - Login Page:   http://localhost:3000/login" -ForegroundColor White
Write-Host "  - Backend APIs: http://localhost:8080/api/events" -ForegroundColor White
Write-Host "  - Swagger Docs: http://localhost:8080/swagger-ui.html" -ForegroundColor White
Write-Host "  - Blockchain:   http://localhost:8080/api/blockchain/stats" -ForegroundColor White
Write-Host "  - Demo Buyer:   buyer1@ticketflow.com / Password123!" -ForegroundColor White
Write-Host "  - Demo Admin:   admin@ticketflow.com  / Password123!" -ForegroundColor White
Write-Host "======================================================================`n" -ForegroundColor Green
