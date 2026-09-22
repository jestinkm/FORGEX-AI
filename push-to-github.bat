@echo off
set "PATH=%~dp0.tools\git\cmd;%PATH%"
cd /d "%~dp0"
echo =======================================================
echo Pushing TicketFlow to GitHub: DIVYADHARSHINI1906/dd
echo =======================================================
git.exe push -u origin main
echo.
pause
