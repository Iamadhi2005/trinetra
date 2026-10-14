"""
TRINETRA Adversary Simulation Console — Backend API Routes
Provides authenticated simulation session management, scenario execution,
real-time event streaming, and evidence export.

All simulation decisions originate from the existing IDS/IPS pipeline.
No hardcoded detection outcomes. No fabricated probabilities.
"""
import uuid
import time
import json
import asyncio
import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Body, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import AuditLog, Alert, Device, Patient
from backend.auth import get_current_user, require_role
from backend.simulator_service import global_simulator_service

router = APIRouter(prefix="/api/adversary", tags=["Adversary Simulation"])

# ---------------------------------------------------------------------------
# In-memory simulation session registry
# Key: sim_id (str uuid4)
# Value: SimulationRecord dict
# ---------------------------------------------------------------------------
_simulation_registry: Dict[str, Dict[str, Any]] = {}

# Active WebSocket event connections for real-time event streaming
_adversary_ws_clients: List[WebSocket] = []

SUPPORTED_SCENARIOS = {
    "DoS": {
        "label": "DoS / MQTT Packet Flood",
        "description": "Simulates volumetric packet flooding. Evaluated by Random Forest Layer 2 (CIC-IoMT-2024).",
        "attack_mode": "DoS",
        "ml_layer": "Layer 2 — Random Forest",
        "features": ["Flow Rate", "Total Size", "IAT", "Duration", "Avg Size"],
        "detection_path": "pure_ml",
        "severity": "Critical",
    },
    "Tampering": {
        "label": "Medical Telemetry Tampering",
        "description": "Injects manipulated physiological vitals. Evaluated by Isolation Forest Layer 1.",
        "attack_mode": "Override",
        "ml_layer": "Layer 1 — Isolation Forest",
        "features": ["Heart Rate", "SpO2", "Lead Impedance", "Infusion Rate"],
        "detection_path": "pure_ml",
        "severity": "Critical",
    },
    "Override": {
        "label": "Unauthorized Infusion-Rate Override",
        "description": "Unauthorized pump configuration change (500 mL/h). Isolation Forest evaluates physiological vector.",
        "attack_mode": "Override",
        "ml_layer": "Layer 1 — Isolation Forest",
        "features": ["Infusion Rate", "Heart Rate", "SpO2"],
        "detection_path": "pure_ml",
        "severity": "Critical",
    },
    "Replay": {
        "label": "Telemetry Replay Injection",
        "description": "Replays stale telemetry. Evaluated by timestamp-freshness rule (Layer 0, MitM/Spoofing path).",
        "attack_mode": "Replay",
        "ml_layer": "Layer 0 — Replay Window Rule (3000ms threshold)",
        "features": ["Timestamp", "Sequence ID", "Device ID"],
        "detection_path": "standard",
        "severity": "High",
    },
    "ARP": {
        "label": "ARP Spoofing / Man-in-the-Middle",
        "description": "Simulated ARP-table inconsistency and HMAC corruption. Evaluated by cryptographic signature rule.",
        "attack_mode": "MitM",
        "ml_layer": "Layer 0 — HMAC-SHA256 Signature Rule",
        "features": ["HMAC Signature", "Client Identity", "Device MAC"],
        "detection_path": "standard",
        "severity": "Critical",
    },
    "Fault": {
        "label": "Sensor Fault / Lead Detachment",
        "description": "Simulates ECG lead detachment (10,000 Ω impedance spike). Classified as hardware fault, not attack.",
        "attack_mode": "Fault",
        "ml_layer": "Layer 1 — Isolation Forest + Clinical Bounds Rule",
        "features": ["Lead Impedance", "Heart Rate", "SpO2"],
        "detection_path": "pure_ml",
        "severity": "Warning",
    },
    "Drain": {
        "label": "Battery Depletion / Pacing Exhaustion",
        "description": "Continuous high-draw cycling. Isolation Forest evaluates abnormal vitals pattern.",
        "attack_mode": "Drain",
        "ml_layer": "Layer 1 — Isolation Forest",
        "features": ["Battery Level", "Pacing Rate", "Heart Rate"],
        "detection_path": "pure_ml",
        "severity": "High",
    },
    "BruteForce": {
        "label": "Brute-Force Authentication Attack",
        "description": "High-frequency credential stuffing against the API Gateway. Rate-limited by IPS rule.",
        "attack_mode": "BruteForce",
        "ml_layer": "Layer 0 — Auth Rate Limiter Rule",
        "features": ["Request Rate", "Client IP", "Token Validity"],
        "detection_path": "standard",
        "severity": "Critical",
    },
}


