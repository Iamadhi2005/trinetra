import time
import os
import json
import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.models import Patient, Device, User
from backend.simulator_service import global_simulator_service
from backend.routes.patient_routes import create_patient, delete_patient, get_patient_vitals
from backend.main import generate_pqrst_ecg_point, generate_spo2_pleth_point

def run_test():
    print("=== STARTING PATIENT SIMULATOR & TELEMETRY VERIFICATION ===")
    db: Session = SessionLocal()
    
    # 1. Prepare Mock User
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(username="admin", name="Admin", role="Admin", password_hash="dummy")
        db.add(admin_user)
        db.commit()

    test_name = "Test Simulation Patient"
    test_adm_date = "2026-09-06T10:30:00"
    test_base_hr = 82.0
    test_base_spo2 = 97.4
    
    print(f"\n[Step 1] Creating Patient with Admission Date: {test_adm_date}, Base HR: {test_base_hr}, Base SpO2: {test_base_spo2}...")
    patient_res = create_patient(
        name=test_name,
        age=50,
        gender="Female",
        blood_group="B+",
        phone="+1-555-9999",
        guardian_name="Guardian Smith",
        guardian_phone="+1-555-8888",
        ward_number="ICU-B",
        bed_number="Bed-09",
        doctor_assigned="Dr. Arjun",
        admission_date=test_adm_date,
        base_heart_rate=test_base_hr,
        base_spo2=test_base_spo2,
        devices="ICU Monitor, ECG Monitor, Pulse Oximeter",
        photo=None,
        db=db,
        current_user=admin_user
    )
    
    p_id = patient_res.id
    print(f"-> Created Patient ID: {p_id}, Name: {patient_res.name}, Admission Date: {patient_res.admission_date}")
    
    # Verify admission date parsed
    assert patient_res.admission_date is not None, "Admission date must not be None"
    assert "2026-09-06" in str(patient_res.admission_date), "Admission date year-month-day must match"
    
    # 2. Check Telemetry File Creation
    telemetry_file = f"data/telemetry_{p_id}.json"
    print(f"\n[Step 2] Checking telemetry file creation at: {telemetry_file}...")
    assert os.path.exists(telemetry_file), f"Telemetry file {telemetry_file} was not created!"
    
    with open(telemetry_file, "r") as f:
        tdata = json.load(f)
        
    print(f"-> Telemetry File Content Initial: {json.dumps(tdata, indent=2)}")
    assert tdata["patient_id"] == p_id
    assert tdata["patient_name"] == test_name
    assert tdata["base_heart_rate"] == test_base_hr
    assert tdata["base_spo2"] == test_base_spo2
    assert tdata["ward_number"] == "ICU-B"
    assert tdata["bed_number"] == "Bed-09"
    assert tdata["doctor"] == "Dr. Arjun"
    initial_timestamp = tdata.get("last_updated")
    
    # 3. Simulate Ticks to Verify Continuous Execution
    print(f"\n[Step 3] Running simulator ticks to verify continuous background telemetry execution...")
    time.sleep(1.1)
    global_simulator_service.tick()
    
    with open(telemetry_file, "r") as f:
        tdata_after_tick = json.load(f)
        
    print(f"-> Telemetry File Content After Tick 1:")
    print(f"   HR: {tdata_after_tick.get('heart_rate')} | SpO2: {tdata_after_tick.get('spo2')} | BP: {tdata_after_tick.get('blood_pressure')} | Resp: {tdata_after_tick.get('respiration_rate')}")
    print(f"   Updated At: {tdata_after_tick.get('last_updated')} vs Initial: {initial_timestamp}")
    
    assert tdata_after_tick.get("last_updated") > initial_timestamp, "Telemetry file last_updated must increase on simulator tick!"
    
    time.sleep(1.1)
    global_simulator_service.tick()
    with open(telemetry_file, "r") as f:
        tdata_after_tick2 = json.load(f)
    print(f"-> Telemetry File Content After Tick 2:")
    print(f"   HR: {tdata_after_tick2.get('heart_rate')} | SpO2: {tdata_after_tick2.get('spo2')} | BP: {tdata_after_tick2.get('blood_pressure')}")
    assert tdata_after_tick2.get("last_updated") > tdata_after_tick.get("last_updated"), "Telemetry file must update on each tick!"
    
    # 4. Check get_patient_vitals endpoint
    print(f"\n[Step 4] Checking get_patient_vitals API response...")
    vitals_resp = get_patient_vitals(p_id, db)
    print(f"-> Vitals API Response: {json.dumps(vitals_resp, indent=2)}")
    assert vitals_resp["admission_date"] is not None
    assert vitals_resp["telemetry_file"] == telemetry_file
    assert vitals_resp["heart_rate"] > 0
    
    # 5. Check ECG & SpO2 Waveform Generation
    print(f"\n[Step 5] Checking ECG & SpO2 wave point calculations at 50Hz...")
    for t_ms in [0, 100, 200, 250, 300, 400, 500]:
        ecg_val = generate_pqrst_ecg_point(t_ms, int(vitals_resp["heart_rate"]))
        pleth_val = generate_spo2_pleth_point(t_ms, int(vitals_resp["heart_rate"]))
        print(f"   t={t_ms}ms -> ECG: {ecg_val:+.3f} mV, Pleth: {pleth_val:.3f}")
        assert -1.0 <= ecg_val <= 3.0, f"ECG point out of expected voltage bounds: {ecg_val}"
        assert 0.0 <= pleth_val <= 1.0, f"Pleth point out of expected bounds: {pleth_val}"
        
    # 6. Delete Patient & Verify Cleanup
    print(f"\n[Step 6] Cleaning up test patient...")
    del_res = delete_patient(p_id, db, admin_user)
    print(f"-> {del_res}")
    assert not os.path.exists(telemetry_file), "Telemetry file should be deleted on patient removal"
    
    db.close()
    print("\n=== ALL TEST CHECKS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_test()
