import warnings
warnings.filterwarnings("ignore")

import asyncio
import os
import uvicorn
import math
import time
import random
from typing import Optional, List, Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine, SessionLocal
from backend.models import User, Patient, Device, MLModelRecord, Setting, AuditLog, Alert
from backend.auth import get_password_hash

# Import routers
from backend.routes.auth_routes import router as auth_router
from backend.routes.dashboard_routes import router as dashboard_router
from backend.routes.patient_routes import router as patient_router
from backend.routes.device_routes import router as device_router
from backend.routes.security_routes import router as security_router
from backend.routes.network_routes import router as network_router
from backend.routes.alert_routes import router as alert_router
from backend.routes.settings_routes import router as settings_router
from backend.routes.report_routes import router as report_router
from backend.routes.log_routes import router as log_router
from backend.routes.ips_routes import router as ips_router
from backend.routes.adversary_routes import router as adversary_router
from backend.routes.admin_routes import router as admin_router
from backend.routes.notification_routes import router as notification_router
from backend.simulator_service import global_simulator_service

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TRINETRA API Gateway",
    description="Medical Intrusion Detection & Prevention System API Backend",
    version="2.0.0"
)

# CORS configuration for Web and Mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(patient_router)
app.include_router(device_router)
app.include_router(security_router)
app.include_router(network_router)
app.include_router(alert_router)
app.include_router(settings_router)
app.include_router(report_router)
app.include_router(log_router)
app.include_router(ips_router)
app.include_router(adversary_router)
app.include_router(admin_router)
app.include_router(notification_router)

