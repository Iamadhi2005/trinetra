from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Device, Patient, Alert, SecurityEvent
from backend.schemas import DashboardMetrics
from backend.auth import get_current_user
import datetime

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardMetrics)
def get_dashboard_metrics(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    active_devices = db.query(Device).filter(Device.status != "Offline").count()
    patients_count = db.query(Patient).count()
    active_alerts_count = db.query(Alert).filter(Alert.status == "Unresolved").count()
    
    today = datetime.datetime.utcnow().date()
    attacks_today = db.query(SecurityEvent).filter(SecurityEvent.timestamp >= today).count()
    
    threat_level = "HIGH" if active_alerts_count > 0 else "LOW"
    network_health = "Warning" if active_alerts_count > 0 else "Excellent"
    
    return {
        "active_devices": active_devices,
        "patients_count": patients_count,
        "active_alerts_count": active_alerts_count,
        "attacks_today": attacks_today,
        "threat_level": threat_level,
        "network_health": network_health,
        "uptime": "18h 42m"
    }
