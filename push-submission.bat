@echo off
title Push Scalable Available Booking System Submission to GitHub
set "PATH=E:\hack1\hack\.tools\git\cmd;%PATH%"
cd /d "E:\hack1\FORGEX-AI"

echo ======================================================================
echo   FORGEX-AI HACKATHON: TEAM SPARCKLY CODERS
echo   PROJECT: SCALABLE AVAILABLE BOOKING SYSTEM
echo ======================================================================
echo Target Remote: https://github.com/DIVYADHARSHINI1906/FORGEX-AI.git
echo.
echo [1/2] Pushing branch 'main' to your fork...
git.exe push -u origin main

echo.
echo [2/2] Pushing branch 'Scalable-Available-Booking-System' to your fork...
git.exe push -u origin Scalable-Available-Booking-System

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ======================================================================
    echo   [SUCCESS] All branches pushed to your GitHub fork!
    echo ======================================================================
    echo.
    echo 1. Your Fork Repository:
    echo    https://github.com/DIVYADHARSHINI1906/FORGEX-AI
    echo.
    echo 2. Direct Pull Request Link:
    echo    https://github.com/kumar200608/FORGEX-AI/compare/main...DIVYADHARSHINI1906:FORGEX-AI:Scalable-Available-Booking-System?expand=1
    echo.
) else (
    echo.
    echo [ERROR] Push failed. Please check your GitHub credentials or Personal Access Token.
)

echo.
pause
