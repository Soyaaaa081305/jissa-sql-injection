@echo off
title JISSA - SQL Injection Lab (SIMULATED Blackboard)
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is required but was not found.
  echo   Install it from https://nodejs.org  then run this file again.
  echo.
  pause
  exit /b 1
)

echo   Starting the JISSA SQL Injection Lab ...
echo   Browser will open automatically at http://127.0.0.1:8080
echo.

node server.js

echo.
echo   Server stopped.
pause
