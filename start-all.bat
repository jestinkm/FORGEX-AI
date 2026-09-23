@echo off
title TicketFlow Flash Sale - Launcher
color 0A

echo ======================================================================
echo           FairSeat High-Concurrency Flash Sale Platform - Launcher
echo           Starting Backend (Spring Boot) and Frontend (Vite)
echo ======================================================================
echo.

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
cd /d "%ROOT_DIR%"

echo [1/4] Checking and freeing ports 8080 and 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo Stopping existing process on port 8080 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Stopping existing process on port 3000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo.
echo [2/4] Starting FairSeat Backend on http://localhost:8080 ...
start "FairSeat Backend (Port 8080)" "%ROOT_DIR%\run-backend.bat"

echo.
echo [3/4] Waiting 6 seconds for backend initialization...
timeout /t 6 /nobreak >nul

echo.
echo [4/4] Starting FairSeat Frontend on http://localhost:3000 ...
start "FairSeat Frontend (Port 3000)" "%ROOT_DIR%\run-frontend.bat"

echo.
echo Waiting 4 seconds for frontend server...
timeout /t 4 /nobreak >nul

start http://localhost:3000

echo.
echo ======================================================================
echo   SUCCESS! Both Frontend and Backend are running together!
echo ======================================================================
echo.
echo   - Storefront:    http://localhost:3000
echo   - Seating Map:   http://localhost:3000/checkout/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
echo   - Gate Verify:   http://localhost:3000/verify-ticket
echo   - Admin Center:  http://localhost:3000/admin
echo   - Seating API:   http://localhost:8080/api/seating/layout/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
echo   - Ticket Verify: http://localhost:8080/api/tickets/verify/FS-10E4B848
echo   - Blockchain:    http://localhost:8080/api/blockchain/stats
echo.
echo   Demo Login Credentials:
echo     Buyer: buyer1@ticketflow.com  / Password: Password123!
echo     Admin: admin@ticketflow.com   / Password: Password123!
echo.
echo   (Both command windows are running. Keep them open!)
echo ======================================================================
echo.
pause
