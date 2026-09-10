@echo off
echo ========================================================
echo Starting TRINETRA Enterprise Cybersecurity System...
echo ========================================================

:: Start FastAPI Backend API
start cmd /k "echo Starting FastAPI Backend REST API... && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

:: Start Next.js Frontend
start cmd /k "echo Starting Next.js React Frontend Dashboard... && cd frontend && npm run dev -- -p 3000"

echo TRINETRA Services have been launched in separate windows:
echo - Backend API Gateway: http://localhost:8000
echo - Frontend Dashboard:   http://localhost:3000
echo - Mobile App Launcher:  run_mobile.bat (Expo Mobile App)
echo ========================================================
pause
