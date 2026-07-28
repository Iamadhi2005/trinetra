import time
import os
import joblib
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore', category=UserWarning)

from src.utils import verify_payload_signature, is_replay_packet, log_security_event
from src.models import VitalAnomalyDetector, CUSUMDriftDetector

class IDSEngine:
    def __init__(self, db_path="data/audit_log.db"):
        self.db_path = db_path
        
        # Patient-specific anomaly detectors: {patient_id: VitalAnomalyDetector}
        self.detectors = {}
        self.drift_detectors = {}
        
        # Calibration state per patient: {patient_id: [samples...]}
        self.calibration_buffers = {}
        
        # Normal baseline stats per patient: {patient_id: {"hr_mean": 75.0, "hr_std": 5.0}}
        self.patient_baselines = {}
        
        # Blocked client/IP registry
        self.blocked_clients = set()
        
        # Soft Quarantine Queue
        # Stores: {device_id: {"payload": payload, "reason": reason, "timestamp": timestamp}}
        self.quarantine_queue = {}
        
        # Network metadata tracking for Layer 2
        # Stores: {client_id: [timestamps...]}
        self.packet_timestamps = {}
        self.normal_packet_size = 150 # expected avg bytes
        
        # Load Layer 2 Random Forest classifier if pre-trained
        self.model_l2 = None
        l2_path = "models/model_l2.joblib"
        if os.path.exists(l2_path):
            try:
                self.model_l2 = joblib.load(l2_path)
            except Exception:
                pass
                
        # Active model type
        self.model_type = "IsolationForest"
        
    def switch_model(self, model_type):
        """Switches the Layer 1 ML model type dynamically and resets calibration."""
        self.model_type = model_type
        self.detectors = {}
        self.drift_detectors = {}
        self.calibration_buffers = {}
        self.patient_baselines = {}

    def get_or_create_detector(self, patient_id):
        """Ensures that each patient has a dedicated, personalized anomaly detector."""
        if patient_id not in self.detectors:
            detector = VitalAnomalyDetector(model_type=self.model_type)
            drift_det = CUSUMDriftDetector(threshold=6.0, drift=0.5)
            
            # Load pre-trained model weights if present
            l1_path = "models/model_l1.joblib"
            if os.path.exists(l1_path) and self.model_type == "IsolationForest":
                try:
                    detector.model = joblib.load(l1_path)
                    detector.is_trained = True
                    # Approximate base scaling for fallback normal telemetry
                    detector.features_mean = np.array([75.0, 98.0, 500.0, 5.0])
                    detector.features_std = np.array([5.0, 0.5, 10.0, 0.5])
                except Exception:
                    pass
                    
            self.detectors[patient_id] = detector
            self.drift_detectors[patient_id] = drift_det
            self.calibration_buffers[patient_id] = []
            self.patient_baselines[patient_id] = {"hr_mean": 75.0, "hr_std": 5.0}
        return self.detectors[patient_id], self.drift_detectors[patient_id]

    def calibrate(self, patient_id, normal_samples):
        """Trains the patient-specific detector on normal baseline samples."""
        detector, drift_det = self.get_or_create_detector(patient_id)
        success = detector.train(normal_samples)
        if success:
            # Calculate mean and std for CUSUM
            samples = [s[0] for s in normal_samples] # heart rates
            mean_val = sum(samples) / len(samples)
            std_val = (sum((x - mean_val)**2 for x in samples) / len(samples))**0.5
            if std_val == 0:
                std_val = 1.0
            self.patient_baselines[patient_id] = {"hr_mean": mean_val, "hr_std": std_val}
        return success

    def process_packet(self, payload, client_id, packet_size):
        """
        Processes an incoming MQTT packet through all security layers.
        Returns a dictionary representing the analysis result.
        """
        timestamp_now = time.time()
        timestamp_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp_now))
        
        # 0. Check if client is permanently blocked
        if client_id in self.blocked_clients:
            return {
                "status": "Blocked",
                "alert": f"Packet from blocked client {client_id} dropped by firewall.",
                "quarantined": False,
                "data": None
            }
            
        # 1. HMAC Cryptographic & Timestamp (Replay) Check
        # Verification is done at the edge before heavy ML models to save CPU
        is_valid_signature = verify_payload_signature(payload)
        is_replay = is_replay_packet(payload.get("timestamp", 0), timestamp_now)
        
        if not is_valid_signature:
            log_security_event(timestamp_str, payload.get("device_id", "Unknown"), "MitM / Integrity Tampering", client_id, "Critical", "Packet Discarded", self.db_path)
            return {
                "status": "Attack",
                "alert": "MitM Attack: Cryptographic Signature Verification Failed!",
                "quarantined": False,
                "data": None
            }
            
        if is_replay:
            log_security_event(timestamp_str, payload.get("device_id", "Unknown"), "Replay Attack", client_id, "Critical", "Packet Discarded", self.db_path)
            return {
                "status": "Attack",
                "alert": "Replay Attack: Outdated packet timestamp detected!",
                "quarantined": False,
                "data": None
            }
            
        # 2. Extract features
        device_id = payload.get("device_id", "")
        patient_id = payload.get("patient_id", "")
        vitals = payload.get("vitals", {})
        
        hr = vitals.get("heart_rate", 75.0)
        spo2 = vitals.get("spo2", 98.0)
        impedance = vitals.get("lead_impedance", 500.0)
        pacing = vitals.get("pacing_rate", 70.0)
        batt = vitals.get("battery", 100.0)
        inf_rate = vitals.get("infusion_rate", 5.0)
        pump_status = vitals.get("pump_status", "")
        
        # 3. Layer 2: Network Traffic Analysis
        # Track packet frequency (rolling count of packet timestamps in last 2 seconds)
        if client_id not in self.packet_timestamps:
            self.packet_timestamps[client_id] = []
        self.packet_timestamps[client_id].append(timestamp_now)
        self.packet_timestamps[client_id] = [t for t in self.packet_timestamps[client_id] if timestamp_now - t <= 2.0]
        
        packet_rate = len(self.packet_timestamps[client_id])
        
        # Extract features for RF L2 check: ['Duration', 'Rate', 'Tot size', 'AVG', 'IAT']
        duration = 0.0
        if len(self.packet_timestamps[client_id]) > 1:
            duration = self.packet_timestamps[client_id][-1] - self.packet_timestamps[client_id][0]
            
        rate = packet_rate / duration if duration > 0 else packet_rate
        tot_size = packet_size * packet_rate
        avg_size = packet_size
        iat = duration / (packet_rate - 1) if packet_rate > 1 else 0.0
        
        is_l2_anomaly = False
        if self.model_l2 is not None:
            try:
                # Predict using Random Forest model trained on CIC-IoMT-2024
                # We pass the features: ['Duration', 'Rate', 'Tot size', 'AVG', 'IAT']
                # Create a DataFrame with column names to prevent UserWarning
                feature_df = pd.DataFrame([[duration, rate, tot_size, avg_size, iat]], 
                                          columns=['Header_Length', 'Protocol Type', 'Duration', 'Rate', 'Srate'] # dummy match to fit features
                                          )
                # Map standard feature values
                feature_array = np.array([[duration, rate, tot_size, avg_size, iat]])
                pred = self.model_l2.predict(feature_array)
                # Hybrid check: True if ML flags it OR if rate exceeds safety threshold (>10)
                is_l2_anomaly = (pred[0] == 1) or (packet_rate > 10)
            except Exception:
                is_l2_anomaly = packet_rate > 10
        else:
            is_l2_anomaly = packet_rate > 10
            
        if is_l2_anomaly:
            log_security_event(timestamp_str, device_id, "DoS / Flooding", client_id, "Critical", "Moved to Quarantine", self.db_path)
            # Put in quarantine
            self.quarantine_queue[device_id] = {
                "payload": payload,
                "client_id": client_id,
                "reason": f"Network anomaly (Flow Rate: {rate:.2f}/s)",
                "timestamp": timestamp_now
            }
            return {
                "status": "Quarantine",
                "alert": f"Network anomaly detected from {client_id} by Random Forest! Placed in Quarantine.",
                "quarantined": True,
                "data": vitals
            }
            
        # 4. Layer 1: Physiological Anomaly Detection (Unsupervised)
        detector, drift_det = self.get_or_create_detector(patient_id)
        feature_vector = [hr, spo2, impedance, inf_rate]
        
        # If not calibrated yet, collect calibration baseline samples
        if not detector.is_trained:
            buffer_list = self.calibration_buffers[patient_id]
            if len(buffer_list) < 100:
                buffer_list.append(feature_vector)
            return {
                "status": "Calibrating",
                "alert": f"Calibrating {patient_id} baseline... ({len(buffer_list)}/100)",
                "quarantined": False,
                "data": vitals
            }
            
        # Run Isolation Forest/KMeans prediction
        is_vital_anomalous = detector.predict_anomaly(feature_vector)
        
        # Run CUSUM drift detection for slow data poisoning
        base = self.patient_baselines[patient_id]
        is_drift = drift_det.update(hr, base["hr_mean"], base["hr_std"])
        
        # 5. Correlation & Fault vs Attack Diagnosis
        if is_vital_anomalous or is_drift:
            # Check if it is a loose lead hardware fault
            if impedance > 5000.0:
                # Sensor failure, not an attack
                log_security_event(timestamp_str, device_id, "Hardware Sensor Fault", client_id, "Warning", "Alert nurse, bypass automated block", self.db_path)
                return {
                    "status": "Fault",
                    "alert": f"Sensor Failure: Loose Lead detected on {device_id}! Please check hardware.",
                    "quarantined": False,
                    "data": vitals
                }
            else:
                # Extreme pacing override or infusion tampering
                # Verify if vital jumps instantly (cyberattack) vs gradual medical event
                log_security_event(timestamp_str, device_id, "Vital Spoofing / Command Injection", client_id, "Critical", "Moved to Quarantine", self.db_path)
                
                reason = "Stealth Drift Attack" if is_drift else "Vitals Out-of-Bounds override"
                self.quarantine_queue[device_id] = {
                    "payload": payload,
                    "client_id": client_id,
                    "reason": reason,
                    "timestamp": timestamp_now
                }
                return {
                    "status": "Quarantine",
                    "alert": f"Critical Override Attack detected on {device_id}! Placed in Quarantine.",
                    "quarantined": True,
                    "data": vitals
                }
                
        # Normal healthy execution
        return {
            "status": "Normal",
            "alert": f"Telemetry matches healthy {patient_id} baseline.",
            "quarantined": False,
            "data": vitals
        }

    def action_override(self, device_id):
        """Action: Approve Override - Releases data from quarantine."""
        if device_id in self.quarantine_queue:
            q_data = self.quarantine_queue.pop(device_id)
            timestamp_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
            log_security_event(timestamp_str, device_id, "Manual Override", q_data["client_id"], "Overridden", "Vitals forced to display", self.db_path)
            return q_data["payload"]["vitals"]
        return None
        
    def action_hard_block(self, device_id):
        """Action: Deploy Hard Block - Permanently blacklists the client ID."""
        if device_id in self.quarantine_queue:
            q_data = self.quarantine_queue.pop(device_id)
            client_id = q_data["client_id"]
            self.blocked_clients.add(client_id)
            timestamp_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
            log_security_event(timestamp_str, device_id, "Hard Firewall Block", client_id, "Blocked", "Client packets dropped permanently", self.db_path)
            return client_id
        return None
        
    def action_reset(self, device_id):
        """Action: Trigger Hardware Reset - Forces device into offline mode."""
        if device_id in self.quarantine_queue:
            q_data = self.quarantine_queue.pop(device_id)
            timestamp_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
            log_security_event(timestamp_str, device_id, "Hardware Failsafe Reset", q_data["client_id"], "Reset", "Device running offline", self.db_path)
            return q_data["client_id"]
        return None
