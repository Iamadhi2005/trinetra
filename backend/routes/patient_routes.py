from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from backend.database import get_db, SessionLocal
from backend.models import Patient, Device, AuditLog
from backend.schemas import PatientResponse, PatientCreate
from backend.auth import get_current_user, require_role
from backend.simulator_service import global_simulator_service
import os
import shutil
import random
import time
import datetime

router = APIRouter(prefix="/api/patients", tags=["Patients"])

def restore_patient_if_needed(patient_id: str, db: Session):
    """Gracefully restores or syncs patient record from telemetry config or legacy DB."""
    telemetry_file = f"data/telemetry_{patient_id}.json"
    if os.path.exists(telemetry_file):
        try:
            import json
            with open(telemetry_file, "r") as f:
                tdata = json.load(f)
            p = Patient(
                id=patient_id,
                name=tdata.get("patient_name", f"Patient {patient_id}"),
                age=45,
                status="Normal",
                ward_number=tdata.get("ward_number", "ICU-A"),
                bed_number=tdata.get("bed_number", "Bed-01"),
                doctor_assigned=tdata.get("doctor", "Dr. Radhi"),
                is_calibrated=True,
                calibration_progress=100
            )
            db.add(p)
            db.commit()
            db.refresh(p)
            return p
        except Exception:
            pass
    if os.path.exists("data/audit_log.db"):
        try:
            import sqlite3
            conn = sqlite3.connect("data/audit_log.db")
            c = conn.cursor()
            c.execute("SELECT patient_id, name, phone, guardian_name, guardian_phone, devices_list, photo_path FROM patients WHERE patient_id = ?", (patient_id,))
            row = c.fetchone()
            conn.close()
            if row:
                p = Patient(
                    id=row[0],
                    name=row[1],
                    phone=row[2],
                    guardian_name=row[3],
                    guardian_phone=row[4],
                    photo_path=row[6] if len(row) > 6 else "",
                    is_calibrated=True,
                    calibration_progress=100
                )
                db.add(p)
                db.commit()
                db.refresh(p)
                return p
        except Exception:
            pass
    return None

def run_calibration_task(patient_id: str, db_session_factory, instant: bool = False):
    db = db_session_factory()
    try:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            patient = restore_patient_if_needed(patient_id, db)
            if not patient:
                return
            
        telemetry_file = f"data/telemetry_{patient_id}.json"
        base_hr = 76.0
        base_spo2 = 98.0
        adm_date = patient.admission_date.isoformat() if patient.admission_date else datetime.datetime.utcnow().isoformat()
        if os.path.exists(telemetry_file):
            try:
                import json
                with open(telemetry_file, "r") as f:
                    old_t = json.load(f)
                    base_hr = old_t.get("base_heart_rate", base_hr)
                    base_spo2 = old_t.get("base_spo2", base_spo2)
                    adm_date = old_t.get("admission_date", adm_date)
            except Exception:
                pass

        # Step 0: Ensure is_calibrated is False while calibrating
        patient.is_calibrated = False
        patient.calibration_progress = 0
        db.commit()

        # Step 1-4: Advance calibration progress (is_calibrated remains False)
        step_delay = 0.0 if instant else 0.35
        for progress in [20, 40, 60, 80]:
            patient.calibration_progress = progress
            patient.is_calibrated = False
            db.commit()
            if step_delay > 0:
                time.sleep(step_delay)

        # Step 5: Mark as 100% Calibrated & Live
        patient.is_calibrated = True
        patient.calibration_progress = 100
        
        # Ensure devices for patient are marked Online
        devices = db.query(Device).filter(Device.patient_id == patient_id).all()
        for d in devices:
            d.status = "Online"
            
        db.commit()

        # Write dedicated personal telemetry configuration file with full vital parameters
        os.makedirs("data", exist_ok=True)
        telemetry_data = {
            "patient_id": patient_id,
            "patient_name": patient.name,
            "admission_date": adm_date,
            "calibrated_at": time.time(),
            "status": "Online",
            "ward_number": patient.ward_number,
            "bed_number": patient.bed_number,
            "doctor": patient.doctor_assigned,
            "base_heart_rate": base_hr,
            "base_spo2": base_spo2,
            "heart_rate": base_hr,
            "spo2": base_spo2,
            "blood_pressure": "120/80",
            "systolic_bp": 120.0,
            "diastolic_bp": 80.0,
            "respiration_rate": 16.0,
            "temperature": 37.0,
            "infusion_rate": 5.0,
            "battery": 100.0,
            "pump_status": "Pumping Normal",
            "lead_impedance": 500.0,
            "pacing_rate": 70.0,
            "last_updated": time.time()
        }
        with open(telemetry_file, "w") as f:
            import json
            json.dump(telemetry_data, f, indent=2)

        global_simulator_service.simulator.reload_patients()
        global_simulator_service.simulator.get_or_create_patient(patient_id)
    except Exception as e:
        print(f"Error in calibration task: {e}")
    finally:
        db.close()

