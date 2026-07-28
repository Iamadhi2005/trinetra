import time
import json
import os
import random
import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Patient, Device, Alert, SecurityEvent, QuarantineRecord, AuditLog
from patient_simulator import PatientSimulator
from ids_engine import IDSEngine

class SimulatorService:
    def __init__(self):
        self.simulator = PatientSimulator()
        self.ids = IDSEngine()
        self.state_file = "data/attack_state.json"
        
    def get_attack_state(self):
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r") as f:
                    data = json.load(f)
                    return data.get("attack_mode", "Normal"), data.get("target_patient", "")
            except Exception:
                pass
        return "Normal", ""

    def tick(self):
        """Runs a single simulation and detection step, saving events to DB."""
        db: Session = SessionLocal()
        try:
            attack_mode, target_patient = self.get_attack_state()
            
            # Apply attack modes
            for p_id in self.simulator.patients:
                if p_id == target_patient and attack_mode != "MitM":
                    self.simulator.set_attack_mode(p_id, attack_mode, ips_disabled=False)
                else:
                    self.simulator.set_attack_mode(p_id, "Normal", ips_disabled=False)
                    
            self.simulator.update_all()
            
            # Process packets
            for p_id, p_dev in list(self.simulator.patients.items()):
                device_id = f"icu_monitor_{p_id}"
                payload = self.simulator.get_payload(p_id, device_id)
                if not payload:
                    continue
                    
                if p_id == target_patient and attack_mode == "MitM":
                    payload["signature"] = "corrupted_tampered_signature"
                    
                packet_size = 450 if p_dev.attack_mode == "DoS" else 148
                client_id = f"attacker_node_{p_id}" if (p_dev.attack_mode in ["DoS", "Override", "Drain"] or (p_id == target_patient and attack_mode == "MitM")) else f"icu_sensor_{p_id}"
                
                # IDS process
                res = self.ids.process_packet(payload, client_id, packet_size)
                
                # Check device in DB
                db_dev = db.query(Device).filter(Device.id == device_id).first()
                if db_dev:
                    db_dev.last_seen = datetime.datetime.utcnow()
                    db_dev.battery = max(0, int(p_dev.battery))
                    if p_dev.attack_mode == "Fault":
                        db_dev.status = "Fault"
                    elif res["status"] == "Quarantine":
                        db_dev.status = "Quarantine"
                    else:
                        db_dev.status = "Online"
                
                # If quarantined, record alert & quarantine entry
                if res["status"] == "Quarantine" or res["status"] == "Attack":
                    # Check if alert already logged recently
                    recent_alert = db.query(Alert).filter(
                        Alert.device_id == device_id,
                        Alert.status == "Unresolved"
                    ).first()
                    
                    if not recent_alert:
                        new_alert = Alert(
                            device_id=device_id,
                            patient_id=p_id,
                            severity="Critical",
                            message=res.get("alert", "Security Threat Quarantined"),
                            status="Unresolved"
                        )
                        db.add(new_alert)
                        
                        new_sec_event = SecurityEvent(
                            device_id=device_id,
                            attack_type=attack_mode if attack_mode != "Normal" else "Anomaly",
                            client_ip=client_id,
                            status="Quarantine",
                            action_taken="Moved to Soft Quarantine"
                        )
                        db.add(new_sec_event)
                        
            db.commit()
        except Exception as e:
            db.rollback()
        finally:
            db.close()

global_simulator_service = SimulatorService()
