from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Device, Patient, Alert, SecurityEvent
from backend.schemas import DashboardMetrics, ActiveAttackInfo, AlertResponse
from backend.auth import get_current_user
from backend.simulator_service import global_simulator_service
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

    # Query active attack state
    attack_mode, target_patient = global_simulator_service.get_attack_state()
    active_attack_dict = None
    if attack_mode != "Normal":
        attack_info = global_simulator_service.get_attack_details(attack_mode, target_patient)
        active_attack_dict = ActiveAttackInfo(**attack_info)

    # Fetch recent unresolved alerts with resolved names
    alerts_query = db.query(Alert).filter(Alert.status == "Unresolved").order_by(Alert.timestamp.desc()).limit(10).all()
    recent_alerts = []
    for a in alerts_query:
        dev_name = a.device.name if a.device else (f"Device {a.device_id}" if a.device_id else "System")
        dev_type = a.device.type if a.device else "Medical Device"
        pat_name = a.patient.name if a.patient else (f"Patient {a.patient_id}" if a.patient_id else "N/A")
        recent_alerts.append(AlertResponse(
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
    
    return {
        "active_devices": active_devices,
        "patients_count": patients_count,
        "active_alerts_count": active_alerts_count,
        "attacks_today": attacks_today,
        "threat_level": threat_level,
        "network_health": network_health,
        "uptime": "18h 42m",
        "active_attack": active_attack_dict,
        "recent_alerts": recent_alerts
    }

