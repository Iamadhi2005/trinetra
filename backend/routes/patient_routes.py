from typing import List
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

def run_calibration_task(patient_id: str, db_session_factory):
    db = db_session_factory()
    try:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return
        patient.is_calibrated = False
        for progress in range(0, 101, 20):
            patient.calibration_progress = progress
            db.commit()
            time.sleep(1.0)
        patient.is_calibrated = True
        patient.calibration_progress = 100
        db.commit()

        # Write dedicated personal telemetry configuration file
        os.makedirs("data", exist_ok=True)
        telemetry_file = f"data/telemetry_{patient_id}.json"
        telemetry_data = {
            "patient_id": patient_id,
            "patient_name": patient.name,
            "calibrated_at": time.time(),
            "status": "Calibrated & Live",
            "ward_number": patient.ward_number,
            "bed_number": patient.bed_number,
            "doctor": patient.doctor_assigned,
            "base_heart_rate": 72.0 if "102" in patient_id else 76.0,
            "base_spo2": 94.0 if "102" in patient_id else 98.0
        }
        with open(telemetry_file, "w") as f:
            import json
            json.dump(telemetry_data, f, indent=2)

        global_simulator_service.simulator.reload_patients()
    except Exception:
        pass
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
    doctor_assigned: str = Form("Dr. Sarah Connor"),
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
        is_calibrated=False,
        calibration_progress=0
    )
    db.add(new_patient)
    
    # Add devices
    dev_types = [d.strip() for d in devices.split(",") if d.strip()]
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
    
    # Reload simulator
    global_simulator_service.simulator.reload_patients()
    
    return new_patient

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
    global_simulator_service.simulator.reload_patients()
    return {"message": f"Patient {patient_id} deleted successfully"}

@router.post("/{patient_id}/calibrate")
def calibrate_patient(
    patient_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    patient.is_calibrated = False
    patient.calibration_progress = 0
    db.commit()
    
    background_tasks.add_task(run_calibration_task, patient_id, SessionLocal)
    return {"message": "Calibration started"}

@router.get("/{patient_id}/vitals")
def get_patient_vitals(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    if patient_id not in global_simulator_service.simulator.patients:
        raise HTTPException(status_code=404, detail="Patient simulator state not found")
        
    p_dev = global_simulator_service.simulator.patients[patient_id]
    return {
        "patient_id": patient_id,
        "is_calibrated": patient.is_calibrated,
        "calibration_progress": patient.calibration_progress,
        "heart_rate": p_dev.heart_rate,
        "spo2": p_dev.spo2,
        "lead_impedance": p_dev.lead_impedance,
        "infusion_rate": p_dev.infusion_rate,
        "battery": p_dev.battery,
        "pump_status": p_dev.pump_status
    }
