@echo off
echo ========================================================
echo  TRINETRA Cloud Tunnel Service
echo  Endpoint: https://rare-adults-drive.loca.lt
echo ========================================================
echo Connecting port 8000 to public cloud tunnel...
npx -y localtunnel --port 8000 --subdomain rare-adults-drive
pause
