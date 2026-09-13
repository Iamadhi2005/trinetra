import time
import random
import hmac
import hashlib
import os
import pandas as pd

# Secret key for payload signing
SECRET_KEY = b"hospital_secure_key_2026"

class DeviceSimulator:
    """Simulates a single patient's vital signs and device telemetry."""
    def __init__(self, patient_id):
        self.patient_id = patient_id
        
        # Check if custom telemetry calibration config exists
        telemetry_file = f"data/telemetry_{patient_id}.json"
        base_hr = None
        base_spo2 = None
        if os.path.exists(telemetry_file):
            try:
                import json
                with open(telemetry_file, "r") as f:
                    tdata = json.load(f)
                    base_hr = tdata.get("base_heart_rate")
                    base_spo2 = tdata.get("base_spo2")
            except Exception:
                pass

        # Unique deterministic physiological baseline per patient_id
        seed_val = sum(ord(c) for c in str(patient_id))
        r = random.Random(seed_val)
        
        self.heart_rate = float(base_hr) if base_hr is not None else float(r.randint(68, 86))
        self.spo2 = float(base_spo2) if base_spo2 is not None else round(r.uniform(96.5, 99.2), 1)
        self.lead_impedance = float(r.randint(480, 520))
        self.pacing_rate = float(r.randint(65, 75))
        self.battery = float(r.randint(92, 100))
        
        self.infusion_rate = 5.0
        self.infused_volume = float(r.randint(80, 250))
        self.pump_status = "Pumping Normal"
        self.status = "Online"
        
        self.systolic_bp = float(r.randint(110, 126))
        self.diastolic_bp = float(r.randint(70, 82))
        self.temperature = round(r.uniform(36.6, 37.3), 1)
        self.respiration_rate = float(r.randint(13, 18))
        
        self.attack_mode = "Normal"
        self.ips_disabled = True
        self.replay_buffer = []

    def reset_to_normal(self):
        """Resets physiological metrics, lead impedance, pump status, and battery back to healthy clinical baseline."""
        self.attack_mode = "Normal"
        self.ips_disabled = False
        self.replay_buffer = []
        
        telemetry_file = f"data/telemetry_{self.patient_id}.json"
        base_hr = None
        base_spo2 = None
        if os.path.exists(telemetry_file):
            try:
                import json
                with open(telemetry_file, "r") as f:
                    tdata = json.load(f)
                    base_hr = tdata.get("base_heart_rate")
                    base_spo2 = tdata.get("base_spo2")
            except Exception:
                pass

        seed_val = sum(ord(c) for c in str(self.patient_id))
        r = random.Random(seed_val)

        self.heart_rate = float(base_hr) if base_hr is not None else float(r.randint(70, 80))
        self.spo2 = float(base_spo2) if base_spo2 is not None else round(r.uniform(97.5, 99.0), 1)
        self.lead_impedance = float(r.randint(490, 510))
        self.pacing_rate = float(r.randint(68, 72))
        self.battery = float(r.randint(95, 100))
        self.infusion_rate = 5.0
        self.pump_status = "Pumping Normal"
        self.status = "Online"
        self.systolic_bp = float(r.randint(115, 122))
        self.diastolic_bp = float(r.randint(74, 80))
        self.temperature = round(r.uniform(36.7, 37.1), 1)
        self.respiration_rate = float(r.randint(14, 16))

        # Persist healthy baseline immediately to telemetry config
        if os.path.exists(telemetry_file):
            try:
                import json
                with open(telemetry_file, "r") as f:
                    tdata = json.load(f)
                tdata.update({
                    "status": "Online",
                    "attack_mode": "Normal",
                    "heart_rate": round(self.heart_rate, 1),
                    "spo2": round(self.spo2, 1),
                    "lead_impedance": round(self.lead_impedance, 1),
                    "pacing_rate": round(self.pacing_rate, 1),
                    "battery": round(self.battery, 1),
                    "infusion_rate": round(self.infusion_rate, 1),
                    "pump_status": self.pump_status,
                    "blood_pressure": f"{int(self.systolic_bp)}/{int(self.diastolic_bp)}",
                    "systolic_bp": round(self.systolic_bp, 1),
                    "diastolic_bp": round(self.diastolic_bp, 1),
                    "temperature": round(self.temperature, 1),
                    "respiration_rate": round(self.respiration_rate, 1),
                    "last_updated": time.time()
                })
                with open(telemetry_file, "w") as f:
                    json.dump(tdata, f, indent=2)
            except Exception:
                pass

    def update_vitals(self):
        """Updates physiological vital signs dynamically based on state."""
        if self.attack_mode == "Normal":
            # Normal physiological deviations
            self.heart_rate += random.uniform(-1.0, 1.0)
            self.heart_rate = max(60.0, min(100.0, self.heart_rate))
            
            self.spo2 += random.uniform(-0.05, 0.05)
            self.spo2 = max(95.0, min(100.0, self.spo2))
            
            self.lead_impedance += random.uniform(-1.0, 1.0)
            self.lead_impedance = max(450.0, min(550.0, self.lead_impedance))
            
            self.systolic_bp += random.uniform(-1.5, 1.5)
            self.systolic_bp = max(90.0, min(130.0, self.systolic_bp))
            
            self.diastolic_bp += random.uniform(-1.0, 1.0)
            self.diastolic_bp = max(60.0, min(85.0, self.diastolic_bp))
            
            self.temperature += random.uniform(-0.05, 0.05)
            self.temperature = max(36.5, min(37.5, self.temperature))
            
            self.respiration_rate += random.uniform(-0.5, 0.5)
            self.respiration_rate = max(12.0, min(20.0, self.respiration_rate))
            
            self.pacing_rate = max(65.0, min(75.0, self.pacing_rate + random.uniform(-0.2, 0.2)))
            
            if self.battery < 95.0:
                self.battery = min(100.0, self.battery + 2.0)
            else:
                self.battery -= 0.0005
            self.battery = max(0.0, min(100.0, self.battery))
            
            self.infusion_rate = 5.0
            self.infused_volume += (self.infusion_rate / 3600.0) # volume accumulated
            self.pump_status = "Pumping Normal"
            self.status = "Online"
            
        elif self.attack_mode == "Override":
            if self.ips_disabled:
                # Override attack (overdose & rapid pacing)
                self.infusion_rate = 500.0
                self.pump_status = "PUMP OVERDOSE RATE"
                self.pacing_rate = 180.0
                
                # Physiology crashes due to overload
                self.heart_rate = min(190.0, self.heart_rate + 10.0)
                self.systolic_bp = max(50.0, self.systolic_bp - 15.0)
                self.spo2 = max(70.0, self.spo2 - 1.0)
            else:
                # IPS active fallback
                self.infusion_rate = 1.0
                self.pump_status = "IPS FALLBACK: KVO MODE"
                self.pacing_rate = 70.0
                
                self.heart_rate = max(70.0, self.heart_rate - 8.0)
                self.systolic_bp = min(115.0, self.systolic_bp + 8.0)
                self.spo2 = min(98.0, self.spo2 + 0.3)
                
        elif self.attack_mode == "Drain":
            if self.ips_disabled:
                self.battery -= 5.0
                self.battery = max(0.0, self.battery)
                self.pump_status = "BATTERY FAULT: LOW POWER"
            else:
                self.battery -= 0.0005
                self.pump_status = "Pumping Normal"
                
        elif self.attack_mode == "Fault":
            # Loose lead / contact failure
            self.lead_impedance = 10000.0
            self.heart_rate = random.choice([0.0, 220.0, 150.0])
            self.spo2 = random.choice([0.0, 80.0])
            
        # Record buffer for replay
        if self.attack_mode == "Normal" and len(self.replay_buffer) < 50:
            self.replay_buffer.append({
                "hr": self.heart_rate, "spo2": self.spo2, "impedance": self.lead_impedance,
                "pacing": self.pacing_rate, "batt": self.battery, "inf_rate": self.infusion_rate,
                "sys": self.systolic_bp, "dia": self.diastolic_bp, "temp": self.temperature, "resp": self.respiration_rate
            })

        # Continuously persist latest live generated vitals to patient-specific telemetry file
        telemetry_file = f"data/telemetry_{self.patient_id}.json"
        try:
            import json
            existing_data = {}
            if os.path.exists(telemetry_file):
                try:
                    with open(telemetry_file, "r") as f:
                        existing_data = json.load(f)
                except Exception:
                    existing_data = {}

            existing_data.update({
                "patient_id": self.patient_id,
                "last_updated": time.time(),
                "status": "Online" if self.status != "Offline" else "Offline",
                "attack_mode": self.attack_mode,
                "heart_rate": round(self.heart_rate, 1),
                "spo2": round(self.spo2, 1),
                "blood_pressure": f"{int(self.systolic_bp)}/{int(self.diastolic_bp)}",
                "systolic_bp": round(self.systolic_bp, 1),
                "diastolic_bp": round(self.diastolic_bp, 1),
                "respiration_rate": round(self.respiration_rate, 1),
                "temperature": round(self.temperature, 1),
                "infusion_rate": round(self.infusion_rate, 1),
                "battery": round(self.battery, 1),
                "pump_status": self.pump_status,
                "lead_impedance": round(self.lead_impedance, 1),
                "pacing_rate": round(self.pacing_rate, 1)
            })
            os.makedirs("data", exist_ok=True)
            with open(telemetry_file, "w") as f:
                json.dump(existing_data, f, indent=2)
        except Exception:
            pass

