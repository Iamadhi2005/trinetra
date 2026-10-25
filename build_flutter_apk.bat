@echo off
setlocal
echo ========================================================
echo  TRINETRA Flutter Mobile App - Android APK Build Pipeline
echo ========================================================
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "ANDROID_HOME=C:\Users\USER\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\USER\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0trinetra_flutter"

echo [*] Building Flutter Release APK with updated real-time alerting and reconnection...
call flutter build apk --release

if %ERRORLEVEL% EQU 0 (
    echo [OK] Flutter Release APK built successfully!
    copy /y "%~dp0trinetra_flutter\build\app\outputs\flutter-apk\app-release.apk" "%~dp0TRINETRA_Flutter_v3.3_Cloud_Alarms.apk"
    copy /y "%~dp0trinetra_flutter\build\app\outputs\flutter-apk\app-release.apk" "%~dp0TRINETRA_Flutter_v3.2_Cloud.apk"
    echo [OK] Updated APK in workspace root: TRINETRA_Flutter_v3.3_Cloud_Alarms.apk
) else (
    echo [!] Flutter build failed with exit code %ERRORLEVEL%
)

echo ========================================================
exit /b %ERRORLEVEL%