# ---------------------------------------------------------------------------
# Helper: broadcast event to all connected WS adversary clients
# ---------------------------------------------------------------------------
async def _broadcast_event(event: Dict[str, Any]):
    dead = []
    for ws in _adversary_ws_clients:
        try:
            await ws.send_json(event)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _adversary_ws_clients.remove(ws)


def _emit_event_background(event: Dict[str, Any]):
    """Non-async wrapper; schedules WS broadcast if an event loop is running."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_broadcast_event(event))
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Session Connect / Verify
# ---------------------------------------------------------------------------

@router.post("/session/connect")
def adversary_connect(
    current_user=Depends(require_role(["Admin", "Operator"])),
    db: Session = Depends(get_db),
):
    """
    Validates that the caller has Admin/Operator privileges.
    Returns available targets, scenario catalogue, IPS rule snapshot,
    and current system mode. Called explicitly by the Attacker Hub UI.
    """
    patients = db.query(Patient).all()
    devices = db.query(Device).all()
    ips_rules = []
    try:
        from backend.models import IPSRule
        ips_rules = [
            {"id": r.id, "name": r.name, "enabled": r.enabled, "threshold": r.threshold}
            for r in db.query(IPSRule).all()
        ]
    except Exception:
        pass

    model_status = {
        "layer1_isolation_forest": global_simulator_service.ids.model_l1 is not None,
        "layer2_random_forest": global_simulator_service.ids.model_l2 is not None,
        "cusum": True,
    }

    audit = AuditLog(
        username=current_user.username,
        action="ADVERSARY_CONSOLE_CONNECT",
        target="TRINETRA Lab Environment",
        severity="Info",
        result="Success",
    )
    db.add(audit)
    db.commit()

    return {
        "status": "connected",
        "operator": {"username": current_user.username, "role": current_user.role, "name": current_user.name},
        "environment": {
            "name": "TRINETRA Lab",
            "backend_version": "2.0.0",
            "api_base": "/api",
            "ws_telemetry": "/ws/telemetry/{patient_id}",
            "ws_events": "/ws/adversary/events",
        },
        "targets": [
            {
                "patient_id": p.id,
                "patient_name": p.name,
                "ward": p.ward_number,
                "bed": p.bed_number,
                "status": p.status,
                "is_calibrated": p.is_calibrated,
                "devices": [
                    {"device_id": d.id, "name": d.name, "type": d.type, "status": d.status}
                    for d in devices
                    if d.patient_id == p.id
                ],
            }
            for p in patients
        ],
        "scenarios": SUPPORTED_SCENARIOS,
        "model_status": model_status,
        "ips_rules": ips_rules,
        "system_mode": global_simulator_service.get_system_mode(),
        "connected_at": datetime.datetime.utcnow().isoformat() + "Z",
    }


@router.post("/session/disconnect")
def adversary_disconnect(
    current_user=Depends(require_role(["Admin", "Operator"])),
    db: Session = Depends(get_db),
):
    """
    Logs disconnection. Optionally disengages any running simulations
    associated with this session. Frontend must call this on deliberate disconnect.
    """
    # Disengage active attack
    attack_mode, _ = global_simulator_service.get_attack_state()
    if attack_mode != "Normal":
        global_simulator_service.trigger_attack_now("Normal", "")

    audit = AuditLog(
        username=current_user.username,
        action="ADVERSARY_CONSOLE_DISCONNECT",
        target="TRINETRA Lab Environment",
        severity="Info",
        result="Success",
    )
    db.add(audit)
    db.commit()
    return {"status": "disconnected", "timestamp": datetime.datetime.utcnow().isoformat() + "Z"}


# ---------------------------------------------------------------------------
# Scenario Information
# ---------------------------------------------------------------------------

@router.get("/scenarios")
def list_scenarios(current_user=Depends(get_current_user)):
    """Returns the full catalogue of supported adversarial scenarios."""
    return {"scenarios": SUPPORTED_SCENARIOS}


# ---------------------------------------------------------------------------
# Simulation Lifecycle
# ---------------------------------------------------------------------------

@router.post("/simulate")
def launch_simulation(
    payload: dict = Body(...),
    current_user=Depends(require_role(["Admin", "Operator"])),
    db: Session = Depends(get_db),
):
    """
    Launches an adversarial simulation against a selected target.

    Required fields:
      - scenario: one of SUPPORTED_SCENARIOS keys
      - target_patient: patient ID string
      - config: dict with optional rate, duration, intensity

    Returns a simulation record with a unique sim_id.
    The attack is forwarded to the appropriate IDS/IPS pipeline.
    """
    scenario_key = payload.get("scenario", "")
    target_patient = payload.get("target_patient", "")
    config = payload.get("config", {})

    if scenario_key not in SUPPORTED_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario '{scenario_key}'. Valid: {list(SUPPORTED_SCENARIOS.keys())}")

    if not target_patient:
        raise HTTPException(status_code=400, detail="target_patient is required.")

    patient = db.query(Patient).filter(Patient.id == target_patient).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient '{target_patient}' not found in lab environment.")

    # Prevent duplicate concurrent simulations
    active_sims = [s for s in _simulation_registry.values() if s["state"] == "RUNNING"]
    if active_sims:
        raise HTTPException(
            status_code=409,
            detail=f"A simulation is already running (ID: {active_sims[0]['sim_id']}). Cancel it before launching a new one.",
        )

    scenario = SUPPORTED_SCENARIOS[scenario_key]
    sim_id = str(uuid.uuid4())
    attack_mode = scenario["attack_mode"]
    detection_path = scenario["detection_path"]
    ts_now = datetime.datetime.utcnow()

    # Build simulation record
    sim_record = {
        "sim_id": sim_id,
        "scenario": scenario_key,
        "scenario_label": scenario["label"],
        "attack_mode": attack_mode,
        "detection_path": detection_path,
        "ml_layer": scenario["ml_layer"],
        "target_patient": target_patient,
        "target_patient_name": patient.name,
        "config": config,
        "state": "RUNNING",
        "operator": current_user.username,
        "started_at": ts_now.isoformat() + "Z",
        "completed_at": None,
        "cancelled_at": None,
        "stages": [],
        "ml_result": None,
        "ips_result": None,
        "enforcement_action": None,
        "alerts_generated": [],
        "audit_ref": None,
        "final_status": None,
        "failure_reason": None,
    }

    # Log stage: CONFIGURED
    sim_record["stages"].append({
        "stage": "CONFIGURED",
        "timestamp": ts_now.isoformat() + "Z",
        "detail": f"Scenario '{scenario['label']}' configured against {patient.name} ({target_patient})",
    })

    # Log stage: AUTHORIZED
    sim_record["stages"].append({
        "stage": "AUTHORIZED",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "detail": f"Operator {current_user.username} ({current_user.role}) authorized simulation {sim_id}",
    })

    # Log stage: RUNNING — trigger actual attack on backend
    try:
        if detection_path == "pure_ml":
            global_simulator_service.set_system_mode("pure_ml")
            state_data = global_simulator_service.trigger_attack_pure_ml(attack_mode, target_patient)
        else:
            # Standard mode for rule-based scenarios (Replay, ARP, BruteForce)
            global_simulator_service.set_system_mode("standard")
            state_data = global_simulator_service.trigger_attack_now(attack_mode, target_patient)

        sim_record["stages"].append({
            "stage": "RUNNING",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "detail": f"Attack stream '{attack_mode}' active. Packets being processed by IDS/IPS pipeline.",
        })
    except Exception as exc:
        sim_record["state"] = "FAILED"
        sim_record["failure_reason"] = str(exc)
        sim_record["stages"].append({
            "stage": "FAILED",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "detail": f"Attack trigger failed: {exc}",
        })

    _simulation_registry[sim_id] = sim_record

    # Audit log
    audit = AuditLog(
        username=current_user.username,
        action=f"ADV_SIM_LAUNCH_{scenario_key.upper()}",
        target=f"sim_id={sim_id} | Patient={patient.name} ({target_patient})",
        severity="Critical" if scenario["severity"] == "Critical" else "Warning",
        result="Success" if sim_record["state"] == "RUNNING" else "Failure",
    )
    db.add(audit)
    db.commit()
    sim_record["audit_ref"] = audit.id

    # Broadcast WS event
    _emit_event_background({
        "event": "SIM_STARTED",
        "sim_id": sim_id,
        "scenario": scenario_key,
        "target_patient": target_patient,
        "state": sim_record["state"],
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    })

    return sim_record


@router.get("/simulate/{sim_id}")
def get_simulation(
    sim_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the current simulation record including all stages,
    ML results (if available), IPS enforcement, and audit references.
    Also pulls the latest ML diagnostics from the IDS engine.
    """
    if sim_id not in _simulation_registry:
        raise HTTPException(status_code=404, detail=f"Simulation '{sim_id}' not found.")

    sim = _simulation_registry[sim_id]

    # Attach live ML diagnostics if simulation is still running
    if sim["state"] == "RUNNING":
        live_diag = getattr(global_simulator_service.ids, "last_pure_ml_diagnostics", {})
        if live_diag:
            sim["ml_result"] = {
                "layer2_random_forest": sim.get("ml_result", {}).get("layer2_random_forest") if sim.get("ml_result") else None,
                "layer1_isolation_forest": sim.get("ml_result", {}).get("layer1_isolation_forest") if sim.get("ml_result") else None,
                "live_diagnostics": live_diag,
            }

        # Check quarantine queue for evidence of IPS action
        for dev_id, q_item in global_simulator_service.ids.quarantine_queue.items():
            if q_item.get("payload", {}).get("patient_id") == sim["target_patient"]:
                if "QUARANTINE" not in [s["stage"] for s in sim["stages"]]:
                    sim["stages"].append({
                        "stage": "QUARANTINE",
                        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                        "detail": f"Device '{dev_id}' quarantined. Reason: {q_item.get('reason', 'ML anomaly')}",
                        "device_id": dev_id,
                        "reason": q_item.get("reason"),
                    })
                    sim["ips_result"] = {
                        "action": "QUARANTINED",
                        "device_id": dev_id,
                        "reason": q_item.get("reason"),
                        "client_id": q_item.get("client_id"),
                        "timestamp": q_item.get("timestamp"),
                    }
                    sim["enforcement_action"] = "DEVICE_QUARANTINED"

        # Attach recent unresolved alert if generated for this patient
        recent_alert = (
            db.query(Alert)
            .filter(Alert.patient_id == sim["target_patient"], Alert.status == "Unresolved")
            .order_by(Alert.timestamp.desc())
            .first()
        )
        if recent_alert and recent_alert.id not in sim["alerts_generated"]:
            sim["alerts_generated"].append(recent_alert.id)

    return sim


