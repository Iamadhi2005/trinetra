from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import AuditLog
from backend.auth import get_current_user

router = APIRouter(prefix="/api/logs", tags=["Logs"])

@router.get("")
def get_logs(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(AuditLog)
    if search:
        query = query.filter(
            (AuditLog.username.ilike(f"%{search}%")) |
            (AuditLog.action.ilike(f"%{search}%")) |
            (AuditLog.target.ilike(f"%{search}%"))
        )
    if severity:
        query = query.filter(AuditLog.severity == severity)
        
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": logs
    }
