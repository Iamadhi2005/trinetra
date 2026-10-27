@echo off
setlocal
echo ========================================================
echo  TRINETRA Smart Hospital - Android APK Build Pipeline
echo ========================================================
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "ANDROID_HOME=C:\Users\USER\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\USER\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

cd /d "%~dp0\android"

echo [*] Checking Java version:
"%JAVA_HOME%\bin\java.exe" -version

echo [*] Starting Gradle APK build...
call gradlew.bat assembleRelease --no-daemon

if %ERRORLEVEL% EQU 0 (
    echo [OK] Release APK successfully built!
    goto copy_apk
) else (
    echo [!] assembleRelease returned code %ERRORLEVEL%. Attempting assembleDebug...
    call gradlew.bat assembleDebug --no-daemon
)

:copy_apk
if exist "%~dp0\android\app\build\outputs\apk\release\app-release.apk" (
    echo [OK] Found Release APK: %~dp0android\app\build\outputs\apk\release\app-release.apk
    copy /y "%~dp0\android\app\build\outputs\apk\release\app-release.apk" "%~dp0\..\TRINETRA_Mobile_v2.0.apk"
    echo [OK] Copied APK to root workspace: TRINETRA_Mobile_v2.0.apk
) else if exist "%~dp0\android\app\build\outputs\apk\debug\app-debug.apk" (
    echo [OK] Found Debug APK: %~dp0android\app\build\outputs\apk\debug\app-debug.apk
    copy /y "%~dp0\android\app\build\outputs\apk\debug\app-debug.apk" "%~dp0\..\TRINETRA_Mobile_v2.0.apk"
    echo [OK] Copied APK to root workspace: TRINETRA_Mobile_v2.0.apk
)

echo [*] Applying v1 JAR and v2 Scheme Dual Signing for Physical Android Devices...
call "%ANDROID_HOME%\build-tools\34.0.0\apksigner.bat" sign --ks "%~dp0android\app\debug.keystore" --ks-pass pass:android --key-pass pass:android --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true "%~dp0\..\TRINETRA_Mobile_v2.0.apk"
echo [*] Verifying APK Signature Schemes:
call "%ANDROID_HOME%\build-tools\34.0.0\apksigner.bat" verify -v "%~dp0\..\TRINETRA_Mobile_v2.0.apk"

echo ========================================================
echo  Build Pipeline Complete
echo ========================================================
