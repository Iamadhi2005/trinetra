from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Alert, AuditLog
from backend.schemas import AlertResponse
from backend.auth import get_current_user, require_role

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).all()
    results = []
    for a in alerts:
        dev_name = a.device.name if a.device else (f"Device {a.device_id}" if a.device_id else "System")
        dev_type = a.device.type if a.device else "Medical Device"
        pat_name = a.patient.name if a.patient else (f"Patient {a.patient_id}" if a.patient_id else "N/A")
        results.append(AlertResponse(
            id=a.id,
            timestamp=a.timestamp,
            device_id=a.device_id,
            device_name=dev_name,
            device_type=dev_type,
            patient_id=a.patient_id,
            patient_name=pat_name,
            severity=a.severity,
            message=a.message,
            status=a.status,
            resolution_notes=a.resolution_notes
        ))
    return results


@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    notes: str = Body("", embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin", "Doctor", "Nurse"]))
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.status = "Resolved"
    alert.resolution_notes = notes
    
    audit = AuditLog(
        username=current_user.username,
        action="ALERT_RESOLVE",
        target=f"Alert #{alert_id}",
        severity="Info",
        result="Success"
    )
    db.add(audit)
    db.commit()
    return {"message": f"Alert #{alert_id} resolved"}