class PatientSimulator:
    """Manages multiple patient devices simultaneously in the hospital room."""
    def __init__(self):
        self.patients = {}
        self.reload_patients()
        
    def reload_patients(self):
        """Loads or reloads patient device simulators from database records."""
        all_patient_ids = set()
        
        # 1. Fetch from SQLAlchemy DB (trinetra.db)
        try:
            from backend.database import SessionLocal
            from backend.models import Patient as DBPatient
            db = SessionLocal()
            db_patients = db.query(DBPatient).all()
            for p in db_patients:
                all_patient_ids.add(p.id)
            db.close()
        except Exception:
            pass
            
        # 2. Fetch from legacy SQLite DB (audit_log.db)
        try:
            from src.utils import get_patients_from_db, add_patient_to_db
            df = get_patients_from_db()
            if df.empty:
                os.makedirs("data/photos", exist_ok=True)
                add_patient_to_db("patient_101", "Aarav Sharma", "+91 98765 43210", "Priya Sharma (Spouse)", "+91 98765 43211", ["ECG Monitor", "Pulse Oximeter", "Pacemaker", "Infusion Pump"], "data/photos/patient_101.png")
                add_patient_to_db("patient_102", "Rajesh Kumar", "+91 98450 12345", "Sunita Kumar (Spouse)", "+91 98450 12346", ["ECG Monitor", "Pulse Oximeter", "Infusion Pump"], "")
                add_patient_to_db("patient_103", "Ananya Iyer", "+91 97123 45678", "Ramesh Iyer (Father)", "+91 97123 45679", ["ECG Monitor", "Pulse Oximeter", "Pacemaker"], "")
                df = get_patients_from_db()
            for _, row in df.iterrows():
                all_patient_ids.add(row['patient_id'])
        except Exception:
            pass

        # Update simulator objects - only keep patients currently present in database
        new_patients = {}
        for p_id in all_patient_ids:
            if p_id in self.patients:
                new_patients[p_id] = self.patients[p_id]
            else:
                new_patients[p_id] = DeviceSimulator(p_id)
        self.patients = new_patients

    def remove_patient(self, patient_id: str):
        """Removes a patient from the in-memory simulator and deletes telemetry cache."""
        if patient_id in self.patients:
            del self.patients[patient_id]
        telemetry_file = f"data/telemetry_{patient_id}.json"
        if os.path.exists(telemetry_file):
            try:
                os.remove(telemetry_file)
            except Exception:
                pass

    def get_or_create_patient(self, patient_id: str) -> DeviceSimulator:
        if patient_id not in self.patients:
            self.patients[patient_id] = DeviceSimulator(patient_id)
        return self.patients[patient_id]
        
    def set_attack_mode(self, patient_id, mode, ips_disabled):
        if patient_id in self.patients:
            p = self.patients[patient_id]
            prev_mode = p.attack_mode
            p.attack_mode = mode
            p.ips_disabled = ips_disabled
            if mode == "Normal" and prev_mode != "Normal":
                p.reset_to_normal()

    def reset_all_to_normal(self):
        for p in self.patients.values():
            p.reset_to_normal()
        self.update_all()
            
    def update_all(self):
        for p in self.patients.values():
            p.update_vitals()
            
    def generate_signature(self, patient, device_id, timestamp):
        data_string = f"{device_id}:{timestamp}:{patient.heart_rate:.2f}:{patient.spo2:.2f}:{patient.lead_impedance:.2f}:{patient.pacing_rate:.2f}:{patient.battery:.2f}:{patient.infusion_rate:.2f}"
        return hmac.new(SECRET_KEY, data_string.encode('utf-8'), hashlib.sha256).hexdigest()

    def get_payload(self, patient_id, device_id):
        if patient_id not in self.patients:
            return None
            
        p = self.patients[patient_id]
        timestamp = time.time()
        
        hr, spo2, impedance, pacing, batt, inf_rate = p.heart_rate, p.spo2, p.lead_impedance, p.pacing_rate, p.battery, p.infusion_rate
        sys_bp, dia_bp, temp, resp = p.systolic_bp, p.diastolic_bp, p.temperature, p.respiration_rate
        
        # Handle replay attack
        if p.attack_mode == "Replay" and len(p.replay_buffer) > 0:
            hist = random.choice(p.replay_buffer)
            hr, spo2, impedance, pacing, batt, inf_rate = hist["hr"], hist["spo2"], hist["impedance"], hist["pacing"], hist["batt"], hist["inf_rate"]
            sys_bp, dia_bp, temp, resp = hist["sys"], hist["dia"], hist["temp"], hist["resp"]
            if p.ips_disabled:
                timestamp = time.time() - 3600.0  # replayed timestamp from 1 hour ago
                
        payload = {
            "device_id": device_id,
            "patient_id": patient_id,
            "timestamp": timestamp,
            "vitals": {
                "heart_rate": hr,
                "spo2": spo2,
                "lead_impedance": impedance,
                "pacing_rate": pacing,
                "battery": batt,
                "infusion_rate": inf_rate,
                "pump_status": p.pump_status,
                "systolic_bp": sys_bp,
                "diastolic_bp": dia_bp,
                "body_temperature": temp,
                "respiration_rate": resp
            }
        }
        
        payload["signature"] = self.generate_signature(p, device_id, timestamp)
        return payload

