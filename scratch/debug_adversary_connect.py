import sys
import os
sys.path.insert(0, os.path.abspath("."))

from backend.database import SessionLocal
from backend.models import User, Patient, Device, AuditLog
from backend.simulator_service import global_simulator_service
from backend.routes.adversary_routes import SUPPORTED_SCENARIOS
import datetime

db = SessionLocal()
try:
    current_user = db.query(User).filter(User.username == "admin").first()
    print("User:", current_user.username, current_user.role, current_user.name)

    patients = db.query(Patient).all()
    print("Patients count:", len(patients))
    devices = db.query(Device).all()
    print("Devices count:", len(devices))

    model_status = {
        "layer1_isolation_forest": global_simulator_service.ids.model_l1 is not None,
        "layer2_random_forest": global_simulator_service.ids.model_l2 is not None,
        "cusum": True,
    }
    print("Model status:", model_status)

    audit = AuditLog(
        username=current_user.username,
        action="ADVERSARY_CONSOLE_CONNECT",
        target="TRINETRA Lab Environment",
        severity="Info",
        result="Success",
    )
    db.add(audit)
    db.commit()
    print("Audit logged.")

    mode = global_simulator_service.get_system_mode()
    print("Mode:", mode)

    targets = [
        {
            "patient_id": p.id,
            "patient_name": p.name,
            "ward": p.ward_number,
            "bed": p.bed_number,
            "status": p.status,
            "is_calibrated": getattr(p, "is_calibrated", True),
            "devices": [
                {"device_id": d.id, "name": d.name, "type": d.type, "status": d.status}
                for d in devices
                if d.patient_id == p.id
            ],
        }
        for p in patients
    ]
    print("Targets built:", len(targets))

    res = {
        "status": "connected",
        "operator": {"username": current_user.username, "role": current_user.role, "name": current_user.name},
        "environment": {
            "name": "TRINETRA Lab",
            "backend_version": "2.0.0",
            "api_base": "/api",
            "ws_telemetry": "/ws/telemetry/{patient_id}",
            "ws_events": "/ws/adversary/events",
        },
        "targets": targets,
        "scenarios": SUPPORTED_SCENARIOS,
        "model_status": model_status,
        "ips_rules": [],
        "system_mode": mode,
        "connected_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    print("ALL OK!")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
