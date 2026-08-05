import asyncio
import os
import uvicorn
import math
import time
import random
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.database import Base, engine, SessionLocal
from backend.models import User, Patient, Device, MLModelRecord, Setting, AuditLog
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
from backend.simulator_service import global_simulator_service

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TRINETRA API Gateway",
    description="Medical Intrusion Detection & Prevention System API Backend",
    version="2.0.0"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
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

def seed_initial_data():
    db = SessionLocal()
    try:
        # Seed initial users if empty
        if db.query(User).count() == 0:
            db.add(User(username="admin", password_hash=get_password_hash("admin123"), name="Chief SOC Admin", role="Admin"))
            db.add(User(username="doctor", password_hash=get_password_hash("doctor123"), name="Dr. Sarah Connor", role="Doctor"))
            db.add(User(username="nurse", password_hash=get_password_hash("nurse123"), name="Nurse Joy", role="Nurse"))
            db.commit()
            
        # Seed patients if empty
        if db.query(Patient).count() == 0:
            db.add(Patient(id="patient_101", name="John Doe", age=52, phone="+1-555-0101", guardian_name="Jane Doe (Spouse)", guardian_phone="+1-555-0102", status="Normal"))
            db.add(Patient(id="patient_102", name="Robert Smith", age=61, phone="+1-555-0201", guardian_name="Mary Smith (Mother)", guardian_phone="+1-555-0202", status="Normal"))
            db.add(Patient(id="patient_103", name="Alice Johnson", age=38, phone="+1-555-0301", guardian_name="David Johnson (Father)", guardian_phone="+1-555-0302", status="Normal"))
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
    
    db = SessionLocal()
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    db.close()
    
    if not patient:
        await websocket.close(code=4004)
        return
        
    t_ms = 0
    try:
        while True:
            p_dev = global_simulator_service.simulator.patients.get(patient_id)
            if not p_dev:
                from patient_simulator import DeviceSimulator
                p_dev = DeviceSimulator(patient_id)
                global_simulator_service.simulator.patients[patient_id] = p_dev
                
            hr = p_dev.heart_rate
            spo2 = p_dev.spo2
            infusion = p_dev.infusion_rate
            battery = p_dev.battery
            status = p_dev.status
            bp = f"{int(p_dev.systolic_bp)}/{int(p_dev.diastolic_bp)}"
            temp = round(p_dev.temperature, 1)
            resp = int(p_dev.respiration_rate)
                
            ecg_val = generate_pqrst_ecg_point(t_ms, int(hr))
            pleth_val = generate_spo2_pleth_point(t_ms, int(hr))
            
            payload = {
                "ecg_voltage": round(ecg_val, 3),
                "spo2_pleth": round(pleth_val, 3),
                "heart_rate": int(hr),
                "spo2": round(spo2, 1),
                "blood_pressure": bp,
                "temperature": temp,
                "respiration_rate": max(8, min(30, resp)),
                "infusion_level": round(infusion, 1),
                "battery": int(battery),
                "status": status,
                "timestamp": time.time()
            }
            
            await websocket.send_json(payload)
            t_ms += 20
            await asyncio.sleep(0.02)
            
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

@app.on_event("startup")
async def on_startup():
    asyncio.create_task(simulator_background_loop())

@app.get("/")
def root():
    return {"name": "TRINETRA API Gateway", "status": "Online", "docs_url": "/docs"}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
