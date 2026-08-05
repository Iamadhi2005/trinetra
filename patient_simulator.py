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
        
        # Unique deterministic physiological baseline per patient_id
        seed_val = sum(ord(c) for c in str(patient_id))
        r = random.Random(seed_val)
        
        self.heart_rate = float(r.randint(68, 86))
        self.spo2 = round(r.uniform(96.5, 99.2), 1)
        self.lead_impedance = float(r.randint(480, 520))
        self.pacing_rate = float(r.randint(65, 75))
        self.battery = float(r.randint(92, 100))
        
        self.infusion_rate = 5.0
        self.infused_volume = float(r.randint(80, 250))
        self.pump_status = "Pumping Normal"
        
        self.systolic_bp = float(r.randint(110, 126))
        self.diastolic_bp = float(r.randint(70, 82))
        self.temperature = round(r.uniform(36.6, 37.3), 1)
        self.respiration_rate = float(r.randint(13, 18))
        
        self.attack_mode = "Normal"
        self.ips_disabled = True
        self.replay_buffer = []

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
            
            self.battery -= 0.0005
            self.battery = max(0.0, self.battery)
            self.infusion_rate = 5.0
            self.infused_volume += (self.infusion_rate / 3600.0) # volume accumulated
            self.pump_status = "Pumping Normal"
            
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

class PatientSimulator:
    """Manages multiple patient devices simultaneously in the hospital room."""
    def __init__(self):
        self.patients = {}
        self.reload_patients()
        
    def reload_patients(self):
        """Loads or reloads patient device simulators from SQLite database records."""
        from src.utils import get_patients_from_db, add_patient_to_db
        try:
            df = get_patients_from_db()
        except Exception:
            df = pd.DataFrame() # empty fallback
            
        if df.empty:
            # Seed default clinical patients if DB is empty
            os.makedirs("data/photos", exist_ok=True)
            add_patient_to_db("patient_101", "John Doe", "+1-555-0101", "Jane Doe (Spouse)", "+1-555-0102", ["ECG Monitor", "Pulse Oximeter", "Pacemaker", "Infusion Pump"], "data/photos/patient_101.png")
            add_patient_to_db("patient_102", "Robert Smith", "+1-555-0201", "Mary Smith (Mother)", "+1-555-0202", ["ECG Monitor", "Pulse Oximeter", "Infusion Pump"], "")
            add_patient_to_db("patient_103", "Alice Johnson", "+1-555-0301", "David Johnson (Father)", "+1-555-0302", ["ECG Monitor", "Pulse Oximeter", "Pacemaker"], "")
            df = get_patients_from_db()
            
        # Update simulator objects
        new_patients = {}
        for _, row in df.iterrows():
            p_id = row['patient_id']
            # Retain existing simulator states (vitals, buffers) if already running
            if p_id in self.patients:
                new_patients[p_id] = self.patients[p_id]
            else:
                new_patients[p_id] = DeviceSimulator(p_id)
        self.patients = new_patients
        
    def set_attack_mode(self, patient_id, mode, ips_disabled):
        if patient_id in self.patients:
            self.patients[patient_id].attack_mode = mode
            self.patients[patient_id].ips_disabled = ips_disabled
            
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
