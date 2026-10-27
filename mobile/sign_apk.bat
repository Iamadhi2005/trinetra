@echo off
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ANDROID_HOME=C:\Users\USER\AppData\Local\Android\Sdk"
set "BUILD_TOOLS=%ANDROID_HOME%\build-tools\34.0.0"
set "KEYSTORE=c:\Users\USER\Documents\Iomt\mobile\android\app\debug.keystore"
set "APK=c:\Users\USER\Documents\Iomt\TRINETRA_Mobile_v2.0.apk"

echo [*] Signing with jarsigner (v1 JAR signature)...
"%JAVA_HOME%\bin\jarsigner.exe" -keystore "%KEYSTORE%" -storepass android -keypass android -digestalg SHA-256 -sigalg SHA256withRSA "%APK%" androiddebugkey

echo [*] Signing with apksigner (v2 + v3 signatures)...
call "%BUILD_TOOLS%\apksigner.bat" sign --ks "%KEYSTORE%" --ks-pass pass:android --key-pass pass:android --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true "%APK%"

echo [*] Verifying signatures:
call "%BUILD_TOOLS%\apksigner.bat" verify -v "%APK%"
