@echo off
title GoalFlow Dev

echo.
echo  =============================================
echo   GoalFlow - Starting Dev Environment
echo  =============================================
echo.

:: Start FastAPI backend in a new window
echo  [1/2] Starting Backend (FastAPI) on port 8000...
start "GoalFlow Backend" cmd /k "cd /d "%~dp0" && uvicorn backend.main:app --reload --port 8000"

:: Wait 2 seconds for backend to initialize
timeout /t 2 /nobreak > nul

:: Start Vite frontend in a new window
echo  [2/2] Starting Frontend (Vite) on port 3000...
start "GoalFlow Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo  Both servers are starting in separate windows.
echo.
echo  Frontend : http://localhost:3000
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/docs
echo.
echo  Press any key to close this launcher...
pause > nul
