@echo off
setlocal

echo ========================================
echo Starting GoalFlow Servers
echo ========================================

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

echo.
echo [1/2] Starting Backend on port 8010...
start "GoalFlow Backend" cmd /k "cd /d %SCRIPT_DIR%backend && python -m uvicorn main:app --host 127.0.0.1 --port 8010 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend on port 5173...
start "GoalFlow Frontend" cmd /k "cd /d %SCRIPT_DIR%frontend && npm run dev"

echo.
echo ========================================
echo Both servers should be starting up!
echo.
echo Backend API: http://localhost:8010
echo Frontend:    http://localhost:5173
echo.
echo Docs:       http://localhost:8010/docs
echo ========================================

endlocal
pause