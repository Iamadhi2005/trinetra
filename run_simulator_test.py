import time
import json
import sqlite3
import os
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

def run_continuous_test():
    print("=========================================================================")
    print("      TRINETRA CLINICAL PATIENT TELEMETRY SIMULATOR MONITOR             ")
    print("=========================================================================")
    print("Press Ctrl + C in the terminal to stop at any time.\n")
    
    sim = PatientSimulator()
    
    try:
        while True:
            # 1. Update physiology for all simulated patients
            sim.update_all()
            status_map = get_calibrated_status_map()
            
            print(f"--- [TELEMETRY TICK: {time.strftime('%H:%M:%S')}] ---")
            
            for p_id, p_dev in list(sim.patients.items()):
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
    run_continuous_test()
