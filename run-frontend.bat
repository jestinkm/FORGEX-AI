@echo off
title TicketFlow Frontend Server (Port 3000)
color 0D
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
cd /d "%ROOT_DIR%\frontend"

echo ======================================================================
echo      TicketFlow Frontend Dev Server (Port 3000)
echo ======================================================================
echo Starting Vite React Dev Server...
echo.
call npm.cmd run dev
echo.
echo Frontend server stopped.
pause
