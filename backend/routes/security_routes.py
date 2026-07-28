from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SecurityEvent, QuarantineRecord, Alert, AuditLog
from backend.schemas import SecurityEventResponse
from backend.auth import get_current_user, require_role
from backend.simulator_service import global_simulator_service

router = APIRouter(prefix="/api/security", tags=["Security"])

@router.get("/events", response_model=List[SecurityEventResponse])
def get_security_events(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).all()

@router.get("/quarantine")
def get_quarantine_queue(current_user = Depends(get_current_user)):
    # Return active quarantine items from IDS engine
    items = []
    for dev_id, item in global_simulator_service.ids.quarantine_queue.items():
        items.append({
            "device_id": dev_id,
            "client_id": item["client_id"],
            "patient_id": item["payload"]["patient_id"],
            "reason": item["reason"],
            "timestamp": item["timestamp"]
        })
    return items

@router.post("/quarantine/action")
def quarantine_action(
    device_id: str = Body(...),
    action: str = Body(...), # override, hard_block, reset
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin", "Doctor", "Nurse"]))
):
    if action == "override":
        global_simulator_service.ids.action_override(device_id)
    elif action == "hard_block":
        global_simulator_service.ids.action_hard_block(device_id)
    elif action == "reset":
        global_simulator_service.ids.action_reset(device_id)
        
    audit = AuditLog(
        username=current_user.username,
        action=f"QUARANTINE_{action.upper()}",
        target=device_id,
        severity="Warning" if action == "override" else "Critical",
        result="Success"
    )
    db.add(audit)
    db.commit()
    return {"message": f"Quarantine action '{action}' executed for device {device_id}"}

@router.post("/attack")
def trigger_attack(
    attack_mode: str = Body(..., embed=True),
    target_patient: str = Body(..., embed=True)
):
    import json
    import os
    state_file = "data/attack_state.json"
    os.makedirs("data", exist_ok=True)
    with open(state_file, "w") as f:
        json.dump({"attack_mode": attack_mode, "target_patient": target_patient}, f)
    return {"message": f"Attack state set to {attack_mode} targeting {target_patient}"}