if __name__ == "__main__":
    import sys
    if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
        
    print("=========================================================================")
    print("      TRINETRA CLINICAL PATIENT TELEMETRY SIMULATOR MONITOR             ")
    print("=========================================================================")
    print("Starting continuous live medical device telemetry generation...\n")
    
    sim = PatientSimulator()
    print(f"Loaded {len(sim.patients)} simulated patient devices: {list(sim.patients.keys())}\n")
    
    try:
        while True:
            sim.update_all()
            print(f"--- [TELEMETRY TICK: {time.strftime('%H:%M:%S')}] ---")
            for p_id in list(sim.patients.keys()):
                payload = sim.get_payload(p_id, f"icu_monitor_{p_id}")
                vitals = payload.get("vitals", {}) if payload else {}
                print(f"🟢 [LIVE] Patient: {p_id} | HR: {vitals.get('heart_rate', 0):.1f} bpm | SpO2: {vitals.get('spo2', 0):.1f}% | BP: {vitals.get('systolic_bp', 0):.0f}/{vitals.get('diastolic_bp', 0):.0f} mmHg | Temp: {vitals.get('body_temperature', 0):.1f} °C")
            print("-" * 75)
            time.sleep(1.0)
    except KeyboardInterrupt:
        print("\nSimulator stopped safely.")