def seed_initial_data():
    import sqlite3
    db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "trinetra.db")
    if os.path.exists(db_file):
        raw_conn = sqlite3.connect(db_file)
        cur = raw_conn.cursor()
        cols = [r[1] for r in cur.execute("PRAGMA table_info(users)").fetchall()]
        if "department" not in cols:
            cur.execute("ALTER TABLE users ADD COLUMN department TEXT DEFAULT 'General'")
        if "assigned_patient_id" not in cols:
            cur.execute("ALTER TABLE users ADD COLUMN assigned_patient_id TEXT DEFAULT NULL")
        if "is_active" not in cols:
            cur.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
        if "must_change_password" not in cols:
            cur.execute("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0")
        raw_conn.commit()
        raw_conn.close()

    db = SessionLocal()
    try:
        # Seed initial users if empty
        if db.query(User).filter(User.username == "admin").count() == 0:
            db.add(User(username="admin", password_hash=get_password_hash("admin123"), name="Chief SOC Admin / Medical Director", role="Admin", department="Hospital Security Administration", is_active=True, must_change_password=False))
            db.commit()

        # Ensure doctors exist
        doc_seeds = [
            ("dr.connor", "Dr. Sarah Connor", "Cardiology & Intensive Care (ICU-A)"),
            ("dr.radhi", "Dr. Radhi", "Critical Care & Tele-ICU (ICU-A)"),
            ("dr.rocky", "Dr. Rocky", "Emergency Medicine & Trauma (ICU-A)"),
            ("dr.arjun", "Dr. Arjun", "Cardiothoracic Surgery Subnet (ICU-C)"),
        ]
        for u, name, dept in doc_seeds:
            if db.query(User).filter(User.username == u).count() == 0:
                db.add(User(username=u, password_hash=get_password_hash("DoctorInit2026!"), name=name, role="Doctor", department=dept, is_active=True, must_change_password=True))
        db.commit()

        # Ensure tech team exists
        tech_seeds = [
            ("tech.batman", "Techie Batman (Lead SOC Analyst)", "IoMT SOC Team"),
            ("tech.netsec", "Alex Vance (Network Specialist)", "IoMT SOC Team"),
            ("tech.deviceops", "David Kim (Firmware Engineer)", "Biomedical Engineering"),
        ]
        for u, name, dept in tech_seeds:
            if db.query(User).filter(User.username == u).count() == 0:
                db.add(User(username=u, password_hash=get_password_hash("TechSec2026!"), name=name, role="Tech", department=dept, is_active=True, must_change_password=False))
        db.commit()

        # Ensure patient accounts exist
        pt_seeds = [
            ("pt.smith", "Robert Smith", "patient_102"),
            ("pt.babu", "Babu", "PAT-6665"),
            ("pt.raju", "Raju", "PAT-7850"),
            ("pt.anirudh", "Anirudh", "PAT-3851"),
            ("pt.jeeva", "Jeeva", "PAT-4008"),
            ("pt.johndoe", "John Doe", "patient_101"),
        ]
        for u, name, pid in pt_seeds:
            if db.query(User).filter(User.username == u).count() == 0:
                db.add(User(username=u, password_hash=get_password_hash("PatientCare2026!"), name=name, role="Patient", department="Admitted Inpatient Care", assigned_patient_id=pid, is_active=True, must_change_password=False))
        db.commit()
            
        # Seed patients if empty
        if db.query(Patient).count() == 0:
            db.add(Patient(id="patient_101", name="John Doe", age=52, phone="+91-98765-0101", guardian_name="Jane (Spouse)", guardian_phone="+91-98765-0102", status="Normal", is_calibrated=True, calibration_progress=100))
            db.add(Patient(id="patient_102", name="Robert Smith", age=61, phone="+91-98765-0201", guardian_name="Mary Smith (Mother)", guardian_phone="+91-98765-0202", status="Normal", is_calibrated=True, calibration_progress=100))
            db.add(Patient(id="patient_103", name="Alice Johnson", age=38, phone="+91-98765-0301", guardian_name="David Johnson (Father)", guardian_phone="+91-98765-0302", status="Normal", is_calibrated=True, calibration_progress=100))
            db.commit()
            
        # Seed devices if empty
        if db.query(Device).count() == 0:
            db.add(Device(id="icu_monitor_patient_101", name="ECG Monitor - John Doe", type="ECG Monitor", patient_id="patient_101", status="Online"))
            db.add(Device(id="spo2_patient_101", name="SpO2 Sensor - John Doe", type="Pulse Oximeter", patient_id="patient_101", status="Online"))
            db.add(Device(id="pump_patient_101", name="Infusion Pump - John Doe", type="Infusion Pump", patient_id="patient_101", status="Online"))
            db.add(Device(id="icu_monitor_patient_102", name="ECG Monitor - Robert Smith", type="ECG Monitor", patient_id="patient_102", status="Online"))
            db.add(Device(id="icu_monitor_patient_103", name="ECG Monitor - Alice Johnson", type="ECG Monitor", patient_id="patient_103", status="Online"))
            db.commit()
            
        # Seed ML model stats
        if db.query(MLModelRecord).count() == 0:
            db.add(MLModelRecord(name="Layer 1 Physiological Guard", algorithm="Isolation Forest", version="v2.1", accuracy=0.985, precision=0.978, recall=0.991, f1_score=0.984, roc_auc=0.993))
            db.add(MLModelRecord(name="Layer 2 Network Classifier", algorithm="Random Forest", version="v2.1", accuracy=0.992, precision=0.995, recall=0.989, f1_score=0.992, roc_auc=0.997))
            db.commit()
            
        # Seed IPS Rules
        from backend.models import IPSRule
        if db.query(IPSRule).count() == 0:
            db.add(IPSRule(name="DoS Prevention Limit", description="Quarantine client nodes sending packet rates above 20 packets/sec threshold", enabled=True, threshold=20.0))
            db.add(IPSRule(name="Physiological Outlier Filter", description="Quarantine device telemetry if Isolation Forest flags anomaly score < -0.015", enabled=True, threshold=-0.015))
            db.add(IPSRule(name="MitM Cryptographic Signature Check", description="Reject and quarantine telemetry with invalid HMAC keys", enabled=True, threshold=1.0))
            db.add(IPSRule(name="Replay Window Verification", description="Block payloads with timestamp latency exceeding 3000ms", enabled=True, threshold=3000.0))
        # Clear stale quarantine records from prior false positives
        from backend.models import QuarantineRecord
        db.query(QuarantineRecord).delete()
        db.query(Alert).filter(Alert.status == "Unresolved").delete()
        db.query(Device).update({Device.status: "Online"})
        db.commit()
    finally:
        db.close()

