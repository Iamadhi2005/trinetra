@echo off
echo ========================================================
echo Starting TRINETRA Mobile Controller App (Expo)...
echo ========================================================
cd /d "%~dp0\mobile"
echo Starting Expo Dev Server...
echo - Scan the QR code using Expo Go app on your physical phone
echo - Press 'a' for Android Emulator
echo - Press 'w' for Web Preview
echo ========================================================
npm start
pause
