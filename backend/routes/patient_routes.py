from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Patient, Device
from backend.schemas import PatientResponse, PatientCreate
from backend.auth import get_current_user, require_role
from backend.simulator_service import global_simulator_service
import os
import shutil

router = APIRouter(prefix="/api/patients", tags=["Patients"])

@router.get("", response_model=List[PatientResponse])
def list_patients(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Patient).all()

@router.post("", response_model=PatientResponse)
def create_patient(
    patient_id: str = Form(...),
    name: str = Form(...),
    age: int = Form(45),
    phone: str = Form(""),
    guardian_name: str = Form(""),
    guardian_phone: str = Form(""),
    devices: str = Form(""), # comma separated
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin", "Doctor", "Nurse"]))
):
    existing = db.query(Patient).filter(Patient.id == patient_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Patient ID '{patient_id}' already exists.")
        
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
        status="Normal"
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
    db.commit()
    global_simulator_service.simulator.reload_patients()
    return {"message": f"Patient {patient_id} deleted successfully"}

@router.get("/{patient_id}/vitals")
def get_patient_vitals(patient_id: str):
    if patient_id not in global_simulator_service.simulator.patients:
        raise HTTPException(status_code=404, detail="Patient simulator state not found")
        
    p_dev = global_simulator_service.simulator.patients[patient_id]
    return {
        "patient_id": patient_id,
        "heart_rate": p_dev.heart_rate,
        "spo2": p_dev.spo2,
        "lead_impedance": p_dev.lead_impedance,
        "infusion_rate": p_dev.infusion_rate,
        "battery": p_dev.battery,
        "pump_status": p_dev.pump_status
    }
