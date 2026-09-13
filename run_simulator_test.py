import sys
import time
import json
import sqlite3
import os

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from patient_simulator import PatientSimulator

def get_calibrated_status_map():
    db_path = "data/trinetra.db"
    status_map = {}
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, is_calibrated, calibration_progress FROM patients")
            rows = cursor.fetchall()
            for r in rows:
                status_map[r[0]] = {
                    "name": r[1],
                    "is_calibrated": bool(r[2]),
                    "progress": r[3]
                }
            conn.close()
        except Exception:
            pass
    return status_map

def run_continuous_test(target_patient: str = None):
    print("=========================================================================")
    print("      TRINETRA CLINICAL PATIENT TELEMETRY SIMULATOR MONITOR             ")
    print("=========================================================================")
    if target_patient:
        print(f"🎯 Target Monitored Patient: {target_patient}")
    else:
        print("🎯 Monitoring Mode: ALL Registered Patients (Use 'python run_simulator_test.py <PATIENT_ID>' to filter)")
    print("Press Ctrl + C in the terminal to stop at any time.\n")
    
    sim = PatientSimulator()
    if target_patient and target_patient not in sim.patients:
        sim.get_or_create_patient(target_patient)
    
    try:
        while True:
            # 1. Update physiology for simulated patients
            sim.update_all()
            status_map = get_calibrated_status_map()
            
            print(f"--- [TELEMETRY TICK: {time.strftime('%H:%M:%S')}] ---")
            
            patients_to_show = [target_patient] if target_patient else list(sim.patients.keys())
            
            for p_id in patients_to_show:
                if p_id not in sim.patients:
                    sim.get_or_create_patient(p_id)
                p_dev = sim.patients[p_id]
                p_info = status_map.get(p_id, {"name": p_id, "is_calibrated": True, "progress": 100})
                device_id = f"icu_monitor_{p_id}"
                
                if p_info["is_calibrated"]:
                    payload = sim.get_payload(p_id, device_id)
                    vitals = payload.get("vitals", {})
                    print(f"🟢 [CALIBRATED & LIVE] Patient: {p_info['name']} ({p_id}) | Device: {device_id}")
                    print(f"   ► Heart Rate: {vitals.get('heart_rate', 0):.1f} bpm | SpO2: {vitals.get('spo2', 0):.1f}% | BP: {vitals.get('systolic_bp', 0):.0f}/{vitals.get('diastolic_bp', 0):.0f} mmHg")
                    print(f"   ► Temp: {vitals.get('body_temperature', 0):.1f} °C | Resp: {vitals.get('respiration_rate', 0):.0f}/min | Infusion: {vitals.get('infusion_rate', 0):.1f} mL/h")
                    print(f"   ► HMAC Signature: {payload.get('signature', '')[:32]}...")
                else:
                    print(f"⚪ [UNCALIBRATED / STANDBY] Patient: {p_info['name']} ({p_id}) | Progress: {p_info['progress']}%")
                    print(f"   ► Status: Waiting for user to click 'Calibrate Medical Device' in dashboard.")
                print("-" * 75)
                
            print("\nWaiting 1 second for next live telemetry broadcast...\n")
            time.sleep(1.0)
            
    except KeyboardInterrupt:
        print("\nSimulator test stopped by user. Exiting safely.")

if __name__ == "__main__":
    target = sys.argv[1].strip() if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else None
    run_continuous_test(target)

