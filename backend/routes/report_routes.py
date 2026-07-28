from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SecurityEvent, AuditLog, Patient, Device, Alert
from backend.auth import get_current_user
import pandas as pd
import io

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/summary")
def get_report_summary(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    total_events = db.query(SecurityEvent).count()
    quarantined = db.query(SecurityEvent).filter(SecurityEvent.status == "Quarantine").count()
    blocked = db.query(SecurityEvent).filter(SecurityEvent.status == "Blocked").count()
    
    return {
        "total_events": total_events,
        "quarantined_events": quarantined,
        "blocked_events": blocked,
        "mitm_discarded": db.query(SecurityEvent).filter(SecurityEvent.attack_type == "MitM").count(),
        "dos_floods": db.query(SecurityEvent).filter(SecurityEvent.attack_type == "DoS").count()
    }

@router.get("/download/csv")
def download_csv_report(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    events = db.query(SecurityEvent).all()
    data = []
    for e in events:
        data.append({
            "ID": e.id,
            "Timestamp": e.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "Device ID": e.device_id,
            "Attack Type": e.attack_type,
            "Client IP": e.client_ip,
            "Status": e.status,
            "Action Taken": e.action_taken
        })
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    
    return Response(
        content=stream.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trinetra_security_report.csv"}
    )
