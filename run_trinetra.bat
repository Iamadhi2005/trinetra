@echo off
echo ========================================================
echo Starting TRINETRA Enterprise Cybersecurity System...
echo ========================================================

:: Allow Expo Metro bundler through Windows Firewall (port 8081)
netsh advfirewall firewall show rule name="Expo Metro 8081" >nul 2>&1
if %errorlevel% neq 0 (
    echo Opening port 8081 for Expo Metro bundler...
    netsh advfirewall firewall add rule name="Expo Metro 8081" dir=in action=allow protocol=TCP localport=8081 profile=private,domain >nul 2>&1
)

:: Start FastAPI Backend API
start cmd /k "echo Starting FastAPI Backend REST API... && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

:: Start Next.js Frontend
start cmd /k "echo Starting Next.js React Frontend Dashboard... && cd frontend && npm run dev -- -p 3000"

:: Start Expo Mobile Dev Server
start cmd /k "echo Starting Expo Mobile Dev Server (scan QR with Expo Go)... && cd mobile && npx expo start"

echo TRINETRA Services have been launched in separate windows:
echo - Backend API Gateway:   http://localhost:8000
echo - Frontend Dashboard:    http://localhost:3000
echo - Expo Mobile (Metro):   http://localhost:8081  ^(scan QR in Expo Go^)
echo ========================================================
echo.
echo PHONE CONNECTION TIP:
echo   1. Connect phone + PC to the SAME Wi-Fi network
echo   2. Run 'ipconfig' to find your PC's IPv4 address
echo   3. In the app Settings tab, set URL to: http://YOUR_IP:8000
echo ========================================================
pause