seed_initial_data()

# Background simulator loop runner
async def simulator_background_loop():
    while True:
        try:
            global_simulator_service.tick()
        except Exception:
            pass
        await asyncio.sleep(1.0)

def generate_pqrst_ecg_point(t_ms: int, bpm: int = 75) -> float:
    """Generates an authentic high-resolution clinical ECG PQRST complex voltage (mV) with razor-sharp QRS needle spikes."""
    period = 60000.0 / bpm
    phase = (t_ms % period) / period
    
    val = 0.0
    
    # 1. P-Wave (Atrial Depolarization)
    if 0.10 <= phase <= 0.18:
        p_p = (phase - 0.10) / 0.08
        val += 0.15 * math.sin(p_p * math.pi)
        
    # 2. Q-Wave (Initial Sharp Downward Dip)
    elif 0.22 <= phase <= 0.235:
        q_p = (phase - 0.22) / 0.015
        val -= 0.25 * math.sin(q_p * math.pi)
        
    # 3. R-Wave (Razor-Sharp Ventricular Needle Spike: +2.2mV)
    elif 0.235 < phase <= 0.265:
        r_p = (phase - 0.235) / 0.03
        val += 2.2 * math.sin(r_p * math.pi)
        
    # 4. S-Wave (Deep Terminal Downward Dip)
    elif 0.265 < phase <= 0.29:
        s_p = (phase - 0.265) / 0.025
        val -= 0.45 * math.sin(s_p * math.pi)
        
    # 5. T-Wave (Ventricular Repolarization)
    elif 0.42 <= phase <= 0.62:
        t_p = (phase - 0.42) / 0.20
        val += 0.32 * math.sin(t_p * math.pi)
        
    # 6. U-Wave (Post-T Wave)
    elif 0.65 <= phase <= 0.72:
        u_p = (phase - 0.65) / 0.07
        val += 0.04 * math.sin(u_p * math.pi)
        
    # Baseline physiological myographic micro-jitter
    val += random.uniform(-0.025, 0.025)
    return val

def generate_spo2_pleth_point(t_ms: int, bpm: int = 75) -> float:
    """Generates an authentic arterial SpO2 Plethysmograph pulse waveform (0.0 to 1.0) with a dicrotic notch bump."""
    period = 60000 / bpm
    phase = (t_ms % period) / period
    
    val = 0.0
    # Rapid Systolic Upstroke (0.0 to 0.22)
    if phase <= 0.22:
        u_phase = phase / 0.22
        val = math.sin(u_phase * (math.pi / 2.0))
    # Diastolic Decay (0.22 to 0.40)
    elif 0.22 < phase <= 0.40:
        d_phase = (phase - 0.22) / 0.18
        val = 1.0 - 0.55 * math.sin(d_phase * (math.pi / 2.0))
    # Dicrotic Notch secondary aortic closure bump (0.40 to 0.52)
    elif 0.40 < phase <= 0.52:
        n_phase = (phase - 0.40) / 0.12
        val = 0.45 + 0.15 * math.sin(n_phase * math.pi)
    # Diastolic Tail Decay (0.52 to 1.0)
    else:
        t_phase = (phase - 0.52) / 0.48
        val = 0.45 * math.cos(t_phase * (math.pi / 2.0))
        
    val += random.uniform(-0.01, 0.01)
    return max(0.0, min(1.0, val))