@router.post("/simulate/{sim_id}/cancel")
def cancel_simulation(
    sim_id: str,
    current_user=Depends(require_role(["Admin", "Operator"])),
    db: Session = Depends(get_db),
):
    """
    Cancels a running simulation. Disengages the attack on the simulator.
    Logs cancellation to audit trail.
    """
    if sim_id not in _simulation_registry:
        raise HTTPException(status_code=404, detail=f"Simulation '{sim_id}' not found.")

    sim = _simulation_registry[sim_id]
    if sim["state"] not in ("RUNNING", "EVALUATING"):
        raise HTTPException(status_code=409, detail=f"Simulation is in state '{sim['state']}', cannot cancel.")

    # Disengage attack on backend
    attack_mode, _ = global_simulator_service.get_attack_state()
    if attack_mode != "Normal":
        if sim["detection_path"] == "pure_ml":
            global_simulator_service.trigger_attack_pure_ml("Normal", "")
        else:
            global_simulator_service.trigger_attack_now("Normal", "")

    ts = datetime.datetime.utcnow().isoformat() + "Z"
    sim["state"] = "CANCELLED"
    sim["cancelled_at"] = ts
    sim["stages"].append({
        "stage": "CANCELLED",
        "timestamp": ts,
        "detail": f"Simulation cancelled by {current_user.username}. Attack disengaged.",
    })

    audit = AuditLog(
        username=current_user.username,
        action="ADV_SIM_CANCEL",
        target=f"sim_id={sim_id}",
        severity="Warning",
        result="Success",
    )
    db.add(audit)
    db.commit()

    _emit_event_background({
        "event": "SIM_CANCELLED",
        "sim_id": sim_id,
        "cancelled_by": current_user.username,
        "timestamp": ts,
    })

    return sim


