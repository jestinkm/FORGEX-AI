Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          TicketFlow Flash Sale Platform - Launcher" -ForegroundColor Cyan
Write-Host "          Starting Backend (Spring Boot) and Frontend (Vite)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

Set-Location "E:\hack"

$javaExe = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot\bin\java.exe"
if (-not (Test-Path $javaExe)) {
    $javaExe = "java"
}

Write-Host "`n[1/3] Starting Spring Boot Backend on http://localhost:8080 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d E:\hack && `"$javaExe`" -Dspring.profiles.active=standalone -jar target\flash-sale-backend-1.0.0-SNAPSHOT.jar"

Write-Host "[2/3] Waiting 5 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "[3/3] Starting Vite Frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d E:\hack\frontend && npm.cmd run dev"

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Both Frontend and Backend are running together!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  - Login Page: http://localhost:3000/login" -ForegroundColor White
Write-Host "  - Backend APIs: http://localhost:8080/api/events" -ForegroundColor White
Write-Host "  - Demo Buyer: buyer1@ticketflow.com / Password123!" -ForegroundColor White
Write-Host "  - Demo Admin: admin@ticketflow.com / Password123!" -ForegroundColor White
Write-Host "======================================================================`n" -ForegroundColor Green
