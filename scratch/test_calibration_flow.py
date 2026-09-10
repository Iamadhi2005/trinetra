import time
import os
import json
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Patient, Device, User
from backend.simulator_service import global_simulator_service
from backend.routes.patient_routes import (
    create_patient,
    delete_patient,
    get_patient_vitals,
    run_calibration_task,
    restore_patient_if_needed
)
from backend.main import generate_pqrst_ecg_point, generate_spo2_pleth_point

def run_calibration_verification():
    print("==================================================================")
    print("   TESTING PATIENT TELEMETRY CALIBRATION & STREAMING WORKFLOW    ")
    print("==================================================================")
    
    db: Session = SessionLocal()
    test_p_id = "PAT-CALIB-TEST"
    test_name = "Calibration Validation Subject"
    telemetry_file = f"data/telemetry_{test_p_id}.json"

    try:
        # Cleanup any existing test residue
        if os.path.exists(telemetry_file):
            os.remove(telemetry_file)
        existing_p = db.query(Patient).filter(Patient.id == test_p_id).first()
        if existing_p:
            db.delete(existing_p)
            db.commit()

        # Step 1: Create an Uncalibrated Patient
        print("\n[Step 1] Creating uncalibrated patient in database...")
        uncalib_patient = Patient(
            id=test_p_id,
            name=test_name,
            age=48,
            ward_number="ICU-C",
            bed_number="Bed-04",
            doctor_assigned="Dr. Radhi",
            is_calibrated=False,
            calibration_progress=0
        )
        db.add(uncalib_patient)
        
        # Add ICU monitor device
        db.add(Device(
            id=f"icu_monitor_{test_p_id}",
            name=f"ICU Monitor - {test_name}",
            type="ICU Monitor",
            patient_id=test_p_id,
            status="Standby"
        ))
        db.commit()
        print(f"[OK] Patient created: {test_p_id}, is_calibrated: {uncalib_patient.is_calibrated}, progress: {uncalib_patient.calibration_progress}")
        assert uncalib_patient.is_calibrated == False, "Patient must start uncalibrated"
        assert uncalib_patient.calibration_progress == 0, "Progress must start at 0"

        # Step 2: Query vitals endpoint before calibration
        print("\n[Step 2] Querying /patients/{id}/vitals before calibration...")
        vitals_before = get_patient_vitals(test_p_id, db)
        print(f"[OK] Vitals response: is_calibrated={vitals_before['is_calibrated']}, progress={vitals_before['calibration_progress']}")
        assert vitals_before["is_calibrated"] == False, "Vitals API must report uncalibrated"
        assert vitals_before["calibration_progress"] == 0

        # Step 3: Trigger Calibration Task (Timed progression)
        print("\n[Step 3] Running calibration task with step progression...")
        run_calibration_task(test_p_id, SessionLocal, instant=False)
        
        # Step 4: Verify Database State After Calibration
        db.refresh(uncalib_patient)
        print(f"\n[Step 4] Checking database state after calibration completed...")
        print(f"[OK] Patient {test_p_id}: is_calibrated={uncalib_patient.is_calibrated}, progress={uncalib_patient.calibration_progress}%")
        assert uncalib_patient.is_calibrated == True, "Patient must be calibrated after task"
        assert uncalib_patient.calibration_progress == 100, "Progress must be 100%"

        # Check device status
        dev = db.query(Device).filter(Device.id == f"icu_monitor_{test_p_id}").first()
        print(f"[OK] Device status: {dev.status}")
        assert dev.status == "Online", "Device should be marked Online"

        # Step 5: Verify Generated Telemetry Configuration File
        print(f"\n[Step 5] Checking generated telemetry configuration file: {telemetry_file}...")
        assert os.path.exists(telemetry_file), f"Telemetry file {telemetry_file} must exist!"
        with open(telemetry_file, "r") as f:
            tdata = json.load(f)
        print(f"[OK] Configuration content:")
        print(f"   Patient ID: {tdata.get('patient_id')}")
        print(f"   Patient Name: {tdata.get('patient_name')}")
        print(f"   Base Heart Rate: {tdata.get('base_heart_rate')} bpm")
        print(f"   Base SpO2: {tdata.get('base_spo2')}%")
        print(f"   Status: {tdata.get('status')}")
        print(f"   Ward/Bed: Ward {tdata.get('ward_number')} / {tdata.get('bed_number')}")
        print(f"   Blood Pressure: {tdata.get('blood_pressure')}")
        print(f"   Calibrated At: {tdata.get('calibrated_at')}")

        assert tdata["patient_id"] == test_p_id
        assert tdata["status"] == "Online"
        assert tdata["base_heart_rate"] > 0
        assert tdata["base_spo2"] > 0

        # Step 6: Verify Vitals API after Calibration
        print("\n[Step 6] Querying /patients/{id}/vitals after calibration...")
        vitals_after = get_patient_vitals(test_p_id, db)
        print(f"[OK] Vitals response:")
        print(f"   is_calibrated: {vitals_after['is_calibrated']}")
        print(f"   calibration_progress: {vitals_after['calibration_progress']}%")
        print(f"   heart_rate: {vitals_after['heart_rate']} bpm")
        print(f"   spo2: {vitals_after['spo2']}%")
        print(f"   blood_pressure: {vitals_after['blood_pressure']}")
        print(f"   temperature: {vitals_after['temperature']} °C")
        assert vitals_after["is_calibrated"] == True
        assert vitals_after["calibration_progress"] == 100
        assert vitals_after["heart_rate"] > 0

        # Step 7: Verify Live Waveform Points Generation
        print("\n[Step 7] Generating live 50Hz ECG & SpO2 waveform points...")
        for t in [0, 50, 100, 150, 200, 250, 300]:
            ecg = generate_pqrst_ecg_point(t, vitals_after["heart_rate"])
            pleth = generate_spo2_pleth_point(t, vitals_after["heart_rate"])
            print(f"   t={t}ms -> ECG Voltage: {ecg:+.3f} mV | SpO2 Pleth: {pleth:.3f}")
            assert -1.0 <= ecg <= 3.0
            assert 0.0 <= pleth <= 1.0

        print("\n==================================================================")
        print("   [OK] ALL CALIBRATION & LIVE STREAMING VERIFICATIONS PASSED!    ")
        print("==================================================================")

    finally:
        # Cleanup
        if os.path.exists(telemetry_file):
            try:
                os.remove(telemetry_file)
            except Exception:
                pass
        p = db.query(Patient).filter(Patient.id == test_p_id).first()
        if p:
            db.delete(p)
            db.commit()
        db.close()

if __name__ == "__main__":
    run_calibration_verification()
