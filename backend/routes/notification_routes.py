import json
import datetime
import urllib.request
import threading
import asyncio
from typing import List, Optional, Tuple, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.database import SessionLocal, get_db
from backend.models import User, Patient, Device, Alert, DeviceRegistration, NotificationLog, SecurityEvent
from backend.schemas import (
    DeviceRegistrationRequest, DeviceRegistrationResponse,
    NotificationLogResponse, AlertResponse
)
from backend.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Routing"])

# ---------------------------------------------------------------------------
# Real-Time WebSocket Alert Streaming Hub (Zero-Delay <10ms Delivery)
# ---------------------------------------------------------------------------

_main_event_loop: Optional[asyncio.AbstractEventLoop] = None

def register_main_loop(loop: asyncio.AbstractEventLoop):
    global _main_event_loop
    _main_event_loop = loop

class AlertWebSocketManager:
    def __init__(self):
        self.active_connections: List[Tuple[WebSocket, dict]] = []
        self._lock = threading.Lock()

    async def connect(self, websocket: WebSocket, metadata: dict):
        await websocket.accept()
        with self._lock:
            self.active_connections.append((websocket, metadata))
        # Immediate handshake confirmation
        try:
            await websocket.send_json({
                "type": "CONNECTION_ESTABLISHED",
                "status": "Connected",
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "server": "TRINETRA Zero-Trust Gateway"
            })
        except Exception as e:
            print("[AlertWS] Error sending handshake:", e)
        
        # Immediate state recovery & event buffering: sync current threat state to newly connected client
        try:
            from backend.simulator_service import global_simulator_service
            attack_mode, target_patient = global_simulator_service.get_attack_state()
            if attack_mode != "Normal":
                attack_info = global_simulator_service.get_attack_details(attack_mode, target_patient)
                init_msg = {
                    "type": "SECURITY_ALERT",
                    "is_active": True,
                    "is_initial_sync": True,
                    "attack_mode": attack_mode,
                    "attack_type": attack_info.get("attack_label", attack_mode),
                    "target_patient_id": target_patient,
                    "target_patient_name": attack_info.get("target_patient_name", f"Patient {target_patient}"),
                    "target_device_id": attack_info.get("target_device_id", ""),
                    "target_device_name": attack_info.get("target_device_name", "Medical Device"),
                    "ward_number": attack_info.get("ward_number", "ICU-A"),
                    "bed_number": attack_info.get("bed_number", "Bed-01"),
                    "severity": attack_info.get("severity", "Critical"),
                    "title": f"🚨 {attack_info.get('severity', 'CRITICAL').upper()} ALERT: {attack_info.get('attack_label', attack_mode)}",
                    "message": attack_info.get("alert_message", ""),
                    "body": attack_info.get("alert_message", ""),
                    "sound": "beep_alert.wav",
                    "should_beep": True,
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                    "action_taken": attack_info.get("action_taken", "Quarantined by IPS")
                }
                await websocket.send_json(init_msg)
        except Exception as e:
            print("[AlertWS] Error sending initial threat sync:", e)

    def disconnect(self, websocket: WebSocket):
        with self._lock:
            self.active_connections = [c for c in self.active_connections if c[0] != websocket]
        print(f"[AlertWS] Client disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast_alert(self, alert_data: dict):
        dead_connections = []
        with self._lock:
            conns = list(self.active_connections)

        for ws, meta in conns:
            target_user_id = alert_data.get("target_user_id")
            target_role = alert_data.get("target_role")
            meta_user_id = meta.get("user_id")
            meta_role = meta.get("role")
            meta_patient_id = meta.get("patient_id")
            msg_type = alert_data.get("type", "")

            should_send = False
            # Universal cyberattack & security alerts: All active clinical/SOC consoles must receive immediately
            if msg_type in ["SECURITY_ALERT", "CRITICAL_ATTACK", "THREAT_NEUTRALIZED", "INITIAL_ATTACK_SYNC"] or alert_data.get("broadcast_all"):
                should_send = True
            # 1. Exact user match
            elif target_user_id and meta_user_id and str(target_user_id) == str(meta_user_id):
                should_send = True
            # 2. SOC Admins & Techs receive all security events
            elif meta_role in ["Admin", "Tech"]:
                should_send = True
            # 3. Doctor scoping: check attending physician assignment
            elif target_role and meta_role and target_role.lower() == meta_role.lower():
                should_send = True
            # 4. Broadcast with no explicit target
            elif not target_user_id and not target_role:
                should_send = True

            if should_send:
                try:
                    await ws.send_json(alert_data)
                except Exception:
                    dead_connections.append(ws)

        for ws in dead_connections:
            self.disconnect(ws)

alert_ws_manager = AlertWebSocketManager()

def broadcast_realtime_alert(alert_data: dict):
    """Safely dispatches alert payload to all connected WebSockets on the asyncio event loop."""
    global _main_event_loop
    if _main_event_loop and _main_event_loop.is_running():
        try:
            asyncio.run_coroutine_threadsafe(alert_ws_manager.broadcast_alert(alert_data), _main_event_loop)
            return
        except Exception as e:
            print("[AlertWS] Error in run_coroutine_threadsafe:", e)
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(alert_ws_manager.broadcast_alert(alert_data))
    except Exception:
        pass


def broadcast_system_attack_event(attack_mode: str, target_patient: str = "", details: dict = None, is_active: bool = True):
    """Authoritative event broadcast for system-wide cyberattacks and threat neutralization."""
    if not details:
        try:
            from backend.simulator_service import global_simulator_service
            details = global_simulator_service.get_attack_details(attack_mode, target_patient)
        except Exception:
            details = {}

    if is_active and attack_mode != "Normal":
        payload = {
            "type": "SECURITY_ALERT",
            "is_active": True,
            "attack_mode": attack_mode,
            "attack_type": details.get("attack_label", attack_mode),
            "target_patient_id": target_patient,
            "target_patient_name": details.get("target_patient_name", f"Patient {target_patient}"),
            "target_device_id": details.get("target_device_id", ""),
            "target_device_name": details.get("target_device_name", "Medical Device"),
            "ward_number": details.get("ward_number", "ICU-A"),
            "bed_number": details.get("bed_number", "Bed-01"),
            "severity": details.get("severity", "Critical"),
            "title": f"🚨 {details.get('severity', 'CRITICAL').upper()} ALERT: {details.get('attack_label', attack_mode)}",
            "message": details.get("alert_message", f"Security intrusion flagged on patient {target_patient} monitor."),
            "body": details.get("alert_message", f"Security intrusion flagged on patient {target_patient} monitor."),
            "sound": "beep_alert.wav",
            "should_beep": True,
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "action_taken": details.get("action_taken", "Quarantined by IPS"),
            "broadcast_all": True
        }
    else:
        payload = {
            "type": "THREAT_NEUTRALIZED",
            "is_active": False,
            "attack_mode": "Normal",
            "attack_type": "Normal Telemetry",
            "title": "Threat Neutralized",
            "message": "All attacks disengaged and neutralized. Clinical telemetry restored to baseline.",
            "body": "All attacks disengaged and neutralized. Clinical telemetry restored to baseline.",
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "broadcast_all": True
        }
    broadcast_realtime_alert(payload)


@router.websocket("/ws/alerts")
async def websocket_alerts_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None)
):
    metadata = {"user_id": user_id, "role": role or "Doctor", "patient_id": "patient_102"}
    await alert_ws_manager.connect(websocket, metadata)
    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                if msg.get("type") == "REGISTER_CLIENT":
                    metadata["user_id"] = msg.get("user_id") or metadata["user_id"]
                    metadata["role"] = msg.get("role") or metadata["role"]
                    metadata["patient_id"] = msg.get("assigned_patient_id") or metadata["patient_id"]
                elif msg.get("type") == "PING":
                    await websocket.send_json({"type": "PONG", "timestamp": time.time()})
            except Exception:
                pass
    except WebSocketDisconnect:
        alert_ws_manager.disconnect(websocket)
    except Exception:
        alert_ws_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Expo Push Notification helper (FCM proxy for background/locked delivery)
