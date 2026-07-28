@echo off
echo ========================================================
echo Starting TRINETRA Enterprise Cybersecurity System...
echo ========================================================

:: Start FastAPI Backend API
start cmd /k "echo Starting FastAPI Backend REST API... && python -m uvicorn backend.main:app --port 8000 --reload"

:: Start Next.js Frontend
start cmd /k "echo Starting Next.js React Frontend Dashboard... && cd frontend && npm run dev -- -p 3000"

echo TRINETRA Services have been launched in separate windows:
echo - Backend API Gateway: http://localhost:8000
echo - Frontend Dashboard:   http://localhost:3000
echo ========================================================
pause
