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

:: 1. Start FastAPI Backend API
start cmd /k "echo Starting FastAPI Backend REST API... && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

:: 2. Start Next.js Hospital Frontend Dashboard
start cmd /k "echo Starting Next.js React Hospital Dashboard... && cd frontend && npm run dev -- -p 3000"

:: 3. Start Standalone Security Testbed Console (Port 3002)
start cmd /k "echo Starting TRINETRA Security Testbed (Port 3002)... && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python demo_hub\server.py 3002"

:: 4. Start AI & IDS Web Console
start cmd /k "echo Starting AI & IDS Web Console (Port 3001)... && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python ai_ids_web\server.py 3001"

:: 5. Start Expo Mobile Dev Server
start cmd /k "echo Starting Expo Mobile Dev Server (scan QR with Expo Go)... && cd mobile && npx expo start"

:: 6. Start Public Cloud Tunnel Service (for 4G/5G/Wi-Fi phone connection)
start cmd /k "echo Starting TRINETRA Cloud Tunnel (rare-adults-drive.loca.lt)... && npx -y localtunnel --port 8000 --subdomain rare-adults-drive"

echo ========================================================
echo TRINETRA Services have been launched in separate windows:
echo - Backend API Gateway:         http://localhost:8000
echo - Cloud Tunnel (4G/5G phone):  https://rare-adults-drive.loca.lt
echo - Hospital Web Dashboard:      http://localhost:3000
echo - Security Simulation Testbed: http://localhost:3002
echo - AI & IDS Web Console:        http://localhost:3001
echo - Expo Mobile (Metro):         http://localhost:8081  (scan QR in Expo Go)
echo ========================================================
echo.
echo ZERO-TRUST ARCHITECTURE NOTE:
echo   The Security Testbed (Port 3002) is decoupled from the
echo   Hospital Dashboard (Port 3000) to ensure external testbed
echo   isolation during live demonstrations and evaluation reviews.
echo.
echo PHONE CONNECTION TIP:
echo   1. Connect phone + PC to the SAME Wi-Fi network
echo   2. Run 'ipconfig' to find your PC's IPv4 address
echo   3. In the app Settings tab, set URL to: http://YOUR_IP:8000
echo ========================================================
pause