@router.post("/simulate/{sim_id}/complete")
def complete_simulation(
    sim_id: str,
    current_user=Depends(require_role(["Admin", "Operator"])),
    db: Session = Depends(get_db),
):
    """
    Marks a simulation as COMPLETED. Captures final ML diagnostics and IPS state.
    Disengages the attack stream. Should be called explicitly by the operator.
    """
    if sim_id not in _simulation_registry:
        raise HTTPException(status_code=404, detail=f"Simulation '{sim_id}' not found.")

    sim = _simulation_registry[sim_id]
    if sim["state"] not in ("RUNNING", "EVALUATING"):
        raise HTTPException(status_code=409, detail=f"Simulation is in state '{sim['state']}', cannot complete.")

    # Capture final ML diagnostics
    final_diag = getattr(global_simulator_service.ids, "last_pure_ml_diagnostics", {})

    # Disengage attack
    if sim["detection_path"] == "pure_ml":
        global_simulator_service.trigger_attack_pure_ml("Normal", "")
    else:
        global_simulator_service.trigger_attack_now("Normal", "")

    ts = datetime.datetime.utcnow().isoformat() + "Z"
    sim["state"] = "COMPLETED"
    sim["completed_at"] = ts
    sim["ml_result"] = {
        "final_diagnostics": final_diag,
        "model_l1_available": global_simulator_service.ids.model_l1 is not None,
        "model_l2_available": global_simulator_service.ids.model_l2 is not None,
    }
    sim["final_status"] = "DETECTED" if (sim.get("ips_result") or sim.get("enforcement_action")) else "NOT_DETECTED"

    sim["stages"].append({
        "stage": "COMPLETED",
        "timestamp": ts,
        "detail": (
            f"Simulation completed. Final IPS outcome: {sim.get('enforcement_action', 'No enforcement action')}. "
            f"Detection: {sim['final_status']}."
        ),
    })

    audit = AuditLog(
        username=current_user.username,
        action="ADV_SIM_COMPLETE",
        target=f"sim_id={sim_id} | outcome={sim['final_status']}",
        severity="Info",
        result="Success",
    )
    db.add(audit)
    db.commit()

    _emit_event_background({
        "event": "SIM_COMPLETED",
        "sim_id": sim_id,
        "final_status": sim["final_status"],
        "timestamp": ts,
    })

    return sim


