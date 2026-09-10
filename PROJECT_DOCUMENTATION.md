# TRINETRA IoMT: Comprehensive Technical Whitepaper & System Documentation
**Project Title**: TRINETRA — Next-Generation Intrusion Detection and Zero-Trust Defense System for the Internet of Medical Things (IoMT)  
**System Version**: 2.4.0 (Enterprise Pure ML Edition)  
**Document Classification**: Full Technical Specification, Architecture Manual & Academic Reference  
**Last Updated**: September 2026  

---

## Table of Contents
1. [Executive Summary & Abstract](#1-executive-summary--abstract)
2. [Problem Statement & Threat Landscape in Healthcare](#2-problem-statement--threat-landscape-in-healthcare)
3. [System Architecture & Multi-Tiered Design](#3-system-architecture--multi-tiered-design)
4. [Machine Learning Engine & Mathematical Foundations](#4-machine-learning-engine--mathematical-foundations)
   - [4.1 Layer 1: Physiological Anomaly Detection (Isolation Forest)](#41-layer-1-physiological-anomaly-detection-isolation-forest)
   - [4.2 Layer 2: Network Intrusion Classification (Random Forest on CIC-IoMT-2024)](#42-layer-2-network-intrusion-classification-random-forest-on-cic-iomt-2024)
   - [4.3 Dual System Operating Modes (Standard vs Pure ML)](#43-dual-system-operating-modes-standard-vs-pure-ml)
5. [Autonomous Zero-Trust Quarantine & IPS Engine](#5-autonomous-zero-trust-quarantine--ips-engine)
6. [Real-Time Physiological Telemetry Synthesis](#6-real-time-physiological-telemetry-synthesis)
   - [6.1 50Hz PQRST ECG Lead II Mathematical Model](#61-50hz-pqrst-ecg-lead-ii-mathematical-model)
   - [6.2 SpO2 Photoplethysmograph (PPG) Synthesis](#62-spo2-photoplethysmograph-ppg-synthesis)
7. [Database Schema & Data Persistence Architecture](#7-database-schema--data-persistence-architecture)
8. [Backend REST API & WebSocket Protocol Reference](#8-backend-rest-api--websocket-protocol-reference)
9. [Frontend & Mobile Application Architecture](#9-frontend--mobile-application-architecture)
10. [Step-by-Step Installation & Deployment Guide](#10-step-by-step-installation--deployment-guide)
11. [Verification, Benchmarks & Unit Testing](#11-verification-benchmarks--unit-testing)
12. [Academic Viva & Project Defense Guide (Q&A)](#12-academic-viva--project-defense-guide-qa)

---

## 1. Executive Summary & Abstract

The proliferation of connected medical sensors, infusion pumps, vital sign monitors, and smart hospital beds—collectively termed the **Internet of Medical Things (IoMT)**—has dramatically improved clinical outcomes and patient monitoring fidelity. However, this hyper-connectivity introduces critical attack surfaces. Unlike traditional corporate IT where cyber threats jeopardize data confidentiality or financial assets, attacks targeting IoMT networks directly endanger **human life**. Compromised telemetry can lead to erroneous diagnoses, unadministered emergency interventions, or fatal drug overdoses triggered by malicious calibration overrides.

**TRINETRA** is an enterprise-grade, real-time intrusion detection and autonomous cyber-defense platform tailored specifically for critical healthcare environments. It implements:
1. A **Two-Tier Machine Learning IDS Engine**:
   - **Layer 1 (Physiological Guard)**: An unsupervised *Isolation Forest* model trained on multi-dimensional clinical telemetry (heart rate, blood oxygen saturation, blood pressure, lead impedance, and infusion delivery rate) to identify biometric falsification and clinical anomalies.
   - **Layer 2 (Cyber Network Guard)**: A supervised *Random Forest Classifier* trained on 100,000+ real network flow records from the benchmark **CIC-IoMT-2024** dataset (University of New Brunswick) to detect Denial of Service (DoS) floods, ARP spoofing, Man-in-the-Middle (MitM) exploits, and protocol manipulation.
2. An **Autonomous Zero-Trust Quarantine Engine**: When an intrusion is confirmed, the system immediately cuts off downstream routing to medical display units, quarantines the affected device node in SQLite storage, updates the firewall policy, and issues synchronous visual and audible alarms across Web and Mobile dashboards.
3. A **Dual-Mode Attacker Ecosystem**:
   - **Standard Presentation Hub** (`/attacker`): Pre-scripted red-team scenarios for demonstration and validation.
   - **Pure ML Attacker Hub** (`/attacker-pure-ml`): Real-time, unassisted Scikit-Learn mathematical inference featuring live probability gauges, Isolation Forest score meters, an interactive What-If slider simulator, and raw adversarial flow injection.
4. **Clinical-Grade Telemetry Synthesis**: Continuous 50Hz mathematical PQRST electrocardiogram (ECG Lead II) and SpO2 photoplethysmogram (PPG) waveform rendering without canvas lag or CPU throttling.

---

## 2. Problem Statement & Threat Landscape in Healthcare

Modern hospitals rely on interconnected medical devices that communicate via diverse communication protocols (WiFi, MQTT, Bluetooth Low Energy, Zigbee, Ethernet). Security vulnerabilities stem from several unique constraints in healthcare:

```
+-----------------------------------------------------------------------------------+
|                        IoMT CYBERSECURITY VULNERABILITY MATRIX                    |
+-----------------------------------------------------------------------------------+
| Vulnerability            | Attack Vector             | Patient Consequence        |
+--------------------------+---------------------------+----------------------------+
| Legacy Firmware          | Exploit known CVEs        | Device hijacking           |
| Unencrypted MQTT/CoAP    | Man-in-the-Middle (MitM)  | Telemetry falsification    |
| Weak Authentication      | Brute Force / Dictionary  | Unauthorized drug pump mod |
| High-Rate Flooding       | DoS / DDoS Floods         | Monitor blindness / crash  |
| Sensor Disconnection     | Physical/RF Jamming       | Undetected cardiac arrest  |
| Replay of Normal Vitals  | Telemetry Replay Attack   | Masked clinical decline    |
+-----------------------------------------------------------------------------------+
```

### Key Attack Scenarios Handled by TRINETRA:
1. **Denial of Service (DoS UDP/TCP Flood)**: High-frequency packet floods saturate the IoMT gateway, causing latency spikes and dropping critical alarms during ventricular tachycardia or cardiac arrest.
2. **Vital Sign Tampering (Data Poisoning)**: An attacker intercepts and modifies physiological values in transit, showing a stable 72 bpm while the patient is experiencing ventricular fibrillation.
3. **Smart Infusion Pump Overdose**: Malicious calibration injection raises morphine or heparin delivery rates to lethal thresholds.
4. **Telemetry Replay Attack**: An attacker captures 30 seconds of healthy patient vitals and continuously replays them, masking physical patient tampering or acute cardiac events.
5. **ARP Cache Poisoning / MitM**: An adversary redirects medical telemetry through an inspection proxy to inject stealthy perturbations into sensor readings.

---

## 3. System Architecture & Multi-Tiered Design

TRINETRA employs a decoupled, asynchronous micro-architecture comprising four key layers:

```
+-----------------------------------------------------------------------------------+
|                             TRINETRA SYSTEM ARCHITECTURE                          |
+-----------------------------------------------------------------------------------+

 [ PHYSICAL / SIMULATED IoMT DEVICES ]
    │  - Bedside ECG Monitor (MAC: 00:1B:44:11:3A:B7)
    │  - Smart Infusion Pump (MAC: 00:1B:44:11:3A:C8)
    │  - Pulse Oximeter      (MAC: 00:1B:44:11:3A:D9)
    │  - Smart ICU Bed       (MAC: 00:1B:44:11:3A:EA)
    │
    ▼ (MQTT / HTTP / WebSockets Telemetry Stream)
+-----------------------------------------------------------------------------------+
| GATEWAY & BACKEND CONTROLLER (FastAPI - Python 3.12 - Port 8000)                   |
|                                                                                   |
|  ┌───────────────────────────────┐     ┌───────────────────────────────────────┐  |
|  │ SQLite Database Pool          │     │ In-Memory Simulation Loop (1Hz / 50Hz)│  |
|  │ - data/trinetra.db            │     │ - Real-time PQRST Waveform Generator  │  |
|  │ - data/audit_log.db           │     │ - Patient State & Calibration Cache   │  |
|  └──────────────┬────────────────┘     └───────────────────┬───────────────────┘  |
|                 │                                          │                      |
|                 ▼                                          ▼                      |
|  ┌─────────────────────────────────────────────────────────────────────────────┐  |
|  │ DUAL-TIER MACHINE LEARNING IDS ENGINE (ids_engine.py)                       │  |
|  │                                                                             │  |
|  │   [ LAYER 1: PHYSIOLOGICAL GUARD ]       [ LAYER 2: CYBER NETWORK GUARD ]   │  |
|  │   - Model: models/model_l1.joblib        - Model: models/model_l2.joblib    │  |
|  │   - Algorithm: Isolation Forest          - Algorithm: Random Forest (50)    │  |
|  │   - Input: Vitals & Dosage Values        - Input: CIC-IoMT-2024 Flow Stats  │  |
|  │                                                                             │  |
|  │   [ DECISION AGGREGATOR & ZERO-TRUST POLICY CONTROLLER ]                    │  |
|  │   - Threat Probability Computation                                          │  |
|  │   - Automated IPS Quarantine Dispatcher                                     │  |
|  │   - Telemetry Blackholing & Clinical Alert Broadcast                        │  |
|  └──────────────────────────────────────┬──────────────────────────────────────┘  |
+-----------------------------------------┼-----------------------------------------+
                                          │
            ┌─────────────────────────────┴─────────────────────────────┐
            ▼                                                           ▼
+---------------------------------------+   +---------------------------------------+
| WEB DASHBOARD (Next.js 16 - Port 3000)|   | MOBILE APP (React Native / Expo)      |
| - ICU Central Station (page.tsx)      |   | - Bedside Vitals Alarm Monitor        |
| - Bedside Monitors (/patients/[id])   |   | - Nurse Incident Push Notification    |
| - Standard Attacker Hub (/attacker)   |   | - Scenario Launcher (ScenariosScreen) |
| - Pure ML Hub (/attacker-pure-ml)     |   | - Device Quarantine Status View       |
| - AI-IDS Matrix & Posture (/ai-ids)   |   |                                       |
+---------------------------------------+   +---------------------------------------+
```

---

## 4. Machine Learning Engine & Mathematical Foundations

### 4.1 Layer 1: Physiological Anomaly Detection (Isolation Forest)

Layer 1 operates on physiological telemetry to catch clinical deterioration and data tampering without needing labeled attack signatures.

#### Mathematical Principle
Isolation Forest isolates anomalies instead of profiling normal data points. Because anomalies are few and have attribute values distinct from normal points, they are isolated closer to the root of a random decision tree.

Given a dataset $X = \{x_1, \dots, x_n\}$ of $d$-dimensional points, an isolation tree (iTree) recursively partitions a random subset of data by randomly selecting an attribute $q$ and a split value $p$ between $\min(q)$ and $\max(q)$ until:
1. The tree reaches a height limit $h_{max} = \lceil \log_2(n) \rceil$,
2. $|X| \leq 1$, or
3. All data points have identical values.

The path length $h(x)$ of a point $x$ is the number of edges traversed from the root node to a terminating leaf node. The anomaly score $s(x, n)$ for an ensemble of $m$ trees is defined as:

$$s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}$$

Where $E(h(x))$ is the expected path length across all $m$ isolation trees, and $c(n)$ is the average path length of unsuccessful searches in a Binary Search Tree (BST):

$$c(n) = 2 \ln(n - 1) + 0.5772156649 \text{ (Euler-Mascheroni constant)} - \frac{2(n - 1)}{n}$$

- If $s(x, n) \to 1$: The instance is strongly anomalous (short path length).
- If $s(x, n) < 0.5$: The instance is confirmed normal (deep path length).

#### Layer 1 Features:
1. `heart_rate` ($\text{bpm}$): Monitored baseline $60 - 100\text{ bpm}$.
2. `spo2` ($\%$): Arterial oxygen saturation, baseline $95 - 100\%$.
3. `lead_impedance` ($\Omega$): Electrode contact resistance, baseline $450 - 550\,\Omega$.
4. `infusion_rate` ($\text{mL/h}$): Pump medication rate, baseline $4.0 - 6.0\text{ mL/h}$.

---

### 4.2 Layer 2: Network Intrusion Classification (Random Forest on CIC-IoMT-2024)

Layer 2 inspects packet metadata and network flows passing through the IoMT gateway.

#### Mathematical Principle
Random Forest builds an ensemble of $B$ bootstrap-aggregated (bagged) classification trees:
$$\hat{C}_{\text{rf}}^B(x) = \text{Majority Vote} \left\{ \hat{C}_b(x) \right\}_{1}^B$$

For each split in each tree $b \in \{1, \dots, B\}$, a random subset $m = \lfloor \sqrt{p} \rfloor$ of the total $p$ features is considered. At each node, the feature $j$ and split point $s$ are chosen to maximize the Gini Impurity reduction:

$$\Delta I(G) = I(G_{\text{parent}}) - \left( \frac{N_{\text{left}}}{N} I(G_{\text{left}}) + \frac{N_{\text{right}}}{N} I(G_{\text{right}}) \right)$$

Where Gini Impurity $I(G)$ for binary classes $k \in \{0, 1\}$ is:
$$I(G) = 1 - \sum_{k=0}^1 p_k^2$$

#### Training Dataset: CIC-IoMT-2024
The model is trained on extracted flows from the Canadian Institute for Cybersecurity IoMT testbed (`extract_ciciomt.py` and `train_on_ciciomt.py`).
- **50,000 Benign Flows**: Genuine MQTT and HTTP traffic from patient monitors.
- **50,000 Attack Flows**: ARP spoofing, TCP/UDP DoS floods, and brute force packet storms.

#### Feature Matrix ($X$):
| Feature | Units | Description | Benign Mean | Attack Mean |
| :--- | :--- | :--- | :--- | :--- |
| `Duration` | $ms$ | Flow active duration | $2.42$ | $0.18$ (burst) or $12.5$ |
| `Rate` | $pkts/sec$ | Packet frequency | $1.2$ | $94.6$ |
| `Tot size` | $bytes$ | Total payload volume | $284$ | $1,840$ |
| `AVG` | $bytes$ | Mean packet size | $142$ | $420$ |
| `IAT` | $ms$ | Inter-arrival time | $450.2$ | $3.8$ |

#### Performance Metrics on Test Partition:
- **Accuracy**: $98.6\%$
- **Precision**: $97.9\%$
- **Recall**: $99.2\%$
- **F1-Score**: $98.5\%$
- **Inference Latency**: $< 1.8\text{ ms}$ per packet

---

### 4.3 Dual System Operating Modes (Standard vs Pure ML)

To balance demonstration clarity with rigorous academic verification, TRINETRA provides two parallel execution pathways:

```
+------------------------------------------------------------------------------------+
|                         DUAL SYSTEM OPERATING MODES                                |
+------------------------------------------------------------------------------------+
| Feature                  | Standard Mode (/attacker)  | Pure ML Mode (/attacker-pure-ml)
+--------------------------+----------------------------+----------------------------+
| Primary Objective        | Classroom demonstration    | Unassisted ML verification |
| Inference Method         | Model score + demo trigger | Strictly model.predict()   |
| Instant DB Alert Push    | Enabled on card click      | DISABLED (pure ML result)  |
| Synthetic Rate Overrides | Allowed (e.g. rate > 80)   | REMOVED completely         |
| Client ID Bias Check     | Permitted ("attacker_node")| STRIPPED from inference    |
| Live Confidence Gauges   | Static indicator           | Dynamic Scikit-Learn proba |
| What-If Interactive Lab  | Not available              | 5-parameter real-time lab  |
+------------------------------------------------------------------------------------+
```

In `ids_engine.py`, the function `process_packet_pure_ml(packet)` executes unassisted mathematical inference:
```python
# Pure ML inference: No client_id checks, no hardcoded rate gates
features_l2 = np.array([[duration, rate, tot_size, avg_size, iat]])
pred_l2 = model_l2.predict(features_l2)[0]
proba_l2 = model_l2.predict_proba(features_l2)[0]

# Layer 1 Isolation Forest evaluation
features_l1 = np.array([[hr, spo2, impedance, dose_rate]])
score_l1 = model_l1.score_samples(features_l1)[0]
is_anomaly_l1 = model_l1.predict(features_l1)[0] == -1
```

---

## 5. Autonomous Zero-Trust Quarantine & IPS Engine

TRINETRA follows the principle of **Zero-Trust**: *"Never Trust, Always Verify, Immediately Isolate."*

When an intrusion is identified:
1. **Quarantine State Committal**:
   The backend executes an immediate atomic transaction in `data/trinetra.db`:
   ```sql
   UPDATE devices SET status = 'Quarantine' WHERE id = :device_id;
   INSERT INTO security_events (device_id, attack_type, client_ip, status, action_taken)
   VALUES (:device_id, :attack_type, :client_ip, 'Quarantine', 'Autonomous Isolation');
   ```
2. **Telemetry Blackholing**:
   The telemetry broker revokes the subscription topic associated with the quarantined device MAC. The central ICU monitor freezes downstream updates and flags the patient monitor as **QUARANTINED / DATA COMPROMISED**.
3. **Forensic Logging**:
   The raw packet payload, timestamp, feature vector, and ML confidence score are logged into `data/audit_log.db` for post-incident compliance.
4. **Synchronous Notification Dispatch**:
   A JSON security frame is broadcasted over WebSockets to all connected web and mobile clients:
   ```json
   {
     "type": "SECURITY_ALERT",
     "severity": "Critical",
     "device_id": "00:1B:44:11:3A:B7",
     "patient_id": "patient_101",
     "attack_type": "DoS / Rate Flood",
     "confidence": 0.985,
     "timestamp": "2026-09-10T11:20:00Z"
   }
   ```

---

## 6. Real-Time Physiological Telemetry Synthesis

To provide realistic clinical monitoring, TRINETRA includes a continuous mathematical physiological waveform generator.

### 6.1 50Hz PQRST ECG Lead II Mathematical Model

The electrocardiogram represents the electrical vector of myocardial depolarization and repolarization. The synthetic Lead II waveform $V(t)$ is generated at 50Hz using a sum of five Gaussian functions representing the P, Q, R, S, and T waves:

$$V(t) = \sum_{i \in \{P, Q, R, S, T\}} a_i \cdot \exp \left( - \frac{(\theta(t) - \mu_i)^2}{2 \sigma_i^2} \right) + \eta(t)$$

Where:
- $\theta(t) = (2\pi \cdot f_{HR} \cdot t) \pmod{2\pi}$ represents the phase within the cardiac cycle.
- $f_{HR} = \frac{\text{Heart Rate (bpm)}}{60}$ is the cardiac frequency in Hertz.
- $a_i$ is the peak amplitude of component $i$.
- $\mu_i$ is the center phase angle of component $i$.
- $\sigma_i$ is the width (duration) of component $i$.
- $\eta(t)$ is baseline wander and thermal noise ($\sim \mathcal{N}(0, 0.01)$).

#### PQRST Parameter Values (Lead II):
| Wave | Amplitude $a_i$ ($mV$) | Phase $\mu_i$ ($rad$) | Width $\sigma_i$ ($rad$) | Physiological Event |
| :--- | :--- | :--- | :--- | :--- |
| **P** | $+0.15$ | $-\frac{\pi}{3}$ | $0.09$ | Atrial Depolarization |
| **Q** | $-0.18$ | $-\frac{\pi}{12}$ | $0.03$ | Septal Depolarization |
| **R** | $+1.25$ | $0.00$ | $0.04$ | Ventricular Depolarization |
| **S** | $-0.35$ | $+\frac{\pi}{12}$ | $0.04$ | Late Ventricular Depolarization |
| **T** | $+0.28$ | $+\frac{5\pi}{12}$ | $0.15$ | Ventricular Repolarization |

### 6.2 SpO2 Photoplethysmograph (PPG) Synthesis

The arterial pulse waveform simulates pulsatile blood volume changes in fingertip capillaries:

$$PPG(t) = A_{\text{sys}} \cdot \exp \left( - \frac{(\theta(t) - \mu_{\text{sys}})^2}{2 \sigma_{\text{sys}}^2} \right) + A_{\text{dic}} \cdot \exp \left( - \frac{(\theta(t) - \mu_{\text{dic}})^2}{2 \sigma_{\text{dic}}^2} \right)$$

- **Systolic Peak**: Represents primary arterial pressure ejection.
- **Dicrotic Notch & Diastolic Peak**: Simulates aortic valve closure and arterial elastic recoil.

---

## 7. Database Schema & Data Persistence Architecture

The primary database file is stored at `data/trinetra.db` using SQLite with WAL (Write-Ahead Logging) mode enabled for high-concurrency writes.

### Entity-Relationship Diagram (ERD):

```
+------------------+         +------------------+         +------------------+
|      users       |         |     patients     |         |     devices      |
+------------------+         +------------------+         +------------------+
| id (PK, Int)     |         | id (PK, String)  |1       *| id (PK, MAC)     |
| username (Unique)|         | name             |---------| name             |
| password_hash    |         | age              |         | type             |
| role             |         | status           |         | patient_id (FK)  |
| created_at       |         | bed_number       |         | ip_address       |
+------------------+         | is_calibrated    |         | status           |
                             +--------┬---------+         +--------┬---------+
                                      │ 1                          │ 1
                                      │                            │
                                      │ *                          │ *
                             +--------┴----------------------------┴---------+
                             |                     alerts                    |
                             +-----------------------------------------------+
                             | id (PK, Int)                                  |
                             | timestamp (DateTime)                          |
                             | device_id (FK -> devices.id)                  |
                             | patient_id (FK -> patients.id)                |
                             | severity (Low, Medium, High, Critical)        |
                             | message (Text)                                |
                             | status (Unresolved, Acknowledged, Resolved)   |
                             +-----------------------------------------------+
```

### Table Definitions:

1. **`patients`**: Stores demographic, bed assignment, and calibration state.
2. **`devices`**: Inventories medical sensors (ECG monitors, pulse oximeters, smart pumps), MACs, IP addresses, and quarantine states.
3. **`alerts`**: Logs clinical threshold crossings and cybersecurity alarms.
4. **`security_events`**: Detailed audit records of confirmed adversarial attacks.
5. **`ips_rules`**: Configurable intrusion prevention rules with sensitivity thresholds.
6. **`models`**: Tracks loaded machine learning models, version numbers, accuracies, and ROC-AUC scores.
7. **`audit_logs`**: Administrative audit trail for role-based actions.

---

## 8. Backend REST API & WebSocket Protocol Reference

FastAPI exposes RESTful endpoints with automatic OpenAPI documentation available at `http://localhost:8000/docs`.

### Selected API Endpoints:

#### Security & Pure ML Controls
- `GET /api/security/mode`: Returns `{"system_mode": "standard" | "pure_ml"}`.
- `POST /api/security/mode`: Body `{"system_mode": "pure_ml"}` toggles the global detection pipeline.
- `POST /api/security/pure-ml/attack`: Injects an unscripted adversarial network flow to be processed directly by Scikit-Learn models without hardcoded overrides.
- `POST /api/security/pure-ml/evaluate`: "What-If" parameter evaluator. Takes flow and vital metrics and returns exact probability vectors and isolation scores without modifying database state.
- `GET /api/security/pure-ml/diagnostics`: Returns model memory health, scikit-learn version, and feature importances.

#### Patient Telemetry & Profiles
- `GET /api/patients`: Returns all admitted patients, their current vitals, bed numbers, and device statuses.
- `GET /api/patients/{id}`: Returns a single patient's profile and baseline calibration state.
- `GET /api/patients/{id}/telemetry`: High-resolution historical physiological series.
- `POST /api/patients/{id}/calibrate`: Resets patient vitals to baseline and clears sensor errors.

#### Device Fleet & IPS Rules
- `GET /api/devices`: Returns device inventory and status (`Online`, `Quarantine`).
- `POST /api/devices/{id}/quarantine`: Manually toggles device isolation.
- `GET /api/ips/rules`: Retrieves active intrusion prevention filter rules.

#### WebSocket Specification
- **Endpoint**: `ws://localhost:8000/ws`
- **Protocol**: JSON frames transmitted every 1000ms containing:
  - System mode (`standard` vs `pure_ml`)
  - Real-time patient telemetry (Heart Rate, SpO2, NIBP, Respiration)
  - Active security incidents
  - Device health indicators

---

## 9. Frontend & Mobile Application Architecture

### Next.js 16 Web Dashboard (`frontend/`)
The web application is built with **Next.js 16** (React 19, Tailwind CSS, Lucide icons).
- **ICU Central Station (`src/app/page.tsx`)**: Displays all admitted beds with animated live `MiniEcgStrip` green waveforms, threat radar, and quick action bars.
- **Bedside Monitor (`src/app/patients/[id]/page.tsx`)**: High-resolution 850px real-time canvas rendering 50Hz PQRST ECG Lead II and SpO2 photoplethysmograph waveforms with sweep-bar animation.
- **Pure ML Attacker Hub (`src/app/attacker-pure-ml/page.tsx`)**: Dedicated cyber-defense lab featuring real-time Scikit-Learn probability meters, Isolation Forest anomaly score gauges, and an interactive 5-parameter What-If slider playground.
- **Standard Attacker Hub (`src/app/attacker/page.tsx`)**: Red-team demonstration cockpit with 6 pre-scripted attack scenarios.
- **AI-IDS Analytics (`src/app/ai-ids/page.tsx`)**: Displays confusion matrices, classification metrics, and ROC-AUC curves.

### React Native Mobile App (`mobile/`)
The mobile application is built with **Expo / React Native** to provide healthcare workers with pocket-sized monitoring:
- **`MonitorScreen.tsx`**: Portable ICU vital display.
- **`AlertsScreen.tsx`**: High-priority push notifications for patient alarms.
- **`ScenariosScreen.tsx`**: Mobile-driven scenario triggers.

---

## 10. Step-by-Step Installation & Deployment Guide

### System Requirements:
- **Operating System**: Windows 10/11, Ubuntu 22.04 LTS, or macOS 13+
- **Python**: Version 3.10 to 3.12
- **Node.js**: Version 18.x or higher
- **RAM**: Minimum 4 GB (8 GB recommended)

### Step 1: Environment Setup
```bash
# Clone the repository
git clone https://github.com/Iamadhi2005/trinetra.git
cd trinetra

# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate       # On Windows
source .venv/bin/activate      # On Linux/macOS

# Install backend dependencies
pip install -r requirements.txt
pip install fastapi uvicorn sqlalchemy pydantic python-jose passlib bcrypt
```

### Step 2: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 3: Run the Application
**Option A: One-Click Startup (Windows)**
```cmd
run_trinetra.bat
```

**Option B: Manual Startup**
- Terminal 1 (Backend):
  ```bash
  .\.venv\Scripts\activate
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  ```
- Terminal 2 (Frontend):
  ```bash
  cd frontend
  npm run dev -- -p 3000
  ```

---

## 11. Verification, Benchmarks & Unit Testing

The system includes automated regression suites to verify pure ML classification and detection fidelity:
- **Test File**: `scratch/test_pure_ml_mode.py`
- **Verification Scenarios**:
  1. *Normal Benign Telemetry*: Confirms `pred == 0` (Benign) with low attack probability ($< 15\%$).
  2. *DoS Packet Storm*: Confirms `pred == 1` (Attack) with high attack probability ($> 90\%$).
  3. *Vital Overdose Tampering*: Confirms Layer 1 Isolation Forest flags anomaly score ($< 0.0$).
  4. *Dynamic Mode Toggle*: Validates that `/api/security/mode` dynamically switches system execution state without server restart.

---

## 12. Academic Viva & Project Defense Guide (Q&A)

### Question 1: What is the core technical contribution of TRINETRA compared to existing open-source network IDS tools like Snort or Zeek?
**Answer**: Snort and Zeek are rule-based packet inspection engines tailored for standard enterprise IT protocols. They cannot interpret physiological patient telemetry and fail to identify data-poisoning attacks where valid medical protocols are used to inject lethal dosage commands. TRINETRA provides a **Two-Tier Architecture**: Layer 1 continuously audits multidimensional physiological vitals via an unsupervised Isolation Forest, while Layer 2 classifies network flow dynamics using a Random Forest model trained on the benchmark CIC-IoMT-2024 dataset.

### Question 2: Why choose an Isolation Forest for Layer 1 instead of a Supervised Classifier?
**Answer**: In clinical healthcare, normal physiological distributions are well known, but every patient anomaly or novel sensor fault cannot be pre-labeled. An unsupervised model like Isolation Forest isolates rare, out-of-distribution values (such as an abrupt infusion dose spike or sensor lead detachment) without requiring prior exposure to that specific attack vector, making it robust against zero-day medical tampering.

### Question 3: How do you prove that the attack detection is genuinely driven by Machine Learning and not hardcoded if-else statements?
**Answer**: TRINETRA includes the **Pure ML Attacker Hub** (`/attacker-pure-ml`). When a test attack is launched in Pure ML mode, the system bypasses all demo shortcuts: no hardcoded threshold checks (`packet_rate > 80`) and no client ID string matching (`client_id == 'attacker_node'`). The raw 5-feature vector (`Duration`, `Rate`, `Tot size`, `AVG`, `IAT`) is passed directly into `model_l2.predict()` and `model_l2.predict_proba()`. Users can also manipulate the interactive **What-If Sliders** to watch Scikit-Learn decision boundaries react dynamically to mathematical changes in real time.

### Question 4: How does TRINETRA handle false positives to prevent alarm fatigue in critical hospital wards?
**Answer**: Alarm fatigue is a critical problem in ICUs. TRINETRA employs **Cross-Layer Verification**: a minor fluctuation in packet rate alone does not immediately trigger an emergency patient alarm unless Layer 1 detects a correlating physiological anomaly or Layer 2 class probability exceeds a high-confidence threshold ($> 85\%$). Furthermore, our Zero-Trust IPS isolates the network flow rather than shutting down the physical life-support hardware.

### Question 5: What is the significance of the CIC-IoMT-2024 dataset?
**Answer**: Released by the Canadian Institute for Cybersecurity (CIC) at the University of New Brunswick, CIC-IoMT-2024 is the latest and most comprehensive publicly available healthcare IoT dataset. It captures real-world hospital hardware testbeds running WiFi, MQTT, BLE, and Zigbee under diverse attack vectors (ARP spoofing, MQTT manipulation, DoS floods), providing authentic benchmark data for training our Layer 2 classifier.

---

<div align="center">
  <b>TRINETRA IoMT Cyber-Defense System</b><br/>
  <i>Engineered for Reliability, Built for Patient Safety</i>
</div>
