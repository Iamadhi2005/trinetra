# TRINETRA Mobile App — Build, Installation & Deployment Guide

This guide details the complete build pipeline, dependencies, and installation steps for deploying the **TRINETRA Smart Hospital Security Console Android Application (v2.0)**.

---

## 1. System Requirements & Build Prerequisites

To compile the native Android APK from source, ensure the following toolchain components are present:

| Component | Minimum Version | Tested & Verified Version | Installation Source / Path |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.0.0` or higher | `v24.16.0` (npm 11.13.0) | `winget install OpenJS.NodeJS` |
| **Java Development Kit (JDK)** | OpenJDK 17 LTS | Microsoft OpenJDK 17 (`17.0.20.1`) | `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot` |
| **Android SDK Platform** | Android 14 (API 34) | API Level 34 (`platforms;android-34`) | `C:\Users\USER\AppData\Local\Android\Sdk` |
| **Android Build Tools** | `34.0.0` | `build-tools;34.0.0` | `C:\Users\USER\AppData\Local\Android\Sdk\build-tools` |
| **Gradle** | `8.0`+ | `Gradle 9.3.1` (via Gradle Wrapper) | Automated download via `gradlew.bat` |

---

## 2. Compilation & APK Build from Source

### Automated Build Pipeline
An automated build script is provided in the `mobile/` directory:

```powershell
cd c:\Users\USER\Documents\Iomt
.\mobile\build_apk.bat
```

### Manual CLI Build Steps
If building manually:

```powershell
# 1. Set environment variables
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$env:ANDROID_HOME = "C:\Users\USER\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "C:\Users\USER\AppData\Local\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

# 2. Enter Android native directory
cd c:\Users\USER\Documents\Iomt\mobile\android

# 3. Assemble Release APK
.\gradlew.bat assembleRelease --no-daemon
```

Upon completion, the signed, installable APK is located at:
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```
And copied to the workspace root as:
```
c:\Users\USER\Documents\Iomt\TRINETRA_Mobile_v2.0.apk
```

---

## 3. Installing the APK on an Android Device

### Method A: Sideload via Android Debug Bridge (ADB) — Recommended
1. Connect your Android phone to the PC via USB.
2. Enable **Developer Options** on your phone:
   - Go to **Settings** → **About Phone** → Tap **Build Number** 7 times.
   - Go to **Settings** → **System** → **Developer Options** → Toggle **USB Debugging** ON.
3. Install the APK directly:
   ```powershell
   adb install -r c:\Users\USER\Documents\Iomt\TRINETRA_Mobile_v2.0.apk
   ```

### Method B: Direct File Transfer or Hospital Download
1. Copy `TRINETRA_Mobile_v2.0.apk` to your phone's internal storage (via USB, Google Drive, or local HTTP server).
2. Open the **Files** app on the phone and tap `TRINETRA_Mobile_v2.0.apk`.
3. When prompted, toggle **Allow installation from this source** (or "Install Unknown Apps").
4. Tap **Install** and open the application.

---

## 4. Running the Development Server Locally (Expo Dev Mode)

For live code editing and instant Metro hot-reloading:

```powershell
# Launch backend gateway first
cd c:\Users\USER\Documents\Iomt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# In a separate terminal, launch mobile development server
cd c:\Users\USER\Documents\Iomt\mobile
npm start
```

- Press **`a`** to open in an Android Emulator.
- Scan the printed QR code using the **Expo Go** application on your physical Android phone.

---

## 5. Gateway Connection & Initial Sign-In

### Connecting to the TRINETRA Backend Gateway
1. Ensure your Android device is on the same Wi-Fi network as the computer running the backend.
2. Open the TRINETRA app.
3. Navigate to **Account / Settings** → **Gateway Endpoint Configuration**.
4. Enter your host IP address:
   - For physical devices on local Wi-Fi: `http://192.168.1.XX:8000` (replace with your machine's LAN IP).
   - For Android Emulator: `http://10.0.2.2:8000`.
   - For remote/cloud tunnels: `https://your-tunnel.loca.lt`.
5. Tap **SAVE GATEWAY URL** and **TEST PING** to verify sub-50ms latency.

### Logging In with Physician Credentials
Refer to the separate confidential deliverable `TRINETRA_Doctor_Login_Credentials.pdf` for the initial credentials:

- **Doctor Sarah Connor:**
  - Username: `dr.connor`
  - Assigned: Robert Smith (`patient_102`), Babu (`PAT-6665`)
- **Doctor Radhi:**
  - Username: `dr.radhi`
  - Assigned: Raju (`PAT-7850`), Anirudh (`PAT-3851`), John Doe (`patient_101`)
- **Patient Robert Smith:**
  - Username: `pt.smith`
  - Assigned: Bed-01 (`patient_102`)
- **SOC Techie Batman:**
  - Username: `tech.batman`
- **Hospital Administrator:**
  - Username: `admin` / Password: `admin123`

*Note: On first login, newly provisioned accounts are prompted to replace their temporary credentials before accessing patient telemetry.*
