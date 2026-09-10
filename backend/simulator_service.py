import time
import json
import os
import random
import datetime
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Patient, Device, Alert, SecurityEvent, QuarantineRecord, AuditLog
from patient_simulator import PatientSimulator
from ids_engine import IDSEngine

ATTACK_VECTORS: Dict[str, Dict[str, Any]] = {
    "Override": {
        "label": "Pacemaker & Infusion Override",
        "severity": "Critical",
        "primary_device_type": "Infusion Pump",
        "device_prefix": "pump_",
        "fallback_prefix": "icu_monitor_",
        "action_taken": "Quarantined by IPS - KVO Mode Fallback Activated",
        "desc": "Malicious physiological command injection forcing rapid pacing (180 ppm) and lethal medication overdose (500 mL/h)"
    },
    "Drain": {
        "label": "Battery Depletion Exploit",
        "severity": "High",
        "primary_device_type": "Lithium Power Subsystem",
        "device_prefix": "icu_monitor_",
        "fallback_prefix": "icu_monitor_",
        "action_taken": "IPS Power-Throttle Activated & Subsystem Isolated",
        "desc": "Continuous high-draw power cycling draining 5% battery per second to induce clinical blackout"
    },
    "Fault": {
        "label": "Sensor Detachment (Loose Lead Fault)",
        "severity": "Warning",
        "primary_device_type": "ECG Monitor",
        "device_prefix": "icu_monitor_",
        "fallback_prefix": "icu_monitor_",
        "action_taken": "Nurse Station Alert Dispatched - Lead Inspection Required",
        "desc": "ECG Lead II biosensor contact failure with 10,000 Ω impedance spike (Lead detached)"
    },
    "DoS": {
        "label": "DoS Volumetric Packet Flood",
        "severity": "Critical",
        "primary_device_type": "ECG Monitor",
        "device_prefix": "icu_monitor_",
        "fallback_prefix": "icu_monitor_",
        "action_taken": "Quarantined by IPS - Telemetry Rate Limiter & MAC Isolation",
        "desc": "Volumetric packet flooding (450-byte packets > 20 pkts/s) overwhelming telemetry queues"
    },
    "MitM": {
        "label": "Telemetry Spoofing / MitM",
        "severity": "Critical",
        "primary_device_type": "Pulse Oximeter",
        "device_prefix": "spo2_",
        "fallback_prefix": "icu_monitor_",
        "action_taken": "Quarantined by IPS - Invalid Cryptographic Signature Dropped",
        "desc": "Corrupted HMAC-SHA256 signature keys and forged physiological vitals in transit"
    },
    "Spoofing": {
        "label": "Telemetry Spoofing / MitM",
        "severity": "Critical",
        "primary_device_type": "Pulse Oximeter",
        "device_prefix": "spo2_",
        "fallback_prefix": "icu_monitor_",
        "action_taken": "Quarantined by IPS - Invalid Cryptographic Signature Dropped",
        "desc": "Corrupted HMAC-SHA256 signature keys and forged physiological vitals in transit"
    },
    "Replay": {
        "label": "Replay / Stale Data Injection",
        "severity": "High",
        "primary_device_type": "ECG Monitor",
        "device_prefix": "icu_monitor_",
        "fallback_prefix": "icu_monitor_",
        "action_taken": "Quarantined by IPS - Stale Packet Timestamp Latency Window Exceeded",
        "desc": "Replay of stale historical telemetry (>3000ms old) to disguise genuine acute patient crisis"
    },
    "BruteForce": {
        "label": "Brute-Force Authentication Attack",
        "severity": "Critical",
        "primary_device_type": "API Gateway",
        "device_prefix": "gateway_auth_",
        "fallback_prefix": "gateway_auth_broker",
        "action_taken": "Attacker IP Auto-Banned by Rate Limiter & Token Revoked",
        "desc": "High-frequency unauthorized credential stuffing and forged JWT authorization attacks"
    }
}

