import time
import os
import random
import numpy as np

# Set random seeds for deterministic test results
random.seed(42)
np.random.seed(42)

# Import project files
from patient_simulator import PatientSimulator
from ids_engine import IDSEngine
from src.utils import init_db, get_security_logs

def run_verification_tests():
    print("====================================================")
    print("Starting TRINETRA IDS/IPS Automated Verification Tests")
    print("====================================================")
    
    # 0. Initialize fresh audit log database
    db_path = "data/test_audit_log.db"
    if os.path.exists(db_path):
        os.remove(db_path)
    init_db(db_path)
    
    # Setup instances
    sim = PatientSimulator()
    ids = IDSEngine(db_path=db_path)
    patient_id = "patient_101"
    device_id = f"icu_monitor_{patient_id}"
    
    print("\n[Step 1/5] Collecting Calibration Baseline...")
    normal_samples = []
    for _ in range(100):
        sim.update_all()
        payload = sim.get_payload(patient_id, device_id)
        normal_samples.append([
            payload["vitals"]["heart_rate"],
            payload["vitals"]["spo2"],
            payload["vitals"]["lead_impedance"],
            payload["vitals"]["infusion_rate"]
        ])
    
    # Calibrate ML models for patient_101
    calibrated = ids.calibrate(patient_id, normal_samples)
    if calibrated:
        print(f"[SUCCESS] Isolation Forest model calibrated for {patient_id}.")
    else:
        print("[FAIL] Model calibration failed.")
        return
        
    print("\n[Step 2/5] Testing Normal Telemetry Execution...")
    sim.set_attack_mode(patient_id, "Normal", ips_disabled=True)
    sim.update_all()
    payload = sim.get_payload(patient_id, device_id)
    res = ids.process_packet(payload, f"icu_sensor_{patient_id}", len(str(payload)))
    
    if res["status"] == "Normal":
        print(f"[SUCCESS] Normal packet correctly classified. Message: {res['alert']}")
    else:
        print(f"[FAIL] Normal packet misclassified. Status: {res['status']}")
        return
        
    print("\n[Step 3/5] Testing DoS Flood Attack (Layer 2 Detection)...")
    sim.set_attack_mode(patient_id, "DoS", ips_disabled=True)
    client_id = f"attacker_node_{patient_id}"
    payload = sim.get_payload(patient_id, device_id)
    
    # Process 12 packets within the time window to trigger the DoS rate threshold
    for _ in range(12):
        res = ids.process_packet(payload, client_id, len(str(payload)))
        
    if res["status"] == "Quarantine" and ("DoS" in res["alert"] or "Random Forest" in res["alert"]):
        print(f"[SUCCESS] DoS attack correctly quarantined. Message: {res['alert']}")
    else:
        print(f"[FAIL] DoS attack went undetected. Status: {res['status']}, Alert: {res['alert']}")
        return
        
    print("\n[Step 4/5] Testing Vital Override Attack (Layer 1 Detection)...")
    sim.set_attack_mode(patient_id, "Override", ips_disabled=True)
    sim.update_all()
    payload = sim.get_payload(patient_id, device_id)
    # Use a different client ID to separate the rate-limiter check from Step 3
    res = ids.process_packet(payload, f"override_attacker_{patient_id}", len(str(payload)))
    
    if res["status"] == "Quarantine" and "Override" in res["alert"]:
        print(f"[SUCCESS] Vital override attack quarantined. Message: {res['alert']}")
    else:
        print(f"[FAIL] Vital override attack undetected. Status: {res['status']}, Alert: {res['alert']}")
        return

    print("\n[Step 5/5] Testing Admin Control Center Override Action...")
    # Trigger the hard firewall block action on the quarantined device
    ids.action_hard_block(device_id)
    
    # Try sending another packet from the blacklisted client
    res = ids.process_packet(payload, f"override_attacker_{patient_id}", len(str(payload)))
    
    if res["status"] == "Blocked":
        print("[SUCCESS] Attacker Client ID permanently blocked by firewall rules.")
    else:
        print(f"[FAIL] Attacker bypasses block rules. Status: {res['status']}")
        return
        
    # Check SQLite logs
    df = get_security_logs(db_path=db_path)
    print(f"\n[INFO] SQLite DB Checked: Found {len(df)} entries in security log.")
    
    # Cleanup test DB
    if os.path.exists(db_path):
        os.remove(db_path)
        
    print("\n====================================================")
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("====================================================")

if __name__ == "__main__":
    run_verification_tests()
