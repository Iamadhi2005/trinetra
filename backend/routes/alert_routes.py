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
    return db.query(Alert).order_by(Alert.timestamp.desc()).all()

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
