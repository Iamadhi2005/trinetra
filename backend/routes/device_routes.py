from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Device, AuditLog
from backend.schemas import DeviceResponse
from backend.auth import get_current_user, require_role
from backend.simulator_service import global_simulator_service

router = APIRouter(prefix="/api/devices", tags=["Devices"])

@router.get("", response_model=List[DeviceResponse])
def list_devices(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Device).all()

@router.post("/action")
def device_action(
    device_id: str = Body(...),
    action: str = Body(...), # disconnect, reconnect, update_firmware
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin", "Operator", "Doctor", "Nurse"]))
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
        
    p_id = device.patient_id
    if action == "disconnect":
        device.status = "Fault"
        if p_id and p_id in global_simulator_service.simulator.patients:
            global_simulator_service.simulator.set_attack_mode(p_id, "Fault", ips_disabled=False)
    elif action == "reconnect":
        device.status = "Online"
        if p_id and p_id in global_simulator_service.simulator.patients:
            global_simulator_service.simulator.set_attack_mode(p_id, "Normal", ips_disabled=False)
    elif action == "update_firmware":
        device.firmware_version = "v2.5.0-SECURED"
        
    audit = AuditLog(
        username=current_user.username,
        action=f"DEVICE_{action.upper()}",
        target=device_id,
        severity="Info",
        result="Success"
    )
    db.add(audit)
    db.commit()
    return {"message": f"Action '{action}' executed on device {device_id}"}