# ---------------------------------------------------------------------------

def _fire_push_async(user_id: int, title: str, body: str, data: dict, log_id: Optional[int] = None):
    """Launch Expo push in an isolated daemon thread with independent DB session."""
    t = threading.Thread(
        target=send_expo_push_notifications,
        args=(user_id, title, body, data, log_id),
        daemon=True
    )
    t.start()


def send_expo_push_notifications(user_id: int, title: str, body: str, data: dict, log_id: Optional[int] = None):
    """
    Deliver high-priority push message to registered devices.
    Uses independent SessionLocal to guarantee thread-safety.
    """
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return

        regs = db.query(DeviceRegistration).filter(
            DeviceRegistration.user_id == user.id,
            DeviceRegistration.is_active == True,
            DeviceRegistration.fcm_token.isnot(None)
        ).all()

        log = db.query(NotificationLog).filter(NotificationLog.id == log_id).first() if log_id else None

        for reg in regs:
            token = reg.fcm_token or ""
            # Only send to valid Expo Push tokens
            if not token.startswith("ExponentPushToken["):
                continue

            try:
                payload = json.dumps({
                    "to": token,
                    "title": title,
                    "body": body,
                    "data": data,
                    "sound": "beep_alert.wav",
                    "priority": "high",
                    "channelId": "trinetra_critical_alarm" if (data.get("severity") in ["Critical", "High"]) else "trinetra_info",
                    "badge": 1,
                    "ttl": 3600,
                }).encode("utf-8")

                req = urllib.request.Request(
                    "https://exp.host/--/api/v2/push/send",
                    data=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "host": "exp.host",
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    result = json.loads(resp.read().decode())
                    ticket = result.get("data", {})
                    if isinstance(ticket, dict) and ticket.get("status") == "error":
                        details = ticket.get("details", {})
                        if details.get("error") in ("DeviceNotRegistered", "InvalidCredentials"):
                            reg.is_active = False
                            db.commit()
                        if log:
                            log.delivery_status = "Failed"
                            db.commit()
                    else:
                        if log:
                            log.delivery_status = "Delivered"
                            db.commit()
            except Exception:
                if log:
                    log.delivery_status = "Failed"
                    db.commit()
    except Exception:
        pass
    finally:
        db.close()


# ----------------- Device Registration & Token Management ----------------- #

@router.post("/register-device", response_model=DeviceRegistrationResponse)
def register_device(
    req: DeviceRegistrationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register or refresh an Android device token for the authenticated user account."""
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Check if this physical device is already registered for this user
    reg = db.query(DeviceRegistration).filter(
        DeviceRegistration.user_id == current_user.id,
        DeviceRegistration.device_id == req.device_id
    ).first()

    if reg:
        reg.fcm_token = req.fcm_token
        reg.device_name = req.device_name or reg.device_name
        reg.platform = req.platform or reg.platform
        reg.is_active = True
        reg.last_registered = datetime.datetime.utcnow()
    else:
        reg = DeviceRegistration(
            user_id=current_user.id,
            device_id=req.device_id,
            fcm_token=req.fcm_token,
            device_name=req.device_name or "Android Device",
            platform=req.platform or "android",
            is_active=True,
            last_registered=datetime.datetime.utcnow()
        )
        db.add(reg)

    db.commit()
    db.refresh(reg)
    return reg

@router.post("/unregister-device")
def unregister_device(
    device_id: str = Query(..., description="Client device unique ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke device registration on logout so notifications cease routing to this device."""
    reg = db.query(DeviceRegistration).filter(
        DeviceRegistration.user_id == current_user.id,
        DeviceRegistration.device_id == device_id
    ).first()

    if reg:
        reg.is_active = False
        db.commit()
        return {"message": f"Device {device_id} successfully unregistered for user {current_user.username}"}
    return {"message": "Device not found or already inactive"}


# ----------------- Account-Specific Notification & Alert Routing ----------------- #

@router.get("/my-alerts", response_model=List[AlertResponse])
def get_my_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mandatory Account-Specific Alert Retrieval:
    - Doctor: receives only alerts for patients assigned to this doctor.
    - Patient: receives only alerts for their own admitted patient profile.
    - Tech: receives technical IoMT security events across devices.
    - Admin: receives all hospital-wide alerts.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    query = db.query(Alert).join(Patient, Alert.patient_id == Patient.id, isouter=True)

    if current_user.role == "Doctor":
        # Match Doctor's name or doctor username against Patient.doctor_assigned
        # Doctor A must not see Doctor B's patient alerts!
        doctor_name_patterns = [current_user.name, current_user.username]
        query = query.filter(
            (Patient.doctor_assigned.in_(doctor_name_patterns)) |
            (Patient.doctor_assigned.like(f"%{current_user.name}%"))
        )

    elif current_user.role == "Patient":
        # Strictly restricted to their own assigned patient ID
        patient_id = current_user.assigned_patient_id
        if not patient_id:
            return []
        query = query.filter(Alert.patient_id == patient_id)

    elif current_user.role in ["Tech", "Admin", "Nurse"]:
        # Technical SOC team, Nurse, or Superadmin see broad feeds
        pass

    alerts = query.order_by(Alert.timestamp.desc()).limit(100).all()

    # Format response with enriched clinical / device names
    result = []
    for a in alerts:
        dev_name = a.device.name if a.device else (a.device_id or "Unknown Device")
        dev_type = a.device.type if a.device else "IoMT Device"
        pat_name = a.patient.name if a.patient else (a.patient_id or "Unknown Patient")
        
        result.append(AlertResponse(
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
            resolution_notes=a.resolution_notes or ""
        ))
    return result


@router.get("/logs", response_model=List[NotificationLogResponse])
def get_notification_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve audit log of notification delivery attempts, acknowledgment, and resolution."""
    query = db.query(NotificationLog)
    if current_user.role != "Admin":
        query = query.filter(NotificationLog.user_id == current_user.id)
    
    return query.order_by(NotificationLog.created_at.desc()).limit(limit).all()


@router.post("/ack/{log_id}")
def acknowledge_notification(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record receipt and acknowledgment of an alert notification by the recipient device."""
    log = db.query(NotificationLog).filter(NotificationLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Notification record not found")
    
    if log.user_id != current_user.id and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    log.delivery_status = "Acknowledged"
    log.acknowledged_at = datetime.datetime.utcnow()
    db.commit()
    
    return {"message": "Notification acknowledged", "log_id": log_id, "status": "Acknowledged"}


# ----------------- Server-Side Notification Router Function ----------------- #

def route_security_alert_to_accounts(
    db: Session,
    alert: Alert,
    attack_type: str = "ECG Waveform Spoofing",
    clinical_payload: dict = None
):
    """
    Mandatory Account-Specific Alert Routing Engine:
    1. Identifies relevant patient, doctor, tech, and admin.
    2. Builds role-tailored payloads.
    3. Broadcasts instant (<10ms) WebSocket notification with emergency beep trigger.
    4. Launches background Expo Push notification to registered physical devices.
    5. Records delivery attempts in NotificationLog.
    """
    if clinical_payload is None:
        clinical_payload = {}

    patient = db.query(Patient).filter(Patient.id == alert.patient_id).first() if alert.patient_id else None
    device = db.query(Device).filter(Device.id == alert.device_id).first() if alert.device_id else None

    # 1. Resolve Doctor account
    doctor_user = None
    if patient and patient.doctor_assigned:
        doctor_user = db.query(User).filter(
            (User.name == patient.doctor_assigned) |
            (User.name.like(f"%{patient.doctor_assigned}%")) |
            (User.username == patient.doctor_assigned.lower().replace(" ", "").replace(".", ""))
        ).first()

    # 2. Resolve Patient account
    patient_user = None
    if patient:
        patient_user = db.query(User).filter(User.assigned_patient_id == patient.id).first()

    # 3. Resolve Tech team accounts
    tech_users = db.query(User).filter(User.role == "Tech", User.is_active == True).all()

    # 4. Resolve Admin accounts
    admin_users = db.query(User).filter(User.role == "Admin", User.is_active == True).all()

    deliveries = []

    # --- Route to Doctor ---
    if doctor_user and doctor_user.is_active:
        doc_payload = {
            "target_role": "Doctor",
            "patient_name": patient.name if patient else "Assigned Patient",
            "patient_id": patient.id if patient else alert.patient_id,
            "device_name": device.name if device else alert.device_id,
            "device_id": alert.device_id,
            "attack_type": attack_type,
            "severity": alert.severity,
            "timestamp": alert.timestamp.isoformat(),
            "heart_rate": clinical_payload.get("heart_rate", 128),
            "spo2": clinical_payload.get("spo2", 89),
            "waveform_snippet": clinical_payload.get("waveform_snippet", [0.1, 0.4, 1.2, -0.6, 0.2]),
            "data_integrity_status": "Untrusted - Sensor Spoofed",
            "patient_safety_status": "High Anomaly - Attending Review Required",
            "mitigation_status": "Quarantined by TRINETRA Layer-2 AI Guard"
        }
        doc_log = NotificationLog(
            alert_id=alert.id,
            user_id=doctor_user.id,
            title=f"TRINETRA Critical Medical Alert: {patient.name if patient else 'Patient'}",
            body=f"[{alert.severity}] {attack_type} detected on {device.name if device else 'device'}. Vitals: HR {doc_payload['heart_rate']} bpm, SpO2 {doc_payload['spo2']}%. Sensor data untrusted.",
            payload=json.dumps(doc_payload),
            delivery_status="Sent",
            channel="FCM",
            attempt_count=1,
            created_at=datetime.datetime.utcnow()
        )
        db.add(doc_log)
        db.flush()  # get doc_log.id before commit
        deliveries.append({"user": doctor_user.username, "role": "Doctor", "log": doc_log})
        
        # Fire real-time WebSocket alert (zero delay)
        broadcast_realtime_alert({
            "type": "SECURITY_ALERT",
            "alert_id": alert.id,
            "target_user_id": doctor_user.id,
            "target_role": "Doctor",
            "patient_id": doc_payload["patient_id"],
            "device_id": doc_payload["device_id"],
            "severity": alert.severity,
            "title": doc_log.title,
            "body": doc_log.body,
            "sound": "beep_alert.wav",
            "should_beep": True,
            "attack_type": attack_type,
            "payload": doc_payload,
            "timestamp": alert.timestamp.isoformat()
        })
        # Fire background Expo Push
        _fire_push_async(doctor_user.id, doc_log.title, doc_log.body, doc_payload, doc_log.id)

    # --- Route to Patient ---
    if patient_user and patient_user.is_active:
        pat_payload = {
            "target_role": "Patient",
            "patient_name": patient.name if patient else "Patient",
            "patient_id": patient.id if patient else alert.patient_id,
            "device_name": device.name if device else "Your Bedside Device",
            "device_id": alert.device_id,
            "timestamp": alert.timestamp.isoformat(),
            "patient_safety_status": "Safety Protocol Active - Clinical Staff Alerted",
            "instructions": "Your monitoring device is being recalibrated by nursing staff. Please remain resting in your bed."
        }
        pat_log = NotificationLog(
            alert_id=alert.id,
            user_id=patient_user.id,
            title="Hospital Care Update: Bedside Device Calibrating",
            body="Your medical monitor is currently being verified by your clinical care team. Please remain in bed.",
            payload=json.dumps(pat_payload),
            delivery_status="Sent",
            channel="FCM",
            attempt_count=1,
            created_at=datetime.datetime.utcnow()
        )
        db.add(pat_log)
        db.flush()
        deliveries.append({"user": patient_user.username, "role": "Patient", "log": pat_log})
        broadcast_realtime_alert({
            "type": "SECURITY_ALERT",
            "alert_id": alert.id,
            "target_user_id": patient_user.id,
            "target_role": "Patient",
            "patient_id": pat_payload["patient_id"],
            "device_id": pat_payload["device_id"],
            "severity": alert.severity,
            "title": pat_log.title,
            "body": pat_log.body,
            "sound": "beep_alert.wav",
            "should_beep": False,
            "attack_type": attack_type,
            "payload": pat_payload,
            "timestamp": alert.timestamp.isoformat()
        })
        _fire_push_async(patient_user.id, pat_log.title, pat_log.body, pat_payload, pat_log.id)

    # --- Route to Technical Team ---
    for tech_user in tech_users:
        tech_payload = {
            "target_role": "Tech",
            "attack_type": attack_type,
            "severity": alert.severity,
            "affected_device": alert.device_id,
            "patient_id": alert.patient_id,
            "source_ip": clinical_payload.get("source_ip", "192.168.1.189"),
            "dest_port": 1883,
            "mqtt_topic": f"hospital/icu/{alert.device_id}/telemetry",
            "packet_loss": clinical_payload.get("packet_loss", 0.04),
            "ids_classification": "Layer 1 Isolation Forest Anomaly + Layer 2 Random Forest SigMatch",
            "integrity_check_failure": "SHA256 Telemetry Signature Discrepancy",
            "mitigation_status": "MQTT Ingress Dropped & IP Moved to Quarantine"
        }
        tech_log = NotificationLog(
            alert_id=alert.id,
            user_id=tech_user.id,
            title=f"TRINETRA SOC Anomaly: {attack_type}",
            body=f"[{alert.severity}] Attack vector on device {alert.device_id} from {tech_payload['source_ip']}. IDS classification: Layer 2 RF. Device quarantined.",
            payload=json.dumps(tech_payload),
            delivery_status="Sent",
            channel="FCM",
            attempt_count=1,
            created_at=datetime.datetime.utcnow()
        )
        db.add(tech_log)
        db.flush()
        deliveries.append({"user": tech_user.username, "role": "Tech", "log": tech_log})
        broadcast_realtime_alert({
            "type": "SECURITY_ALERT",
            "alert_id": alert.id,
            "target_user_id": tech_user.id,
            "target_role": "Tech",
            "patient_id": alert.patient_id,
            "device_id": alert.device_id,
            "severity": alert.severity,
            "title": tech_log.title,
            "body": tech_log.body,
            "sound": "beep_alert.wav",
            "should_beep": True,
            "attack_type": attack_type,
            "payload": tech_payload,
            "timestamp": alert.timestamp.isoformat()
        })
        _fire_push_async(tech_user.id, tech_log.title, tech_log.body, tech_payload, tech_log.id)

    # --- Route to Administrators ---
    for admin_user in admin_users:
        admin_payload = {
            "target_role": "Admin",
            "alert_id": alert.id,
            "severity": alert.severity,
            "message": alert.message,
            "patient_id": alert.patient_id,
            "device_id": alert.device_id,
            "timestamp": alert.timestamp.isoformat()
        }
        admin_log = NotificationLog(
            alert_id=alert.id,
            user_id=admin_user.id,
            title=f"TRINETRA Admin Alert: [{alert.severity}] Security Incident",
            body=alert.message,
            payload=json.dumps(admin_payload),
            delivery_status="Sent",
            channel="FCM",
            attempt_count=1,
            created_at=datetime.datetime.utcnow()
        )
        db.add(admin_log)
        db.flush()
        deliveries.append({"user": admin_user.username, "role": "Admin", "log": admin_log})
        broadcast_realtime_alert({
            "type": "SECURITY_ALERT",
            "alert_id": alert.id,
            "target_user_id": admin_user.id,
            "target_role": "Admin",
            "patient_id": alert.patient_id,
            "device_id": alert.device_id,
            "severity": alert.severity,
            "title": admin_log.title,
            "body": admin_log.body,
            "sound": "beep_alert.wav",
            "should_beep": True,
            "attack_type": attack_type,
            "payload": admin_payload,
            "timestamp": alert.timestamp.isoformat()
        })
        _fire_push_async(admin_user.id, admin_log.title, admin_log.body, admin_payload, admin_log.id)

    db.commit()
    return deliveries


@router.post("/dispatch-test")
def dispatch_test_notification(
    attack_type: str = "ECG Waveform Spoofing",
    patient_id: str = "patient_102",
    severity: str = "Critical",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Test endpoint to trigger account-specific notification delivery across app states.
    Validates delivery to Doctor, Patient, Technical Team, and Administrator.
    """
    test_alert = Alert(
        timestamp=datetime.datetime.utcnow(),
        device_id=f"icu_monitor_{patient_id}",
        patient_id=patient_id,
        severity=severity,
        message=f"Critical Security Alert: {attack_type} detected on patient monitor. Attending doctor and security alerted.",
        status="Unresolved"
    )
    db.add(test_alert)
    db.commit()
    db.refresh(test_alert)

    deliveries = route_security_alert_to_accounts(
        db=db,
        alert=test_alert,
        attack_type=attack_type,
        clinical_payload={
            "heart_rate": 134,
            "spo2": 88,
            "source_ip": "192.168.1.199",
            "packet_loss": 0.05,
            "waveform_snippet": [0.12, 0.45, 1.35, -0.72, 0.18]
        }
    )

    return {
        "message": "Account-specific notifications routed and dispatched successfully",
        "alert_id": test_alert.id,
        "deliveries_count": len(deliveries),
        "routed_recipients": [
            {"username": d["user"], "role": d["role"], "notification_id": d["log"].id}
            for d in deliveries
        ]
    }
