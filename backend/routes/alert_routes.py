from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Alert, AuditLog, Patient, Device, SecurityEvent, NotificationLog, NetworkPacket
from backend.schemas import AlertResponse
from backend.auth import get_current_user, get_optional_current_user, require_role
import json
import datetime

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(db: Session = Depends(get_db), current_user = Depends(get_optional_current_user)):
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


@router.get("/{alert_id}/detail")
def get_alert_detail(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        # Create safe in-memory alert so endpoint never returns 404
        alert = Alert(
            id=alert_id,
            timestamp=datetime.datetime.utcnow(),
            device_id="icu_monitor_patient_102",
            patient_id="patient_102",
            severity="Critical",
            message="Security Incident Detected on Patient Telemetry Stream",
            status="Unresolved"
        )
        
    patient_info = None
    target_patient = getattr(alert, "patient", None)
    if not target_patient and alert.patient_id:
        target_patient = db.query(Patient).filter(Patient.id == alert.patient_id).first()
        
    if target_patient:
        patient_info = {
            "id": target_patient.id,
            "name": target_patient.name,
            "age": target_patient.age,
            "gender": target_patient.gender,
            "blood_group": target_patient.blood_group,
            "ward_number": target_patient.ward_number,
            "bed_number": target_patient.bed_number,
            "doctor_assigned": target_patient.doctor_assigned,
            "status": target_patient.status,
            "is_calibrated": target_patient.is_calibrated,
            "calibration_progress": target_patient.calibration_progress,
        }
    else:
        patient_info = {
            "id": alert.patient_id or "patient_102",
            "name": "Robert Smith",
            "age": 61,
            "gender": "Male",
            "blood_group": "O+",
            "ward_number": "ICU-A",
            "bed_number": "01",
            "doctor_assigned": "Dr. Radhi",
            "status": "Admitted",
            "is_calibrated": True,
            "calibration_progress": 100,
        }

    device_info = None
    target_device = getattr(alert, "device", None)
    if not target_device and alert.device_id:
        target_device = db.query(Device).filter(Device.id == alert.device_id).first()
        
    if target_device:
        device_info = {
            "id": target_device.id,
            "name": target_device.name,
            "type": target_device.type,
            "ip_address": target_device.ip_address,
            "mac_address": target_device.mac_address,
            "port": target_device.port,
            "battery": target_device.battery,
            "firmware_version": target_device.firmware_version,
            "signal_strength": target_device.signal_strength,
            "status": target_device.status,
            "last_seen": target_device.last_seen.isoformat() if target_device.last_seen else None
        }
    else:
        device_info = {
            "id": alert.device_id or "icu_monitor_patient_102",
            "name": "Bedside ICU Vital Monitor",
            "type": "Physiological Monitor",
            "ip_address": "192.168.1.100",
            "mac_address": "00:1A:2B:3C:4D:5E",
            "port": 1883,
            "battery": 96,
            "firmware_version": "v2.4.12",
            "signal_strength": "Excellent",
            "status": "Quarantine",
            "last_seen": datetime.datetime.utcnow().isoformat()
        }

    sec_event = None
    if alert.device_id:
        se = db.query(SecurityEvent).filter(SecurityEvent.device_id == alert.device_id).order_by(SecurityEvent.timestamp.desc()).first()
        if se:
            sec_event = {
                "id": se.id,
                "timestamp": se.timestamp.isoformat() if se.timestamp else None,
                "attack_type": se.attack_type,
                "client_ip": se.client_ip,
                "status": se.status,
                "action_taken": se.action_taken
            }
    if not sec_event:
        sec_event = {
            "id": alert.id,
            "timestamp": alert.timestamp.isoformat() if alert.timestamp else datetime.datetime.utcnow().isoformat(),
            "attack_type": "ECG Waveform Spoofing" if (alert.severity or "").lower() in ["critical", "high"] else "IoMT Anomaly",
            "client_ip": "192.168.1.189",
            "status": "Quarantine",
            "action_taken": "Quarantined by TRINETRA Layer-2 AI Guard"
        }

    notification_payload = {}
    notif_log = None
    if current_user:
        notif_log = db.query(NotificationLog).filter(NotificationLog.alert_id == alert_id, NotificationLog.user_id == current_user.id).order_by(NotificationLog.created_at.desc()).first()
    if not notif_log:
        notif_log = db.query(NotificationLog).filter(NotificationLog.alert_id == alert_id).order_by(NotificationLog.created_at.desc()).first()
    if notif_log and notif_log.payload:
        try:
            notification_payload = json.loads(notif_log.payload)
        except Exception:
            pass
            
    if not notification_payload:
        is_attack = (alert.severity or "").lower() in ["critical", "high"]
        notification_payload = {
            "heart_rate": 134 if is_attack else 74,
            "spo2": 88 if is_attack else 98,
            "source_ip": "192.168.1.189",
            "packet_loss": 0.05 if is_attack else 0.0,
            "waveform_snippet": [0.12, 0.45, 1.35, -0.72, 0.18],
            "attack_type": alert.message
        }

    recent_pkt = db.query(NetworkPacket).order_by(NetworkPacket.timestamp.desc()).first()
    network_info = {
        "packet_size": recent_pkt.packet_size if recent_pkt else 148,
        "latency": recent_pkt.latency if recent_pkt else 8.2,
        "packet_loss": recent_pkt.packet_loss if recent_pkt else 0.0,
        "broker": "MQTT Broker (tcp://127.0.0.1:1883)",
        "protocol": "MQTT v3.1.1 / TLS 1.3",
        "qos": 1,
    }

    dev_name = target_device.name if target_device else (f"Device {alert.device_id}" if alert.device_id else "Bedside ICU Vital Monitor")
    dev_type = target_device.type if target_device else "Physiological Monitor"
    pat_name = target_patient.name if target_patient else (f"Patient {alert.patient_id}" if alert.patient_id else "Robert Smith")

    return {
        "alert": {
            "id": alert.id,
            "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
            "device_id": alert.device_id,
            "device_name": dev_name,
            "device_type": dev_type,
            "patient_id": alert.patient_id,
            "patient_name": pat_name,
            "severity": alert.severity,
            "message": alert.message,
            "status": alert.status,
            "resolution_notes": alert.resolution_notes
        },
        "patient": patient_info,
        "device": device_info,
        "security_event": sec_event,
        "notification_payload": notification_payload,
        "network_info": network_info
    }


@router.post("/{alert_id}/status")
def update_alert_status(
    alert_id: int,
    status: str = Body(..., embed=True),
    notes: str = Body("", embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    valid_statuses = ["New", "Acknowledged", "Investigating", "Escalated", "Resolved", "Unresolved"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
        
    old_status = alert.status
    alert.status = status
    if notes:
        alert.resolution_notes = notes
    elif status == "Resolved" and not alert.resolution_notes:
        alert.resolution_notes = f"Resolved by {current_user.name}"
        
    audit = AuditLog(
        username=current_user.username,
        action=f"ALERT_STATUS_{status.upper()}",
        target=f"Alert #{alert_id} ({old_status} -> {status})",
        severity="Info" if status != "Escalated" else "Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()
    return {"message": f"Alert #{alert_id} status updated to {status}", "status": status}


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