# ---------------------------------------------------------------------------
# Evidence & Reporting
# ---------------------------------------------------------------------------

@router.get("/evidence")
def list_evidence(current_user=Depends(get_current_user)):
    """Returns all simulation records sorted by start time descending."""
    records = sorted(
        _simulation_registry.values(),
        key=lambda s: s["started_at"],
        reverse=True,
    )
    return {"total": len(records), "simulations": records}


@router.get("/evidence/{sim_id}/export")
def export_evidence(sim_id: str, current_user=Depends(get_current_user)):
    """
    Returns full structured evidence for a single simulation as JSON.
    Suitable for download/archival.
    """
    if sim_id not in _simulation_registry:
        raise HTTPException(status_code=404, detail=f"Simulation '{sim_id}' not found.")

    sim = _simulation_registry[sim_id]
    report = {
        "report_type": "TRINETRA Adversary Simulation Evidence Report",
        "exported_at": datetime.datetime.utcnow().isoformat() + "Z",
        "exported_by": current_user.username,
        "simulation": sim,
        "scenario_detail": SUPPORTED_SCENARIOS.get(sim["scenario"], {}),
        "disclaimer": (
            "This simulation was conducted in an isolated TRINETRA lab environment. "
            "No real clinical hardware was affected. All ML decisions reflect actual "
            "Scikit-Learn model outputs without fabricated results."
        ),
    }
    return report


