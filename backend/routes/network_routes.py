from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import NetworkPacket, AuditLog
from backend.auth import get_current_user, require_role
from backend.simulator_service import global_simulator_service
import random

router = APIRouter(prefix="/api/network", tags=["Network"])

@router.get("/status")
def get_network_status(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    blocked_clients = list(global_simulator_service.ids.blocked_clients)
    active_count = len(global_simulator_service.simulator.patients) * 3
    
    return {
        "broker_status": "Connected",
        "broker_host": "127.0.0.1",
        "broker_port": 1883,
        "connected_clients": active_count,
        "packet_rate": 25.0,
        "packet_loss": 0.0,
        "avg_latency_ms": round(random.uniform(6.0, 10.0), 1),
        "blocked_clients": blocked_clients
    }

@router.post("/unblock")
def unblock_client(
    client_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["Admin", "Operator"]))
):
    if client_id in global_simulator_service.ids.blocked_clients:
        global_simulator_service.ids.blocked_clients.remove(client_id)
        
    audit = AuditLog(
        username=current_user.username,
        action="FIREWALL_UNBLOCK",
        target=client_id,
        severity="Info",
        result="Success"
    )
    db.add(audit)
    db.commit()
    return {"message": f"Client '{client_id}' successfully unblocked from firewall rules."}
