<div align="center">

# 🛡️ TRINETRA IoMT
### Next-Generation Intrusion Detection & Zero-Trust Defense System for Internet of Medical Things

[![Python Version](https://img.shields.io/badge/Python-3.12-blue.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.3+-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![CIC-IoMT-2024](https://img.shields.io/badge/Dataset-CIC--IoMT--2024-red.svg)](https://www.unb.ca/cic/datasets/iomt-dataset-2024.html)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*An enterprise-grade, multi-tiered AI defense platform designed to protect life-critical healthcare infrastructure, smart ICUs, and connected medical devices against adversarial cyberattacks.*

[Live Web Dashboard](http://localhost:3000) • [Pure ML Attacker Hub](http://localhost:3000/attacker-pure-ml) • [API Documentation](http://localhost:8000/docs) • [Technical Whitepaper](PROJECT_DOCUMENTATION.md)

</div>

---

## 📋 Table of Contents
- [Executive Overview](#-executive-overview)
- [Why TRINETRA? The Healthcare Dilemma](#-why-trinetra-the-healthcare-dilemma)
- [Core Architectural Innovations](#-core-architectural-innovations)
  - [Dual-Tier Machine Learning Engine](#1-dual-tier-machine-learning-engine)
  - [Zero-Trust Autonomous IPS Quarantine](#2-zero-trust-autonomous-ips-quarantine)
  - [Dual Simulation Modes: Standard vs Pure ML](#3-dual-simulation-modes-standard-vs-pure-ml)
  - [High-Fidelity Real-Time Bedside Telemetry](#4-high-fidelity-real-time-bedside-telemetry)
- [System Architecture Diagram](#-system-architecture-diagram)
- [Repository Structure](#-repository-structure)
- [Machine Learning & Dataset Specifications](#-machine-learning--dataset-specifications)
- [Database & Storage Architecture](#-database--storage-architecture)
- [Quick Start & Installation](#-quick-start--installation)
- [Available Web Routes & Navigation](#-available-web-routes--navigation)
- [REST API & WebSocket Reference](#-rest-api--websocket-reference)
- [Academic & Viva Presentation FAQ](#-academic--viva-presentation-faq)
- [License](#-license)

---

## 🌟 Executive Overview

**TRINETRA** (Sanskrit for *"The Three-Eyed Guardian"*) is a comprehensive cyber-defense and clinical monitoring platform engineered specifically for **Internet of Medical Things (IoMT)** networks. 

Unlike conventional IT environments where cyberattacks compromise confidentiality or cause financial loss, attacks on IoMT directly threaten **human life**. Malicious actors can spoof heart rates, manipulate smart infusion pump dosages, inject DoS floods to blind doctors, or replay historical patient telemetry to mask fatal clinical events.

TRINETRA solves this through a **two-tier AI intrusion detection system (IDS)** coupled with an automated **Zero-Trust Intrusion Prevention System (IPS)** that detects, analyzes, and isolates threats in milliseconds without human delay.

---

## 🏥 Why TRINETRA? The Healthcare Dilemma

Modern hospitals deploy thousands of connected devices:
- **Infusion Pumps** delivering insulin, fentanyl, or norepinephrine
- **Multiparameter Bedside Monitors** streaming ECG, SpO2, and NIBP
- **Implantable Pacemakers & Ventilators**

### Key Vulnerabilities Addressed:
1. **Unencrypted Legacy Protocols**: Medical sensors frequently broadcast unencrypted MQTT, CoAP, or raw TCP telemetry.
2. **Vital Falsification (Data Poisoning)**: Attackers alter sensor packets so an ICU nurse sees normal vitals while a patient undergoes cardiac arrest.
3. **Denial of Service (DoS)**: High-rate traffic storms crash medical gateways, dropping life-critical alarms.
4. **Infusion Pump Overdose**: Malicious calibration commands override safety limits, delivering lethal dosages.
5. **Telemetry Replay**: Attackers record 30 seconds of healthy vitals and loop it during physical or digital tampering.

---

## 🔬 Core Architectural Innovations

### 1. Dual-Tier Machine Learning Engine

TRINETRA separates defense into two distinct, specialized AI layers:

```
                              Incoming IoMT Packet
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
   [ Layer 1: Vital Guard ]                       [ Layer 2: Network Guard ]
   Unsupervised Isolation Forest                  Supervised Random Forest
   Evaluates Physiological Health                 Evaluates Network Flow Telemetry
   (Heart Rate, SpO2, BP, Dose Rate)              (Rate, Duration, IAT, Size)
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
                        [ Zero-Trust Decision Engine ]
                        - Compute Anomaly & Risk Score
                        - Trigger Automated Quarantine
                        - Update SQLite DB & Audit Logs
                        - Broadcast to Web & Mobile UI
```

- **Layer 1 (Physiological Guard - Isolation Forest)**:
  - *Algorithm*: Unsupervised Isolation Forest (`model_l1.joblib`).
  - *Purpose*: Detects clinical anomalies and out-of-distribution biometric falsification independent of network packet headers.
  - *Monitored Parameters*: Heart Rate (bpm), Oxygen Saturation ($SpO_2\%$), Systolic/Diastolic BP ($mmHg$), Lead Impedance ($\Omega$), Infusion Flow Rate ($mL/h$).
  - *Output*: Anomaly Decision ($\pm 1$) and Continuous Anomaly Score ($[-0.5, 0.5]$).

- **Layer 2 (Cyber Network Classifier - Random Forest)**:
  - *Algorithm*: Supervised 50-tree Random Forest (`model_l2.joblib`).
  - *Trained On*: **CIC-IoMT-2024** benchmark dataset (100,000+ real network flows).
  - *Input Features*: Flow Duration ($ms$), Packet Rate ($pkts/sec$), Total Packet Size ($bytes$), Average Packet Size ($bytes$), Inter-Arrival Time / IAT ($ms$).
  - *Output*: Binary Classification (`0 = Benign`, `1 = Cyber Attack`) with Class Probabilities.

### 2. Zero-Trust Autonomous IPS Quarantine

When Layer 1 or Layer 2 detects an intrusion:
1. **Instant Node Isolation**: The malicious client ID or compromised device MAC is immediately quarantined in `backend/database.py`.
2. **Telemetry Blackholing**: Downstream routing to ICU monitors is cut off to prevent corrupt clinical decisions.
3. **Auditable Incident Logging**: Full forensic payloads, packet headers, and timestamped alerts are logged in `data/trinetra.db` and `data/audit_log.db`.
4. **WebSocket Broadcast**: Alarms push synchronously to ICU web monitors and nurse mobile stations in $<15ms$.

### 3. Dual Simulation Modes: Standard vs Pure ML

| Dimension | Standard Presentation Mode (`/attacker`) | Pure ML Mode (`/attacker-pure-ml`) |
| :--- | :--- | :--- |
| **Intended Use** | Demonstrations, academic walk-throughs | Unscripted red-team testing, ML research |
| **Detection Flow** | Pre-scripted scenario profiles + ML score | **100% Raw Scikit-Learn Inference** |
| **Synthetic Shortcuts** | Instant alert generation on trigger | **Zero Shortcuts**: Packet passes strictly into ML pipeline |
| **Threshold Overrides** | Gateway rate threshold guards | **None**: Strict mathematical decision boundary |
| **What-If Analysis** | Static scenario cards | **Interactive 5-parameter real-time sliders** |
| **Dashboard Link** | `/attacker` | `/attacker-pure-ml` |

### 4. High-Fidelity Real-Time Bedside Telemetry

- **Mathematical PQRST ECG Lead II Synthesis**: Generates continuous 50Hz electrocardiogram waveforms reproducing genuine cardiac depolarization (P-wave, QRS-complex, T-wave).
- **SpO2 Photoplethysmogram (PPG)**: Synthesizes arterial pulse pressure waves with realistic dicrotic notches.
- **Dynamic ICU Cards**: Main dashboard showcases live animated `MiniEcgStrip` for each admitted patient.

---

## 📐 System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              TRINETRA SYSTEM TOPOLOGY                             |
+-----------------------------------------------------------------------------------+

     +-----------------------+      +-----------------------+
     |   Simulated IoMT      |      |   Attacker Terminal   |
     |   Patients & Sensors  |      |   (/attacker-pure-ml) |
     +-----------+-----------+      +-----------+-----------+
                 |                              |
                 | (50Hz Vitals / MQTT)         | (Adversarial Packets)
                 +--------------+---------------+
                                |
                                v
               +----------------------------------+
               |     FastAPI Backend Gateway      |
               |     (backend/main.py:8000)       |
               +----------------+-----------------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
+------------------------+             +------------------------+
|   Layer 1: Isolation   |             |   Layer 2: Random      |
|   Forest (Physiology)  |             |   Forest (CIC-IoMT-24) |
+------------+-----------+             +------------+-----------+
             |                                     |
             +------------------+------------------+
                                |
                                v
               +----------------------------------+
               |   IPS Quarantine & Zero-Trust    |
               |   (Isolated in SQLite DB)        |
               +----------------+-----------------+
                                |
           +--------------------+--------------------+
           |                                         |
           v                                         v
+------------------------+              +------------------------+
|   Next.js 16 Dashboard |              |   React Native Mobile  |
|   (Port 3000 Web UI)   |              |   (Expo Mobile App)    |
+------------------------+              +------------------------+
```

---

## 📂 Repository Structure

```plaintext
TRINETRA/
├── backend/                        # FastAPI REST API & WebSocket Backend
│   ├── routes/                     # Modular API Route Controllers
│   │   ├── alert_routes.py         # Alert management & triage endpoints
│   │   ├── auth_routes.py          # JWT authentication & user login
│   │   ├── dashboard_routes.py     # High-level ICU KPIs & radar status
│   │   ├── device_routes.py        # IoMT device inventory & quarantine
│   │   ├── ips_routes.py           # Intrusion Prevention System rules
│   │   ├── log_routes.py           # System audit logs
│   │   ├── network_routes.py       # Gateway bandwidth & topology metrics
│   │   ├── patient_routes.py       # Patient vitals, profiles, and calibrations
│   │   ├── report_routes.py        # PDF & CSV security audit generator
│   │   ├── security_routes.py      # Threat status, Pure ML mode, diagnostics
│   │   └── settings_routes.py      # System configuration & threshold limits
│   ├── auth.py                     # Bcrypt hashing & JWT token validation
│   ├── database.py                 # SQLAlchemy engine & SQLite connection pool
│   ├── main.py                     # FastAPI application entry & WebSocket handler
│   ├── models.py                   # SQLAlchemy ORM schemas (Users, Patients, etc.)
│   ├── schemas.py                  # Pydantic data validation contracts
│   └── simulator_service.py        # Patient vitals synthesis & attack generator
├── data/                           # Data Persistence
│   ├── trinetra.db                 # Primary application SQLite database
│   ├── audit_log.db                # High-speed IDS audit event database
│   └── telemetry_*.json            # Patient telemetry time-series caches
├── frontend/                       # Next.js 16 Web Dashboard (React 19)
│   ├── src/
│   │   ├── app/                    # Next.js App Router Pages
│   │   │   ├── page.tsx            # Main ICU Dashboard with threat radar
│   │   │   ├── attacker/           # Standard Red-Team Demo Attacker Hub
│   │   │   ├── attacker-pure-ml/   # Pure ML Attacker Hub (Real Scikit-Learn Gauges)
│   │   │   ├── patients/[id]/      # Bedside Patient Monitor (Live 50Hz ECG & PPG)
│   │   │   ├── alerts/             # Security & Clinical Alarm Management
│   │   │   ├── ai-ids/             # AI Engine Performance Metrics & Confusion Matrix
│   │   │   ├── devices/            # IoMT Device Inventory & Quarantine Controls
│   │   │   ├── ips-control/        # IPS Firewall Rules & Automated Actions
│   │   │   ├── network/            # Topology & Network Flow Visualizer
│   │   │   ├── reports/            # Incident Reporting & Analytics
│   │   │   ├── security/           # Threat Posture & MITRE ATT&CK Matrix
│   │   │   ├── settings/           # System Settings & Thresholds
│   │   │   └── login/              # Secure Authentication Portal
│   │   ├── components/             # Reusable UI Components
│   │   │   ├── ecg/                # High-performance Canvas ECG & Plethysmograph
│   │   │   ├── layout/             # Sidebar, Header, and Navigation
│   │   │   └── ui/                 # Buttons, Cards, Modals, Sliders
│   │   └── lib/                    # API clients, auth helpers, socket utils
├── mobile/                         # React Native / Expo Mobile Application
│   ├── src/                        # Mobile screens (Monitor, Alerts, Scenarios)
│   ├── App.tsx                     # Main mobile navigation & dashboard
│   └── app.json                    # Expo configuration manifest
├── models/                         # Trained Machine Learning Models
│   ├── model_l1.joblib             # Layer 1: Isolation Forest (Physiological Guard)
│   └── model_l2.joblib             # Layer 2: Random Forest (CIC-IoMT-2024 Network)
├── ids_engine.py                   # Core ML Engine (Scikit-Learn inference pipeline)
├── patient_simulator.py            # Standalone physiological generator
├── train_on_ciciomt.py             # Model training script for CIC-IoMT-2024
├── extract_ciciomt.py              # Automated dataset extraction utility
├── run_trinetra.bat                # One-click startup script for backend + frontend
├── run_mobile.bat                  # One-click startup script for mobile app
└── PROJECT_DOCUMENTATION.md        # Exhaustive 360° Technical Whitepaper
```

---

## 🧠 Machine Learning & Dataset Specifications

### Dataset: CIC-IoMT-2024
The cyber-detection engine is trained on the state-of-the-art **CIC-IoMT-2024 (Canadian Institute for Cybersecurity Internet of Medical Things Dataset)**:
- **Environment**: Real hospital testbed comprising 40+ hardware and simulated IoMT devices (patient monitors, infusion pumps, blood pressure cuffs, smart beds).
- **Protocols**: WiFi, MQTT, Bluetooth Low Energy (BLE), and Zigbee.
- **Attacks Captured**: ARP Poisoning, Denial of Service (DoS UDP/TCP Floods), MQTT Broker Manipulation, Man-in-the-Middle (MitM), Reconnaissance Scans.

### Feature Mapping:
| Dataset Header | TRINETRA Feature Name | Meaning | Normal Range | Attack Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `Duration` | `duration` | Total duration of the network flow ($ms$) | $1.0 - 5.0$ | Prolonged or micro-bursts |
| `Rate` | `packet_rate` | Packet transmission frequency ($pkts/sec$) | $0.5 - 5.0$ | Spike to $>80-250$ |
| `Tot size` | `packet_size` | Cumulative bytes transmitted ($bytes$) | $120 - 500$ | Large flood or tiny fragments |
| `AVG` | `avg_packet_size` | Mean packet payload size ($bytes$) | $128 - 256$ | Irregular payload sizes |
| `IAT` | `iat` | Inter-arrival time between packets ($ms$) | $200 - 1000$ | Drops to $<5$ in floods |

---

## 💾 Database & Storage Architecture

TRINETRA uses lightweight, zero-configuration SQLite engines with zero-latency overhead:

1. **`data/trinetra.db`** (Application Database):
   - **`users`**: User accounts, credentials, and roles (`Admin`, `Doctor`, `Nurse`, `Operator`).
   - **`patients`**: Clinical profiles, ward/bed assignments, medical status (`Normal`, `Critical`, `Quarantine`).
   - **`devices`**: IoMT registry (MAC addresses, IP addresses, firmware versions, battery, quarantine states).
   - **`alerts`**: Real-time security and clinical incidents.
   - **`security_events`**: Detailed attack logs with client IP, attack type, and quarantine timestamp.
   - **`ips_rules`**: Automated IPS firewall triggers and sensitivity thresholds.

2. **`data/audit_log.db`** (Dedicated IDS Log):
   - Stores unthrottled forensic network packet streams and classification logs for post-incident compliance.

3. **`data/telemetry_<id>.json`**:
   - Cache of the last 100 physiological readings per patient for rapid UI restoration on page reload.

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Python 3.10 - 3.12**
- **Node.js 18+** & **npm**
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Iamadhi2005/trinetra.git
cd trinetra
```

### 2. Set Up Python Virtual Environment
```bash
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
pip install fastapi uvicorn sqlalchemy pydantic python-jose passlib bcrypt
```

### 3. Set Up Frontend
```bash
cd frontend
npm install
cd ..
```

### 4. Launch TRINETRA (One-Click)
Double-click **`run_trinetra.bat`** or run:
```cmd
run_trinetra.bat
```

Or start manually in two terminals:

**Terminal 1 (Backend API):**
```bash
.\.venv\Scripts\activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Next.js Frontend):**
```bash
cd frontend
npm run dev -- -p 3000
```

### 5. Access the Web Applications
- **ICU Main Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Pure ML Attacker Hub**: [http://localhost:3000/attacker-pure-ml](http://localhost:3000/attacker-pure-ml)
- **Demo Attacker Hub**: [http://localhost:3000/attacker](http://localhost:3000/attacker)
- **Patient Bedside Monitor**: [http://localhost:3000/patients/patient_101](http://localhost:3000/patients/patient_101)
- **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

**Default Login Credentials**:
- **Username**: `admin`
- **Password**: `admin123`

---

## 🌐 Available Web Routes & Navigation

| Route | Page Name | Description |
| :--- | :--- | :--- |
| `/` | **ICU Central Dashboard** | Hospital-wide overview, active patient cards with mini ECG strips, threat radar. |
| `/patients/[id]` | **Bedside Monitor** | Full 50Hz PQRST ECG Lead II waveform, SpO2 Plethysmograph, live vitals, calibration. |
| `/attacker-pure-ml` | **Pure ML Attacker Hub** | Real-time Scikit-Learn inference gauges, What-If slider playground, unscripted flow injection. |
| `/attacker` | **Red-Team Demo Hub** | Pre-scripted demonstration scenarios (DoS, Replay, Tampering, Spoofing). |
| `/ai-ids` | **AI IDS Analytics** | Confusion matrix, ROC-AUC curve, Layer 1 vs Layer 2 accuracy metrics. |
| `/alerts` | **Alert Center** | Real-time triage, severity filters (Critical, High, Medium), resolution logs. |
| `/devices` | **Device Fleet** | Medical equipment inventory, battery levels, zero-trust quarantine actions. |
| `/ips-control` | **IPS Control Panel** | Automated rule configuration, sensitivity thresholds, active firewall rules. |
| `/network` | **Network Topology** | IoMT gateway bandwidth, packet throughput, latency heatmaps. |
| `/security` | **Security Posture** | MITRE ATT&CK healthcare mapping, overall hospital posture score. |
| `/reports` | **Reports & Audits** | Automated PDF and CSV incident summaries for hospital compliance. |
| `/settings` | **System Settings** | Alert thresholds, WebSocket settings, database maintenance. |

---

## 🔌 REST API & WebSocket Reference

### Key REST Endpoints

#### Authentication & Core
- `POST /api/auth/login`: Issue JWT bearer token (`admin` / `admin123`).
- `GET /api/dashboard/stats`: Returns ICU statistics, threat radar, and device counts.

#### Patient Telemetry
- `GET /api/patients`: List all admitted patients.
- `GET /api/patients/{id}`: Detailed patient profile, baseline vitals, and bed assignment.
- `GET /api/patients/{id}/telemetry`: High-resolution historical physiological series.
- `POST /api/patients/{id}/calibrate`: Recalibrate sensors to normal baseline vitals.

#### Pure ML & Cybersecurity Diagnostics
- `GET /api/security/mode`: Check system mode (`"standard"` vs `"pure_ml"`).
- `POST /api/security/mode`: Toggle between Standard and Pure ML mode.
- `POST /api/security/pure-ml/attack`: Inject a raw adversarial flow evaluated strictly by Scikit-Learn models.
- `POST /api/security/pure-ml/evaluate`: "What-If" parameter evaluator returning instant Layer 1 and Layer 2 mathematical predictions without modifying system state.
- `GET /api/security/pure-ml/diagnostics`: Returns model memory health, scikit-learn versions, and feature weights.

#### WebSocket Stream
- `WS /ws`: Real-time bi-directional telemetry broadcast at 1Hz (patient vitals, device states, active attacks, and quarantine events).

---

## 🎓 Academic & Viva Presentation FAQ

**Q1: Is TRINETRA really powered by Machine Learning or just hardcoded if-else statements?**  
> **Answer**: TRINETRA uses real, serialized Scikit-Learn models (`models/model_l1.joblib` and `models/model_l2.joblib`). Layer 2 is trained directly on 100,000+ real network flow samples from the **CIC-IoMT-2024** research dataset. The new **Pure ML Attacker Hub** (`/attacker-pure-ml`) proves this by running pure mathematical inference (`predict()`, `predict_proba()`, `score_samples()`) with zero synthetic shortcuts.

**Q2: Why use a Two-Tier IDS instead of one single model?**  
> **Answer**: Network packet headers cannot detect when an attacker maliciously injects a lethal dose of insulin through legitimate protocol commands. Conversely, physiological vital analysis cannot detect a port scan or ARP spoofing attack before vitals are altered. Coupling **Layer 1 (Physiological Guard)** with **Layer 2 (Cyber Network Guard)** guarantees defense across both cyber and clinical planes.

**Q3: What happens when an attack is detected?**  
> **Answer**: The system enforces **Zero-Trust Autonomous IPS Quarantine**:
> 1. The compromised device is isolated in the SQLite database (`status = 'Quarantine'`).
> 2. The malicious IP is blocked in the IPS rule table.
> 3. Downstream clinical telemetry is terminated to prevent medical staff from acting on poisoned vitals.
> 4. An alert is instantly pushed via WebSockets to the web dashboard and mobile app.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ for the security and safety of digital healthcare and connected patients.
