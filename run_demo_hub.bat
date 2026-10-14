@echo off
title TRINETRA Security Testbed (Port 3002)
echo ========================================================
echo Starting TRINETRA Security Testbed Console...
echo ========================================================
echo URL: http://localhost:3002
echo Purpose: IoMT Security Scenario & ML Evaluation Platform
echo Target Gateway: http://localhost:8000
echo ========================================================

:: Open browser automatically after a short delay
start /b "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3002"

if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat)
python demo_hub\server.py 3002
pause
