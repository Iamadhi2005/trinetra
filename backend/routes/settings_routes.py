from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Setting, AuditLog
from backend.auth import get_current_user, require_role

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
def get_settings(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    settings_db = db.query(Setting).all()
    res = {}
    for s in settings_db:
        res[s.key] = s.value
    # Defaults if missing
    if "hmac_key" not in res:
        res["hmac_key"] = "hospital_secure_key_2026"
    if "cusum_threshold" not in res:
        res["cusum_threshold"] = "6.0"
    if "contamination_rate" not in res:
        res["contamination_rate"] = "0.03"
    return res

@router.post("")
def save_settings(
    settings_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin"]))
):
    for key, val in settings_data.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        if existing:
            existing.value = str(val)
        else:
            db.add(Setting(key=key, value=str(val)))
            
    audit = AuditLog(
        username=current_user.username,
        action="SETTINGS_UPDATE",
        target="SYSTEM_CONFIG",
        severity="Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()
    return {"message": "Settings updated successfully"}