@app.websocket("/ws/telemetry/{patient_id}")
async def websocket_telemetry(websocket: WebSocket, patient_id: str):
    await websocket.accept()
    
    t_ms = 0
    loop_tick = 0
    attack_mode, target_patient = "Normal", ""
    attack_info = {}
    
    try:
        while True:
            p_dev = global_simulator_service.simulator.get_or_create_patient(patient_id)
            
            # Refresh attack state periodically instead of every 20ms to keep event loop free
            if loop_tick % 8 == 0:
                attack_mode, target_patient = global_simulator_service.get_attack_state()
                dev_attack = getattr(p_dev, "attack_mode", "Normal")
                effective_attack = attack_mode if (attack_mode != "Normal" and (target_patient == patient_id or not target_patient)) else (dev_attack if dev_attack != "Normal" else "Normal")
                is_under_attack = effective_attack != "Normal"

                if is_under_attack:
                    attack_info = global_simulator_service.get_attack_details(effective_attack, patient_id)
                elif attack_mode != "Normal":
                    attack_info = global_simulator_service.get_attack_details(attack_mode, target_patient)
                else:
                    attack_info = {}
            else:
                dev_attack = getattr(p_dev, "attack_mode", "Normal")
                effective_attack = attack_mode if (attack_mode != "Normal" and (target_patient == patient_id or not target_patient)) else (dev_attack if dev_attack != "Normal" else "Normal")
                is_under_attack = effective_attack != "Normal"

            loop_tick += 1
                
            hr = getattr(p_dev, "heart_rate", 75.0)
            spo2 = getattr(p_dev, "spo2", 98.0)
            systolic = int(getattr(p_dev, "systolic_bp", 115))
            diastolic = int(getattr(p_dev, "diastolic_bp", 75))
            temp = round(getattr(p_dev, "temperature", 36.8), 1)
            resp = int(getattr(p_dev, "respiration_rate", 16))
            infusion = getattr(p_dev, "infusion_rate", 5.0)
            battery = getattr(p_dev, "battery", 98.0)
            status = getattr(p_dev, "status", getattr(p_dev, "pump_status", "Online"))
            bp = f"{systolic}/{diastolic}"
                
            ecg_val = generate_pqrst_ecg_point(t_ms, int(hr))
            pleth_val = generate_spo2_pleth_point(t_ms, int(hr))
            
            payload = {
                "patient_id": patient_id,
                "telemetry_file": f"data/telemetry_{patient_id}.json",
                "ecg_voltage": round(ecg_val, 3),
                "spo2_pleth": round(pleth_val, 3),
                "heart_rate": int(round(hr)),
                "spo2": round(spo2, 1),
                "blood_pressure": bp,
                "temperature": temp,
                "respiration_rate": max(8, min(40, resp)),
                "infusion_level": round(infusion, 1),
                "pacing_rate": int(getattr(p_dev, "pacing_rate", 70)),
                "battery": int(battery),
                "status": status,
                "timestamp": time.time(),
                "is_under_attack": is_under_attack,
                "attack_type": attack_info.get("attack_label", effective_attack),
                "active_attack_mode": effective_attack,
                "active_target_patient": target_patient,
                "system_under_attack": attack_mode != "Normal",
                # Rich Machine & Patient Attack Attribution
                "machine_id": attack_info.get("target_device_id", f"icu_monitor_{patient_id}"),
                "machine_name": attack_info.get("target_device_name", f"ECG Monitor - Patient {patient_id}"),
                "machine_type": attack_info.get("target_device_type", "Medical Device"),
                "patient_name": attack_info.get("target_patient_name", f"Patient {patient_id}"),
                "ward_number": attack_info.get("ward_number", "ICU-A"),
                "bed_number": attack_info.get("bed_number", "Bed-01"),
                "attack_severity": attack_info.get("severity", "Normal"),
                "attack_message": attack_info.get("alert_message", ""),
                "action_taken": attack_info.get("action_taken", "")
            }
            
            await websocket.send_json(payload)
            t_ms += 60
            await asyncio.sleep(0.06)
            
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

from backend.mqtt_service import start_mqtt_listener
from backend.routes.notification_routes import register_main_loop, websocket_alerts_endpoint

@app.websocket("/ws/alerts")
async def root_websocket_alerts(websocket: WebSocket, token: Optional[str] = None, role: Optional[str] = None, user_id: Optional[str] = None):
    await websocket_alerts_endpoint(websocket, token=token, role=role, user_id=user_id)

@app.on_event("startup")
async def on_startup():
    try:
        register_main_loop(asyncio.get_running_loop())
    except Exception:
        pass
    asyncio.create_task(simulator_background_loop())
    start_mqtt_listener()

@app.get("/")
def root():
    return {"name": "TRINETRA API Gateway", "status": "Online", "docs_url": "/docs"}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
