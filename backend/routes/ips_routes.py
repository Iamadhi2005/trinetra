from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import IPSRule, AuditLog
from backend.auth import get_current_user, require_role

router = APIRouter(prefix="/api/ips/rules", tags=["IPS Rules"])

@router.get("")
def get_ips_rules(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(IPSRule).all()

@router.post("/{rule_id}/toggle")
def toggle_rule(
    rule_id: int,
    enabled: bool = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin", "Operator"]))
):
    rule = db.query(IPSRule).filter(IPSRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="IPS Rule not found")
        
    rule.enabled = enabled
    
    audit = AuditLog(
        username=current_user.username,
        action="IPS_RULE_TOGGLE",
        target=f"Rule #{rule_id} ({rule.name}) -> {enabled}",
        severity="Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()
    return {"message": f"Rule '{rule.name}' set to {'Enabled' if enabled else 'Disabled'}"}

@router.post("/{rule_id}/threshold")
def update_threshold(
    rule_id: int,
    threshold: float = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin", "Operator"]))
):
    rule = db.query(IPSRule).filter(IPSRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="IPS Rule not found")
        
    old_threshold = rule.threshold
    rule.threshold = threshold
    
    audit = AuditLog(
        username=current_user.username,
        action="IPS_RULE_THRESHOLD_UPDATE",
        target=f"Rule #{rule_id} ({rule.name}): {old_threshold} -> {threshold}",
        severity="Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()
    return {"message": f"Rule '{rule.name}' threshold updated to {threshold}"}
