@echo off
title TicketFlow Flash Sale - Starting Both Services...
color 0A

echo ======================================================================
echo           TicketFlow Flash Sale Platform - Launcher
echo           Starting Backend (Spring Boot) and Frontend (Vite)
echo ======================================================================
echo.

cd /d "E:\hack"

:: Locate Java 21
set "JAVA_EXE=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot\bin\java.exe"
if not exist "%JAVA_EXE%" (
    set "JAVA_EXE=java"
)

echo [1/3] Starting Spring Boot Backend on http://localhost:8080 ...
start "TicketFlow Backend (Port 8080)" /min cmd /c "cd /d E:\hack && "%JAVA_EXE%" -Dspring.profiles.active=standalone -jar target\flash-sale-backend-1.0.0-SNAPSHOT.jar"

echo [2/3] Waiting for Backend initialization (5 seconds)...
timeout /t 5 /nobreak >nul

echo [3/3] Starting Vite Frontend on http://localhost:3000 ...
start "TicketFlow Frontend (Port 3000)" cmd /c "cd /d E:\hack\frontend && npm.cmd run dev"

echo.
echo Waiting for frontend dev server to start (3 seconds)...
timeout /t 3 /nobreak >nul

:: Automatically open browser
start http://localhost:3000

echo.
echo ======================================================================
echo   SUCCESS! Both Frontend and Backend are running together!
echo ======================================================================
echo.
echo   - Frontend: http://localhost:3000
echo   - Login Page: http://localhost:3000/login
echo   - Backend APIs: http://localhost:8080/api/events
echo   - Swagger Docs: http://localhost:8080/swagger-ui.html
echo.
echo   Demo Login Credentials:
echo     Buyer: buyer1@ticketflow.com  / Password: Password123!
echo     Admin: admin@ticketflow.com   / Password: Password123!
echo.
echo   (Keep the separate Backend and Frontend command windows open!)
echo ======================================================================
echo.
pause
