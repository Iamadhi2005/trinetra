# TRINETRA Mobile (Flutter Edition)

**TRINETRA — Next-Generation Intrusion Detection & Zero-Trust Defense System for the Internet of Medical Things (IoMT)**  
*Cross-Platform Production Mobile Console (Flutter 3.x / Dart 3.x)*

---

## 1. Overview & Architecture

The **TRINETRA Flutter Mobile Application** is a specialized clinical security dashboard built for ICU clinicians, nurses, and hospital SOC engineers. It connects directly with the TRINETRA AI-IDS Gateway to deliver real-time physiological telemetry, 50Hz Lead II ECG waveform rendering, and instant zero-latency intrusion alerts.

```
                      [ TRINETRA IoMT Gateway ]
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼ (HTTP REST API)                                 ▼ (WebSocket /ws/alerts)
   [ ApiService ]                                   [ WebSocketService ]
         │                                                 │
   ┌─────┴───────────────────────┬─────────────────────────┴─────┐
   ▼                             ▼                               ▼
[ AuthProvider ]         [ VitalsProvider ]              [ AlertsProvider ]
(JWT Session & Roles)   (50Hz ECG & Vitals)            (Instant Audio Siren)
   │                             │                               │
   └─────────────────────────────┼───────────────────────────────┘
                                 ▼
                     [ HomeNavScreen (UI Layer) ]
        ┌────────────────┬───────────────┬────────────────┐
        ▼                ▼               ▼                ▼
  [ MonitorTab ]   [ AlertsTab ]  [ ScenariosTab ]  [ SettingsTab ]
  (Waveform Canvas) (Deep Detail)  (Red-Team Inject) (Admin & Gateway)
```

---

## 2. Implemented Features

| Module | Features & Capabilities |
| :--- | :--- |
| **Authentication & Roles** | Multi-role login (**Doctor**, **Nurse**, **SOC Tech**, **Hospital Admin**, **Patient**), JWT session persistence, auto-device token registration, quick demo presets. |
| **Bedside Telemetry** | 50Hz PQRST Lead II ECG waveform rendering via `CustomPainter`, Photoplethysmography (PPG), vital signs (HR, SpO₂, BP, Respiration, Infusion rate). |
| **Data Integrity Verification** | Cryptographic authenticity indicator: `DATA INTEGRITY: VERIFIED` vs `UNTRUSTED • SENSOR SPOOFED`. |
| **Incident Terminal Console** | Monospace cybersecurity log viewer showing exploit payloads and zero-trust firewall mitigations. |
| **Zero-Trust Quarantine Queue**| Displays isolated IoMT nodes with hardware MAC address and quarantine rationale. |
| **Security & Clinical Alerts**| Filterable alarms (`ALL`, `CRITICAL`, `HIGH`, `WARNING`, `RESOLVED`), deep-dive inspection modal showing Layer 1 vs Layer 2 AI-IDS diagnostics, 1-tap resolution. |
| **Red-Team Attack Launcher** | 7 IoMT attack profiles across Layer 1 (Physiology) & Layer 2 (Network), live attack HUD, and emergency **Disengage All** restore switch. |
| **Audio Siren & In-App Banner**| High-priority slide-down alarm banner with urgent emergency beep playback upon attack detection. |
| **Gateway & Superadmin** | Dynamic URL switcher (Cloud Tunnel, Local Hospital Wi-Fi, Emulator), ping & latency tester, persistent Device UUID, doctor reassignment, and account management. |

---

## 3. Directory Structure

```
trinetra_flutter/
├── assets/
│   ├── images/
│   └── sounds/
│       └── beep_alert.wav
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── constants/
│   │   │   ├── api_endpoints.dart
│   │   │   ├── app_colors.dart
│   │   │   └── attack_scenarios.dart
│   │   ├── theme/
│   │   │   └── app_theme.dart
│   │   └── utils/
│   │       ├── formatters.dart
│   │       └── logger.dart
│   ├── data/
│   │   ├── models/
│   │   │   ├── alert_model.dart
│   │   │   ├── attack_state_model.dart
│   │   │   ├── device_model.dart
│   │   │   ├── log_entry_model.dart
│   │   │   ├── patient_model.dart
│   │   │   ├── quarantine_model.dart
│   │   │   └── user_model.dart
│   │   └── services/
│   │       ├── alarm_sound_service.dart
│   │       ├── api_service.dart
│   │       ├── auth_service.dart
│   │       ├── storage_service.dart
│   │       └── websocket_service.dart
│   ├── providers/
│   │   ├── alerts_provider.dart
│   │   ├── auth_provider.dart
│   │   ├── connection_provider.dart
│   │   ├── scenarios_provider.dart
│   │   └── vitals_provider.dart
│   └── ui/
│       ├── screens/
│       │   ├── alerts_screen.dart
│       │   ├── home_nav_screen.dart
│       │   ├── login_screen.dart
│       │   ├── monitor_screen.dart
│       │   ├── scenarios_screen.dart
│       │   └── settings_screen.dart
│       └── widgets/
│           ├── alert_card.dart
│           ├── alert_detail_modal.dart
│           ├── app_header.dart
│           ├── ecg_waveform_painter.dart
│           ├── in_app_banner.dart
│           ├── quarantine_queue_card.dart
│           ├── scenario_card.dart
│           ├── terminal_log_view.dart
│           └── vitals_card.dart
└── pubspec.yaml
```

---

## 4. How to Run & Build

### Prerequisites
1. **Flutter SDK** (Version 3.19+ / Dart 3.3+)
2. **Android SDK & JDK 17** (Already configured on system)

### Run in Development
```powershell
cd c:\Users\USER\Documents\Iomt\trinetra_flutter
flutter pub get
flutter run
```

### Build Production Signed Release APK
```powershell
cd c:\Users\USER\Documents\Iomt\trinetra_flutter
flutter build apk --release
```
The output APK will be generated at:
```
trinetra_flutter/build/app/outputs/flutter-apk/app-release.apk
```