class SimulatorService:
    def __init__(self):
        self.simulator = PatientSimulator()
        self.ids = IDSEngine()
        self.state_file = "data/attack_state.json"
        self.mode_file = "data/system_mode.json"
        self.system_mode = "standard"
        if os.path.exists(self.mode_file):
            try:
                with open(self.mode_file, "r") as f:
                    self.system_mode = json.load(f).get("mode", "standard")
            except Exception:
                pass

    def get_system_mode(self) -> str:
        if os.path.exists(self.mode_file):
            try:
                with open(self.mode_file, "r") as f:
                    self.system_mode = json.load(f).get("mode", "standard")
            except Exception:
                pass
        return self.system_mode

    def set_system_mode(self, mode: str) -> str:
        self.system_mode = mode if mode in ["standard", "pure_ml"] else "standard"
        os.makedirs("data", exist_ok=True)
        try:
            with open(self.mode_file, "w") as f:
                json.dump({"mode": self.system_mode, "updated_at": time.time()}, f)
        except Exception:
            pass
        return self.system_mode

    def trigger_attack_pure_ml(self, attack_mode: str, target_patient: str) -> Dict[str, Any]:
        """
        Pure ML attack trigger:
        Configures the simulator telemetry WITHOUT pre-inserting alerts or quarantines into the DB.
        The DB alert will ONLY be created if/when the ML models flag an anomaly during packet inspection.
        """
        self.set_system_mode("pure_ml")
        os.makedirs("data", exist_ok=True)
        state_data = {
            "attack_mode": attack_mode,
            "target_patient": target_patient,
            "mode": "pure_ml",
            "timestamp": time.time()
        }
        with open(self.state_file, "w") as f:
            json.dump(state_data, f)

        db: Session = SessionLocal()
        try:
            if attack_mode == "Normal":
                for p_id in self.simulator.patients:
                    self.simulator.set_attack_mode(p_id, "Normal", ips_disabled=False)
                self.ids.quarantine_queue.clear()
                self.ids.blocked_clients.clear()
                
                # Resolve DB alerts on return to normal
                db.query(Alert).filter(Alert.status == "Unresolved").update({
                    Alert.status: "Resolved",
                    Alert.resolution_notes: "Normal telemetry restored. Threat cleared."
                })
                db.query(Device).update({Device.status: "Online"})
                db.commit()
            else:
                for p_id in self.simulator.patients:
                    if p_id == target_patient:
                        self.simulator.set_attack_mode(p_id, attack_mode, ips_disabled=True)
                    else:
                        self.simulator.set_attack_mode(p_id, "Normal", ips_disabled=False)
                db.commit()
        except Exception as e:
            db.rollback()
        finally:
            db.close()

        self.simulator.update_all()
        return state_data
        
    def get_attack_state(self) -> Tuple[str, str]:
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, "r") as f:
                    data = json.load(f)
                    return data.get("attack_mode", "Normal"), data.get("target_patient", "")
            except Exception:
                pass
        return "Normal", ""

    def get_attack_details(self, attack_mode: str, target_patient: str) -> Dict[str, Any]:
        """Resolves target patient, device, and alert metadata."""
        vec = ATTACK_VECTORS.get(attack_mode, {
            "label": attack_mode,
            "severity": "High",
            "primary_device_type": "Medical Device",
            "device_prefix": "icu_monitor_",
            "fallback_prefix": "icu_monitor_",
            "action_taken": "Quarantined by IPS",
            "desc": "Security anomaly detected on medical telemetry network"
        })

        patient_name = f"Patient {target_patient}" if target_patient else "Admitted Patient Subnet"
        ward_number = "ICU-A"
        bed_number = "Bed-01"

        db: Session = SessionLocal()
        try:
            if target_patient:
                p = db.query(Patient).filter(Patient.id == target_patient).first()
                if p:
                    patient_name = p.name
                    ward_number = p.ward_number or "ICU-A"
                    bed_number = p.bed_number or "Bed-01"

            # Determine machine ID
            dev_id = f"{vec['device_prefix']}{target_patient}" if target_patient else f"{vec['device_prefix']}broker"
            dev = db.query(Device).filter(Device.id == dev_id).first()

            # If primary device not found, try fallback
            if not dev and target_patient:
                fallback_id = f"{vec['fallback_prefix']}{target_patient}"
                fallback_dev = db.query(Device).filter(Device.id == fallback_id).first()
                if fallback_dev:
                    dev = fallback_dev
                    dev_id = fallback_id

            if dev:
                device_name = dev.name
                device_type = dev.type
            else:
                device_name = f"{vec['primary_device_type']} - {patient_name}"
                device_type = vec["primary_device_type"]
        finally:
            db.close()

        alert_message = (
            f"🚨 [{vec['severity'].upper()} ALERT] {vec['label']} detected on Machine: '{device_name}' ({dev_id}) "
            f"| Target Patient: '{patient_name}' ({target_patient or 'All'}, Ward: {ward_number}, Bed: {bed_number}) "
            f"— {vec['desc']}. Action: {vec['action_taken']}."
        )

        return {
            "is_active": attack_mode != "Normal",
            "attack_mode": attack_mode,
            "attack_label": vec["label"],
            "severity": vec["severity"],
            "target_patient_id": target_patient,
            "target_patient_name": patient_name,
            "ward_number": ward_number,
            "bed_number": bed_number,
            "target_device_id": dev_id,
            "target_device_name": device_name,
            "target_device_type": device_type,
            "alert_message": alert_message,
            "action_taken": vec["action_taken"],
            "desc": vec["desc"],
            "timestamp": time.time()
        }

    def trigger_attack_now(self, attack_mode: str, target_patient: str) -> Dict[str, Any]:
        """
        Immediately applies an attack, records the exact machine & patient alert in DB,
        and sets up simulator state without delay.
        """
        os.makedirs("data", exist_ok=True)
        state_data = {
            "attack_mode": attack_mode,
            "target_patient": target_patient,
            "timestamp": time.time()
        }
        with open(self.state_file, "w") as f:
            json.dump(state_data, f)

        db: Session = SessionLocal()
        try:
            if attack_mode == "Normal":
                # Resolve all active alerts
                active_alerts = db.query(Alert).filter(Alert.status == "Unresolved").all()
                for a in active_alerts:
                    a.status = "Resolved"
                    a.resolution_notes = "Disengaged by SOC Administrator / Threat Neutralized."

                # Restore devices to Online
                db.query(Device).update({Device.status: "Online"})
                db.commit()

                # Clear quarantine and reset simulators
                self.ids.quarantine_queue.clear()
                self.ids.blocked_clients.clear()
                for p_id in self.simulator.patients:
                    self.simulator.set_attack_mode(p_id, "Normal", ips_disabled=False)
                self.simulator.update_all()
                return state_data

            # Active attack: resolve details
            info = self.get_attack_details(attack_mode, target_patient)
            dev_id = info["target_device_id"]

            # Ensure device exists in DB
            dev = db.query(Device).filter(Device.id == dev_id).first()
            if not dev:
                dev = Device(
                    id=dev_id,
                    name=info["target_device_name"],
                    type=info["target_device_type"],
                    patient_id=target_patient if target_patient else None,
                    status="Fault" if attack_mode == "Fault" else "Quarantine",
                    last_seen=datetime.datetime.utcnow()
                )
                db.add(dev)
                db.flush()
            else:
                dev.status = "Fault" if attack_mode == "Fault" else "Quarantine"
                dev.last_seen = datetime.datetime.utcnow()

            # Record or update Unresolved Alert
            recent_alert = db.query(Alert).filter(
                (Alert.device_id == dev_id) | (Alert.patient_id == target_patient),
                Alert.status == "Unresolved"
            ).first()

            if recent_alert:
                recent_alert.device_id = dev_id
                recent_alert.patient_id = target_patient if target_patient else None
                recent_alert.severity = info["severity"]
                recent_alert.message = info["alert_message"]
                recent_alert.timestamp = datetime.datetime.utcnow()
            else:
                new_alert = Alert(
                    device_id=dev_id,
                    patient_id=target_patient if target_patient else None,
                    severity=info["severity"],
                    message=info["alert_message"],
                    status="Unresolved"
                )
                db.add(new_alert)


            sec_evt = SecurityEvent(
                device_id=dev_id,
                attack_type=info["attack_label"],
                client_ip=f"attacker_node_{target_patient or 'lan'}",
                status="Fault" if attack_mode == "Fault" else "Quarantine",
                action_taken=info["action_taken"]
            )
            db.add(sec_evt)


            # Audit Log entry
            audit = AuditLog(
                username="SOC-Admin",
                action=f"EXPLOIT_DEPLOYED_{attack_mode.upper()}",
                target=f"Machine: {info['target_device_name']} ({dev_id}) | Patient: {info['target_patient_name']}",
                severity="Critical" if info["severity"] == "Critical" else "Warning",
                result="Success"
            )
            db.add(audit)
            db.commit()

            # Apply attack to patient simulator with ips_disabled=True so anomaly manifests
            for p_id in self.simulator.patients:
                if p_id == target_patient:
                    self.simulator.set_attack_mode(p_id, attack_mode, ips_disabled=True)
                else:
                    self.simulator.set_attack_mode(p_id, "Normal", ips_disabled=False)

            self.simulator.update_all()

            # Add to soft quarantine queue for visibility in Security dashboard
            if attack_mode != "Fault":
                self.ids.quarantine_queue[dev_id] = {
                    "payload": {
                        "patient_id": target_patient,
                        "device_id": dev_id
                    },
                    "client_id": f"attacker_node_{target_patient or 'proxy'}",
                    "reason": info["desc"],
                    "timestamp": time.time()
                }

        except Exception as e:
            print("TRIGGER_ATTACK_NOW ERROR:", e)
            import traceback
            traceback.print_exc()
            db.rollback()
        finally:
            db.close()


        return state_data

    def tick(self):
        """Runs a single simulation and detection step, maintaining synchronization with DB."""
        db: Session = SessionLocal()
        try:
            # 1. PURE ML MODE BRANCH (Zero heuristics, zero forced alerts)
            if self.get_system_mode() == "pure_ml":
                attack_mode, target_patient = self.get_attack_state()
                for p_id in self.simulator.patients:
                    if p_id == target_patient and attack_mode != "Normal":
                        self.simulator.set_attack_mode(p_id, attack_mode, ips_disabled=True)
                    else:
                        self.simulator.set_attack_mode(p_id, "Normal", ips_disabled=False)
                self.simulator.update_all()

                for p_id, p_dev in list(self.simulator.patients.items()):
                    dev_id = f"icu_monitor_{p_id}"
                    payload = self.simulator.get_payload(p_id, dev_id)
                    if not payload:
                        continue

                    packet_size = 450 if p_dev.attack_mode == "DoS" else 148
                    client_id = f"telemetry_node_{p_id}"
                    
                    # If DoS attack mode is active, simulate burst packets to test Random Forest flow rate classifier
                    if p_dev.attack_mode == "DoS" and p_id == target_patient:
                        for _ in range(15):
                            res = self.ids.process_packet_pure_ml(payload, client_id, packet_size)
                    else:
                        res = self.ids.process_packet_pure_ml(payload, client_id, packet_size)

                    db_devs = db.query(Device).filter(
                        (Device.patient_id == p_id) | (Device.id == dev_id)
                    ).all()

                    if res["status"] == "Quarantine":
                        # Anomaly genuinely detected by ML!
                        active_alert = db.query(Alert).filter(
                            (Alert.device_id == dev_id) | (Alert.patient_id == p_id),
                            Alert.status == "Unresolved"
                        ).first()
                        if not active_alert:
                            db.add(Alert(
                                device_id=dev_id,
                                patient_id=p_id,
                                severity="Critical",
                                message=res["alert"],
                                status="Unresolved"
                            ))
                        for db_dev in db_devs:
                            db_dev.status = "Quarantine"
                            db_dev.last_seen = datetime.datetime.utcnow()
                    else:
                        for db_dev in db_devs:
                            if db_dev.status == "Quarantine" and attack_mode == "Normal":
                                db_dev.status = "Online"
                            db_dev.last_seen = datetime.datetime.utcnow()
                db.commit()
                return

            # 2. STANDARD MODE BRANCH (Preserves previous behavior 100%)
            attack_mode, target_patient = self.get_attack_state()
            
            # Apply attack modes to simulators
            for p_id in self.simulator.patients:
                if p_id == target_patient and attack_mode != "Normal":
                    self.simulator.set_attack_mode(p_id, attack_mode, ips_disabled=True)
                else:
                    self.simulator.set_attack_mode(p_id, "Normal", ips_disabled=False)
                    
            self.simulator.update_all()

            # If under active attack, make sure alert exists
            if attack_mode != "Normal":
                info = self.get_attack_details(attack_mode, target_patient)
                dev_id = info["target_device_id"]
                
                # Check unresolved alert
                active_alert = db.query(Alert).filter(
                    (Alert.device_id == dev_id) | (Alert.patient_id == target_patient),
                    Alert.status == "Unresolved"
                ).first()
                if not active_alert:
                    db.add(Alert(
                        device_id=dev_id,
                        patient_id=target_patient if target_patient else None,
                        severity=info["severity"],
                        message=info["alert_message"],
                        status="Unresolved"
                    ))
                    db.commit()
                else:
                    active_alert.message = info["alert_message"]
                    active_alert.severity = info["severity"]
                    db.commit()


            # Process packets for IDS engine
            for p_id, p_dev in list(self.simulator.patients.items()):
                dev_id = f"icu_monitor_{p_id}"
                payload = self.simulator.get_payload(p_id, dev_id)
                if not payload:
                    continue
                    
                if p_id == target_patient and attack_mode in ["MitM", "Spoofing"]:
                    payload["signature"] = "corrupted_tampered_signature"
                    
                packet_size = 450 if p_dev.attack_mode == "DoS" else 148
                client_id = f"attacker_node_{p_id}" if (p_dev.attack_mode in ["DoS", "Override", "Drain"] or (p_id == target_patient and attack_mode in ["MitM", "Spoofing"])) else f"icu_sensor_{p_id}"
                
                res = self.ids.process_packet(payload, client_id, packet_size)
                
                # Update device last_seen and status
                db_devs = db.query(Device).filter(
                    (Device.patient_id == p_id) | (Device.id == dev_id)
                ).all()
                for db_dev in db_devs:
                    db_dev.last_seen = datetime.datetime.utcnow()
                    db_dev.battery = max(0, int(p_dev.battery))
                    if p_dev.attack_mode == "Fault":
                        db_dev.status = "Fault"
                    elif res["status"] == "Quarantine" or (p_id == target_patient and attack_mode != "Normal"):
                        db_dev.status = "Quarantine"
                    else:
                        db_dev.status = "Online"

            db.commit()
        except Exception as e:
            db.rollback()
        finally:
            db.close()

global_simulator_service = SimulatorService()

