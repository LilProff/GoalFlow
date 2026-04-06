@echo off
title GoalFlow Dev
cd /d %~dp0

echo.
echo  =============================================
echo   GoalFlow - Starting Dev Environment
echo  =============================================
echo.

echo  [1/2] Starting Backend (FastAPI) on port 8000...
start "GoalFlow Backend" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --reload --port 8000"

echo  Waiting for backend...
timeout /t 3 /nobreak > nul

echo  [2/2] Starting Frontend (Vite) on port 3000...
start "GoalFlow Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo  Both servers starting in separate windows.
echo.
echo  Frontend : http://localhost:3000
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/docs
echo.
pause
