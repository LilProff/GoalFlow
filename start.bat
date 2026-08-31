@echo off
title GoalFlow Dev
cd /d %~dp0

echo.
echo  =============================================
echo   GoalFlow - Starting Dev Environment
echo  =============================================
echo.

echo  [1/2] Starting Backend (FastAPI) on port 8010...
start "GoalFlow Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8010 --reload"

timeout /t 3 /nobreak > nul

echo  [2/2] Starting Frontend (Vite) on port 5173...
start "GoalFlow Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  Both servers starting in separate windows.
echo.
echo  Frontend : http://localhost:5173
echo  Backend  : http://localhost:8010
echo  API Docs : http://localhost:8010/docs
echo.