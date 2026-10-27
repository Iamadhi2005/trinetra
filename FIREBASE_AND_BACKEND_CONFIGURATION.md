# TRINETRA IoMT — Firebase Cloud Messaging & Backend Configuration Guide

This technical guide specifies the architectural configuration for Firebase Cloud Messaging (FCM), Android Notification Channels, and the TRINETRA REST/WebSocket API Gateway to enable authenticated, account-isolated alert delivery across all device states.

---

## 1. Firebase Cloud Messaging (FCM) Setup

### 1.1 Project Provisioning in Firebase Console
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Create a project named `TRINETRA-Hospital-Security`.
3. Add an Android application with package name:
   ```
   com.trinetra.iomt
   ```
4. Download the generated `google-services.json` configuration file.
5. Place `google-services.json` into the Android application module:
   ```
   mobile/android/app/google-services.json
   ```

### 1.2 Android Notification Channel Configuration
In Android 8.0+ (API 26+) and Android 13+ (API 33+), push notifications require explicit Notification Channels with audio attributes and permissions:

| Channel ID | Channel Name | Importance | Sound / Vibration | Bypasses DND | Target Role |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `critical_medical_alerts` | Critical Medical Alerts | `HIGH` (Heads-up) | Urgent Staccato Siren (`alert_critical.wav`) | Configurable (Medical Staff Emergency) | Attending Doctors, Critical Care Nurses |
| `soc_technical_anomalies` | SOC Intrusion Flags | `HIGH` | Rapid Beep Tone (`alert_tech.wav`) | Standard | SOC Technical Team, Network Sec |
| `patient_care_updates` | Patient Bedside Updates | `DEFAULT` | Soft Chime Tone (`chime_soft.wav`) | No | Inpatients, Caregivers |
| `admin_audit_channel` | System & Device Audits | `LOW` | Silent / System Default | No | Hospital Superadmin |

### 1.3 Firebase Admin SDK Backend Setup
The TRINETRA backend dispatches account-targeted push notifications via the Firebase Admin Python SDK.

1. In the Firebase Console, go to **Project Settings** → **Service Accounts**.
2. Click **Generate New Private Key** and save the JSON file as:
   ```
   backend/config/firebase_service_account.json
   ```
3. Set the environment variable in your `.env` or system environment:
   ```powershell
   [Environment]::SetEnvironmentVariable("FIREBASE_CREDENTIALS_PATH", "c:\Users\USER\Documents\Iomt\backend\config\firebase_service_account.json", "User")
   ```

### 1.4 Notification Routing Payload Schema
TRINETRA dispatches **Data-only payloads** to Android devices so the application can enforce client-side privacy controls (redacting patient identity and raw physiological measurements from lock-screen previews until user biometric or PIN authentication):

```json
{
  "to": "<REGISTERED_FCM_DEVICE_TOKEN>",
  "priority": "high",
  "data": {
    "alert_id": 104,
    "target_role": "Doctor",
    "patient_id": "patient_102",
    "patient_name_masked": "R****** S****",
    "device_id": "icu_monitor_patient_102",
    "attack_type": "ECG Waveform Spoofing",
    "severity": "Critical",
    "timestamp": "2026-10-17T18:45:00Z",
    "sound_channel": "critical_medical_alerts",
    "integrity_status": "Untrusted - Sensor Spoofed"
  }
}
```

---

## 2. Backend Security & Interface Configuration

### 2.1 Cryptographic Parameters
All passwords in TRINETRA are hashed on the backend using SHA-256 with a unique cryptographic pepper salt. Plaintext passwords are never stored in the database or written to execution logs:

```python
# backend/auth.py
PASSWORD_SALT = "trinetra_salt_2026"
SECRET_KEY = "trinetra_enterprise_jwt_secret_key_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 Hours
```

### 2.2 Device Token Lifecycle
1. **Device Registration (`POST /api/notifications/register-device`):**
   - Called immediately upon successful user login.
   - Binds the authenticated user ID to the physical device UUID and FCM push token.
   - Activates delivery routing for alerts matching that user's role and assigned patients.

2. **Device Revocation (`POST /api/notifications/unregister-device`):**
   - Called upon logout or session timeout.
   - Sets `is_active = False` in the database.
   - Prevents stale notifications from being dispatched to devices after user sign-out.

3. **Administrator Device Management (`/api/admin/devices`):**
   - Allows administrators to view all active registered mobile devices.
   - Supports one-click remote authorization revocation for lost or decommissioned phones.

---

## 3. Account-Specific Notification Isolation Matrix

| Account / Role | Assigned Scope | Authorized Alert Feed | Quarantine / Mitigation Access |
| :--- | :--- | :--- | :--- |
| **Dr. Sarah Connor (`dr.connor`)** | Robert Smith (`patient_102`), Babu (`PAT-6665`) | Only alerts for Robert Smith & Babu. Doctor Connor cannot view Dr. Radhi's patient telemetry. | Clinical quarantine advisory; one-click sensor recalibration request. |
| **Dr. Radhi (`dr.radhi`)** | Raju (`PAT-7850`), Anirudh (`PAT-3851`), John Doe (`patient_101`) | Only alerts for Raju, Anirudh, and John Doe. Isolated from Dr. Connor's patient data. | Clinical safety review; attending override authorization. |
| **Dr. Rocky (`dr.rocky`)** | Bhhd (`PAT-6529`) | Only emergency ward trauma alerts for Bhhd. | Trauma bay device status. |
| **Dr. Arjun (`dr.arjun`)** | Jeeva (`PAT-4008`) | Only cardiothoracic telemetry for Jeeva. | Cardiothoracic monitoring audit. |
| **Patient Smith (`pt.smith`)** | Self (`patient_102`) | Only simplified bedside calibration alerts for patient 102. Zero technical exploit code exposed. | Reassurance notice; nurse call button link. |
| **SOC Tech (`tech.batman`)** | Hospital-wide IoMT devices | Attack vectors, MQTT traffic metrics, packet rates, IDS classification, signature matches. | Full IPS quarantine actions; firewall rule toggling. |
| **SOC Admin (`admin`)** | Entire Hospital Infrastructure | Executive KPI metrics, fleet-wide alert digest, audit logs. | Account provisioning, doctor assignment, password resets, device token revocation. |

---

## 4. Operational Limitations & Android OS Considerations

In compliance with Android OS battery optimization and Doze mode policies:

1. **Power Off:** Push notifications cannot be delivered while a device is powered off or battery-depleted. Once powered on, Android fetches pending FCM high-priority messages.
2. **Do Not Disturb (DND):** Audible alerting in DND mode requires granting **Do Not Disturb Access** in Android Settings for the TRINETRA app (typically enabled on hospital-issued clinical devices).
3. **Battery Optimization / Doze Mode:** The app uses FCM `priority: "high"` and requests battery optimization exemption (`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`) so alerts wake the device CPU immediately.
4. **Offline / Out-of-Coverage:** When offline, the backend marks delivery attempts as `Pending/Failed` in `notification_logs`. Upon reconnecting, the app synchronizes missing alerts via `GET /api/notifications/my-alerts`.
