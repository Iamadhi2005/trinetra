@echo off
title TRINETRA Security Testbed - Scenario Runner
set GATEWAY_URL=https://trinetra-ya1h.onrender.com

:menu
cls
echo ========================================================
echo         TRINETRA SECURITY TESTBED - SCENARIO RUNNER
echo ========================================================
echo Target Gateway : %GATEWAY_URL%
echo Target Unit    : patient_102 (Robert Smith)
echo.
echo Select a security test scenario to run:
echo   [1] Pacemaker ^& Infusion Override (Layer 1 Medical)
echo   [2] Battery Depletion Test        (Layer 1 Power)
echo   [3] Sensor Detachment Fault       (Layer 1 Sensor)
echo   [4] Volumetric Packet Flood       (Layer 2 Network)
echo   [5] Telemetry Spoofing / MitM     (Layer 2 Integrity)
echo   [6] Temporal Replay Test          (Layer 2 Replay)
echo   [7] Gateway Auth Rate-Limit Test  (Layer 2 Auth)
echo.
echo   [t] Switch Gateway (Cloud ^<--^> Localhost:8000)
echo   [w] Open Web Testbed Console (http://localhost:3002)
echo   [0] Reset System to Baseline (Normal)
echo   [s] Check Current Simulation Status
echo   [q] Quit
echo ========================================================
set /p choice="Enter your choice (1-7, t, w, 0, s, q): "

if "%choice%"=="1" goto attack1
if "%choice%"=="2" goto attack2
if "%choice%"=="3" goto attack3
if "%choice%"=="4" goto attack4
if "%choice%"=="5" goto attack5
if "%choice%"=="6" goto attack6
if "%choice%"=="7" goto attack7
if /i "%choice%"=="t" goto toggle_gateway
if /i "%choice%"=="w" goto open_web
if "%choice%"=="0" goto disengage
if /i "%choice%"=="s" goto status
if /i "%choice%"=="q" exit /b
goto menu

:toggle_gateway
if "%GATEWAY_URL%"=="https://trinetra-ya1h.onrender.com" (
    set GATEWAY_URL=http://localhost:8000
) else (
    set GATEWAY_URL=https://trinetra-ya1h.onrender.com
)
echo.
echo Target Gateway switched to: %GATEWAY_URL%
timeout /t 1 >nul
goto menu

:open_web
echo.
echo Opening Standalone Web Demo Hub...
start http://localhost:3002
pause
goto menu

:attack1
echo.
echo Launching [1] Pacemaker ^& Infusion Override on %GATEWAY_URL%...
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/attack' -Method POST -ContentType 'application/json' -Body (@{attack_mode='Override'; target_patient='patient_102'} | ConvertTo-Json) | Format-List message"
echo.
pause
goto menu

:attack2
echo.
echo Launching [2] Battery Depletion Exploit on %GATEWAY_URL%...
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/attack' -Method POST -ContentType 'application/json' -Body (@{attack_mode='Drain'; target_patient='patient_102'} | ConvertTo-Json) | Format-List message"
echo.
pause
goto menu

:attack3
echo.
echo Launching [3] Sensor Detachment Fault on %GATEWAY_URL%...
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/attack' -Method POST -ContentType 'application/json' -Body (@{attack_mode='Fault'; target_patient='patient_102'} | ConvertTo-Json) | Format-List message"
echo.
pause
goto menu

:attack4
echo.
echo Launching [4] DoS Volumetric Packet Flood on %GATEWAY_URL%...
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/attack' -Method POST -ContentType 'application/json' -Body (@{attack_mode='DoS'; target_patient='patient_102'} | ConvertTo-Json) | Format-List message"
echo.
pause
goto menu

:attack5
echo.
echo Launching [5] Telemetry Spoofing / MitM on %GATEWAY_URL%...
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/attack' -Method POST -ContentType 'application/json' -Body (@{attack_mode='MitM'; target_patient='patient_102'} | ConvertTo-Json) | Format-List message"
echo.
pause
goto menu

:attack6
echo.
echo Launching [6] Replay / Stale Data Injection on %GATEWAY_URL%...
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/attack' -Method POST -ContentType 'application/json' -Body (@{attack_mode='Replay'; target_patient='patient_102'} | ConvertTo-Json) | Format-List message"
echo.
pause
goto menu

:attack7
echo.
echo Launching [7] Brute-Force Auth Attack on %GATEWAY_URL%...
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/attack' -Method POST -ContentType 'application/json' -Body (@{attack_mode='BruteForce'; target_patient='patient_102'} | ConvertTo-Json) | Format-List message"
echo.
pause
goto menu

:disengage
echo.
echo Disengaging all attacks on %GATEWAY_URL%...
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/disengage' -Method POST -ContentType 'application/json' -Body '{}' | Format-List message"
echo.
pause
goto menu

:status
echo.
echo Current Attack Status on %GATEWAY_URL%:
powershell -Command "Invoke-RestMethod -Uri '%GATEWAY_URL%/api/security/attack' | Format-List attack_mode, target_patient"
echo.
pause
goto menu
