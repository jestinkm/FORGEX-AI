@echo off
title TicketFlow Backend Server (Port 8080)
color 0B
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
cd /d "%ROOT_DIR%"

set "JAVA_EXE=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot\bin\java.exe"
if not exist "%JAVA_EXE%" set "JAVA_EXE=java"

echo ======================================================================
echo      TicketFlow Spring Boot Backend Server (Port 8080)
echo ======================================================================
echo Starting with standalone profile (H2 DB + Blockchain Ledger)...
echo.
"%JAVA_EXE%" -Dspring.profiles.active=standalone -jar target\flash-sale-backend-1.0.0-SNAPSHOT.jar
echo.
echo Backend server stopped.
pause