@router.get("", response_model=List[PatientResponse])
def list_patients(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Patient).all()

@router.post("", response_model=PatientResponse)
def create_patient(
    name: str = Form(...),
    age: int = Form(45),
    gender: str = Form("Male"),
    blood_group: str = Form("O+"),
    phone: str = Form(""),
    guardian_name: str = Form(""),
    guardian_phone: str = Form(""),
    ward_number: str = Form("ICU-A"),
    bed_number: str = Form("Bed-01"),
    doctor_assigned: str = Form("Dr. Radhi"),
    admission_date: Optional[str] = Form(None),
    base_heart_rate: Optional[float] = Form(None),
    base_spo2: Optional[float] = Form(None),
    devices: str = Form(""), # comma separated
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin", "Doctor", "Nurse"]))
):
    # Auto-generate Patient ID: PAT-XXXX
    patient_id = ""
    while True:
        rand_num = random.randint(1000, 9999)
        patient_id = f"PAT-{rand_num}"
        existing = db.query(Patient).filter(Patient.id == patient_id).first()
        if not existing:
            break

    photo_path = ""
    if photo:
        os.makedirs("data/photos", exist_ok=True)
        photo_path = f"data/photos/{patient_id}.png"
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

    # Parse admission date
    parsed_adm_date = datetime.datetime.utcnow()
    if admission_date:
        try:
            clean_date = admission_date.replace("Z", "+00:00")
            parsed_adm_date = datetime.datetime.fromisoformat(clean_date)
        except Exception:
            try:
                parsed_adm_date = datetime.datetime.strptime(admission_date[:19], "%Y-%m-%dT%H:%M:%S")
            except Exception:
                try:
                    parsed_adm_date = datetime.datetime.strptime(admission_date[:16], "%Y-%m-%dT%H:%M")
                except Exception:
                    pass

    # Baseline physiological values
    seed_val = sum(ord(c) for c in name) + age
    r = random.Random(seed_val)
    if base_heart_rate is not None and base_heart_rate > 0:
        base_hr = float(base_heart_rate)
    else:
        base_hr = float(r.randint(68, 84))

    if base_spo2 is not None and base_spo2 > 0:
        base_spo2 = round(float(base_spo2), 1)
    else:
        base_spo2 = round(r.uniform(96.8, 99.4), 1)
            
    # Auto-generate personal telemetry configuration file tied to patient name
    os.makedirs("data", exist_ok=True)
    telemetry_file = f"data/telemetry_{patient_id}.json"
    telemetry_data = {
        "patient_id": patient_id,
        "patient_name": name,
        "admission_date": parsed_adm_date.isoformat(),
        "calibrated_at": time.time(),
        "status": "Online",
        "ward_number": ward_number,
        "bed_number": bed_number,
        "doctor": doctor_assigned,
        "base_heart_rate": base_hr,
        "base_spo2": base_spo2,
        "heart_rate": base_hr,
        "spo2": base_spo2,
        "blood_pressure": "120/80",
        "systolic_bp": 120.0,
        "diastolic_bp": 80.0,
        "respiration_rate": 16.0,
        "temperature": 37.0,
        "infusion_rate": 5.0,
        "battery": 100.0,
        "pump_status": "Pumping Normal",
        "last_updated": time.time()
    }
    try:
        import json
        with open(telemetry_file, "w") as f:
            json.dump(telemetry_data, f, indent=2)
    except Exception:
        pass

    new_patient = Patient(
        id=patient_id,
        name=name,
        age=age,
        phone=phone,
        guardian_name=guardian_name,
        guardian_phone=guardian_phone,
        photo_path=photo_path,
        status="Normal",
        gender=gender,
        blood_group=blood_group,
        ward_number=ward_number,
        bed_number=bed_number,
        doctor_assigned=doctor_assigned,
        admission_date=parsed_adm_date,
        is_calibrated=True,
        calibration_progress=100
    )
    db.add(new_patient)
    
    # Add devices
    dev_types = [d.strip() for d in devices.split(",") if d.strip()]
    if not dev_types:
        dev_types = ["ICU Monitor", "ECG Monitor", "Pulse Oximeter", "Infusion Pump"]
    if not any("icu" in d.lower() for d in dev_types):
        dev_types.insert(0, "ICU Monitor")

    for d_type in dev_types:
        dev_id = f"{d_type.lower().replace(' ', '_')}_{patient_id}"
        new_dev = Device(
            id=dev_id,
            name=f"{d_type} - {name}",
            type=d_type,
            patient_id=patient_id,
            status="Online"
        )
        db.add(new_dev)
        
    audit = AuditLog(
        username=current_user.username,
        action="PATIENT_REGISTER",
        target=patient_id,
        severity="Info",
        result="Success"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_patient)
    
    # Sync to legacy DB and reload simulator
    try:
        from src.utils import add_patient_to_db
        add_patient_to_db(
            patient_id=patient_id,
            name=name,
            phone=phone,
            guardian_name=guardian_name,
            guardian_phone=guardian_phone,
            devices_list=dev_types,
            photo_path=photo_path
        )
    except Exception:
        pass

    global_simulator_service.simulator.reload_patients()
    global_simulator_service.simulator.get_or_create_patient(patient_id)
    
    return new_patient

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient_by_id(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        patient = restore_patient_if_needed(patient_id, db)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.delete("/{patient_id}")
def delete_patient(patient_id: str, db: Session = Depends(get_db), current_user = Depends(require_role(["Admin", "Doctor"]))):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    db.delete(patient)
    
    audit = AuditLog(
        username=current_user.username,
        action="PATIENT_DELETE",
        target=patient_id,
        severity="Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()

    # Remove telemetry file if present
    telemetry_file = f"data/telemetry_{patient_id}.json"
    if os.path.exists(telemetry_file):
        try:
            os.remove(telemetry_file)
        except Exception:
            pass

    global_simulator_service.simulator.reload_patients()
    return {"message": f"Patient {patient_id} deleted successfully"}

@router.post("/{patient_id}/calibrate")
def calibrate_patient(
    patient_id: str,
    background_tasks: BackgroundTasks,
    instant: bool = False,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        patient = restore_patient_if_needed(patient_id, db)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
    patient.is_calibrated = False
    patient.calibration_progress = 0
    db.commit()
    
    if instant:
        run_calibration_task(patient_id, SessionLocal, instant=True)
    else:
        background_tasks.add_task(run_calibration_task, patient_id, SessionLocal, instant=False)

    return {
        "message": "Calibration started",
        "patient_id": patient_id,
        "status": "Calibrating",
        "telemetry_file": f"data/telemetry_{patient_id}.json"
    }

@router.get("/{patient_id}/vitals")
def get_patient_vitals(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        patient = restore_patient_if_needed(patient_id, db)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
    p_dev = global_simulator_service.simulator.get_or_create_patient(patient_id)
    
    systolic = int(getattr(p_dev, "systolic_bp", 115))
    diastolic = int(getattr(p_dev, "diastolic_bp", 75))
    bp = f"{systolic}/{diastolic}"

    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "ward_number": patient.ward_number,
        "bed_number": patient.bed_number,
        "doctor_assigned": patient.doctor_assigned,
        "admission_date": patient.admission_date.isoformat() if patient.admission_date else None,
        "telemetry_file": f"data/telemetry_{patient_id}.json",
        "photo_path": patient.photo_path,
        "patient_id": patient_id,
        "is_calibrated": patient.is_calibrated,
        "calibration_progress": patient.calibration_progress,
        "heart_rate": int(round(p_dev.heart_rate)),
        "spo2": round(p_dev.spo2, 1),
        "blood_pressure": bp,
        "temperature": round(getattr(p_dev, "temperature", 36.8), 1),
        "respiration_rate": int(getattr(p_dev, "respiration_rate", 16)),
        "lead_impedance": round(p_dev.lead_impedance, 1),
        "infusion_rate": round(p_dev.infusion_rate, 1),
        "infusion_level": round(p_dev.infusion_rate, 1),
        "battery": int(p_dev.battery),
        "pump_status": p_dev.pump_status
    }
