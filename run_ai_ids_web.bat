@echo off
echo ========================================================
echo Starting TRINETRA AI & IDS Status Web Console...
echo ========================================================
echo URL: http://localhost:3001
echo ========================================================
if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat)
python ai_ids_web\server.py 3001
pause
