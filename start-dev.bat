@echo off
echo Starting GoalFlow Frontend...
start "GoalFlow Frontend" cmd /k "cd /d %~dp0 && npm run dev -p 3010"

echo.
echo Starting GoalFlow Backend...
start "GoalFlow Backend" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

echo.
echo GoalFlow is starting!
echo Frontend: http://localhost:3010
echo Backend: http://localhost:8000
pause