import sys
import os
import json
import time
import argparse

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from backend.database import SessionLocal
from backend.models import Patient, Device
from patient_simulator import PatientSimulator

def list_all_patients():
    db = SessionLocal()
    try:
        patients = db.query(Patient).all()
        print("\n=========================================================================")
        print(f"       TRINETRA IoMT - REGISTERED PATIENTS IN DATABASE ({len(patients)})")
        print("=========================================================================")
        print(f"{'ID':<12} | {'Name':<18} | {'Ward / Bed':<14} | {'Status':<10} | {'Calibrated':<10}")
        print("-" * 73)
        for p in patients:
            calib_str = f"YES ({p.calibration_progress}%)" if p.is_calibrated else f"NO ({p.calibration_progress}%)"
            print(f"{p.id:<12} | {p.name[:18]:<18} | {f'{p.ward_number}/{p.bed_number}':<14} | {p.status:<10} | {calib_str:<10}")
        print("=" * 73)
        print("Tip: Run 'python check_patient.py <PATIENT_ID>' to inspect a single patient.\n")
    finally:
        db.close()

def inspect_patient(patient_id: str, live: bool = False):
    db = SessionLocal()
    try:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()

        print("\n=========================================================================")
        print(f"       PATIENT CLINICAL & SECURITY PROFILE: {patient_id}")
        print("=========================================================================")
        
        if patient:
            print(f"👤 Patient Name    : {patient.name}")
            print(f"🏥 Ward & Bed      : {patient.ward_number} - {patient.bed_number}")
            print(f"👨‍⚕️ Assigned Doctor : {patient.doctor_assigned}")
            print(f"📊 Medical Status  : {patient.status}")
            print(f"⚙️ Calibration     : {'Calibrated (100%)' if patient.is_calibrated else f'In Progress ({patient.calibration_progress}%)'}")
            print(f"📱 Emergency Phone : {patient.phone} (Guardian: {patient.guardian_name} - {patient.guardian_phone})")
            print(f"\n🔌 Connected IoMT Devices ({len(patient.devices)}):")
            for d in patient.devices:
                q_status = "🚨 QUARANTINE" if d.status == "Quarantine" else f"✅ {d.status}"
                print(f"   • {d.name} ({d.type}) | IP: {d.ip_address} | Battery: {d.battery}% | Status: [{q_status}]")
        else:
            print(f"⚠️ Note: Patient ID '{patient_id}' not found in DB tables, checking active simulator & telemetry cache...")
    finally:
        db.close()

    # Check telemetry JSON cache
    telemetry_file = f"data/telemetry_{patient_id}.json"
    if os.path.exists(telemetry_file):
        try:
            with open(telemetry_file, "r") as f:
                tdata = json.load(f)
            print("\n📁 Latest Cached Telemetry:")
            print(f"   ► Heart Rate    : {tdata.get('heart_rate')} bpm")
            print(f"   ► SpO2          : {tdata.get('spo2')} %")
            print(f"   ► Blood Pressure: {tdata.get('blood_pressure')} mmHg")
            print(f"   ► Temp / Resp   : {tdata.get('temperature')} °C | {tdata.get('respiration_rate')}/min")
            print(f"   ► Infusion Rate : {tdata.get('infusion_rate')} mL/h ({tdata.get('pump_status')})")
            print(f"   ► Attack Mode   : {tdata.get('attack_mode', 'Normal')}")
        except Exception:
            pass

    # Real-time simulator check
    sim = PatientSimulator()
    sim_patient = sim.get_or_create_patient(patient_id)
    
    if not live:
        sim.update_all()
        payload = sim.get_payload(patient_id, f"icu_monitor_{patient_id}")
        v = payload["vitals"]
        print("\n⚡ Current Live Telemetry Snapshot:")
        print(f"   ► Heart Rate    : {v['heart_rate']:.1f} bpm")
        print(f"   ► SpO2          : {v['spo2']:.1f} %")
        print(f"   ► Blood Pressure: {v['systolic_bp']:.0f}/{v['diastolic_bp']:.0f} mmHg")
        print(f"   ► Lead Impedance: {v['lead_impedance']:.1f} Ω")
        print(f"   ► Pacing Rate   : {v['pacing_rate']:.1f} ppm")
        print(f"   ► Battery       : {v['battery']:.1f} %")
        print(f"   ► HMAC-SHA256   : {payload['signature']}")
        print("=" * 73 + "\n")
    else:
        print("\n📡 Streaming continuous live telemetry (Press Ctrl+C to stop)...\n")
        try:
            while True:
                sim.update_all()
                payload = sim.get_payload(patient_id, f"icu_monitor_{patient_id}")
                v = payload["vitals"]
                print(f"[{time.strftime('%H:%M:%S')}] HR: {v['heart_rate']:.1f} bpm | SpO2: {v['spo2']:.1f}% | BP: {v['systolic_bp']:.0f}/{v['diastolic_bp']:.0f} mmHg | Temp: {v['body_temperature']:.1f}°C | Infusion: {v['infusion_rate']:.1f} mL/h | Mode: {sim_patient.attack_mode}")
                time.sleep(1.0)
        except KeyboardInterrupt:
            print("\nStopped live stream.\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TRINETRA Patient Inspector CLI")
    parser.add_argument("patient_id", nargs="?", default=None, help="Patient ID to inspect (e.g., PAT-6998, patient_101)")
    parser.add_argument("--live", "-l", action="store_true", help="Stream continuous real-time telemetry for this patient")
    args = parser.parse_args()

    if not args.patient_id:
        list_all_patients()
    else:
        inspect_patient(args.patient_id, live=args.live)
