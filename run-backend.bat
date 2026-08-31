@echo off
echo Starting GoalFlow Backend (with hot reload)...
cd /d %~dp0backend
python -m uvicorn main:app --host 127.0.0.1 --port 8010 --reload