# ---------------------------------------------------------------------------
# Live ML Diagnostics (convenience re-export for adversary console)
# ---------------------------------------------------------------------------

@router.get("/diagnostics/live")
def get_live_diagnostics(current_user=Depends(get_current_user)):
    """
    Returns the last known ML inference snapshot from the IDS engine.
    Same data as /api/security/pure-ml/diagnostics but namespaced for the console.
    """
    diagnostics = getattr(global_simulator_service.ids, "last_pure_ml_diagnostics", {})
    attack_mode, target_patient = global_simulator_service.get_attack_state()
    return {
        "diagnostics": diagnostics,
        "system_mode": global_simulator_service.get_system_mode(),
        "attack_mode": attack_mode,
        "target_patient": target_patient,
        "model_l1_loaded": global_simulator_service.ids.model_l1 is not None,
        "model_l2_loaded": global_simulator_service.ids.model_l2 is not None,
        "quarantine_count": len(global_simulator_service.ids.quarantine_queue),
    }


@router.get("/ips/state")
def get_ips_state(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns current IPS quarantine queue, blocked clients, and recent alerts."""
    quarantine = []
    for dev_id, item in global_simulator_service.ids.quarantine_queue.items():
        quarantine.append({
            "device_id": dev_id,
            "client_id": item.get("client_id"),
            "reason": item.get("reason"),
            "patient_id": item.get("payload", {}).get("patient_id"),
            "timestamp": item.get("timestamp"),
        })

    blocked = list(global_simulator_service.ids.blocked_clients)

    recent_alerts = (
        db.query(Alert)
        .filter(Alert.status == "Unresolved")
        .order_by(Alert.timestamp.desc())
        .limit(10)
        .all()
    )
    alerts_data = [
        {
            "id": a.id,
            "device_id": a.device_id,
            "patient_id": a.patient_id,
            "severity": a.severity,
            "message": a.message[:200],
            "timestamp": a.timestamp.isoformat() + "Z" if a.timestamp else None,
        }
        for a in recent_alerts
    ]

    return {
        "quarantine_queue": quarantine,
        "blocked_clients": blocked,
        "unresolved_alerts": alerts_data,
        "quarantine_count": len(quarantine),
        "blocked_count": len(blocked),
    }


# ---------------------------------------------------------------------------
# WebSocket: Real-time Adversary Event Stream
# ---------------------------------------------------------------------------

@router.websocket("/ws/events")
async def adversary_events_ws(websocket: WebSocket):
    """
    WebSocket endpoint for real-time adversary console events.
    Streams: sim state changes, ML detections, IPS actions, telemetry snapshots.
    No authentication on WS (JWT in query param or rely on CORS).
    """
    await websocket.accept()
    _adversary_ws_clients.append(websocket)

    # Send current state immediately on connect
    try:
        attack_mode, target_patient = global_simulator_service.get_attack_state()
        diagnostics = getattr(global_simulator_service.ids, "last_pure_ml_diagnostics", {})
        await websocket.send_json({
            "event": "CONNECTED",
            "system_mode": global_simulator_service.get_system_mode(),
            "attack_mode": attack_mode,
            "target_patient": target_patient,
            "diagnostics": diagnostics,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        })

        # Poll and push ML diagnostics every 1.5 seconds
        while True:
            await asyncio.sleep(1.5)
            try:
                diag = getattr(global_simulator_service.ids, "last_pure_ml_diagnostics", {})
                atk_mode, tgt_pt = global_simulator_service.get_attack_state()
                quarantine_count = len(global_simulator_service.ids.quarantine_queue)
                blocked_count = len(global_simulator_service.ids.blocked_clients)

                await websocket.send_json({
                    "event": "TELEMETRY_UPDATE",
                    "system_mode": global_simulator_service.get_system_mode(),
                    "attack_mode": atk_mode,
                    "target_patient": tgt_pt,
                    "diagnostics": diag,
                    "quarantine_count": quarantine_count,
                    "blocked_count": blocked_count,
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                })
            except WebSocketDisconnect:
                break
            except Exception:
                break

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if websocket in _adversary_ws_clients:
            _adversary_ws_clients.remove(websocket)
