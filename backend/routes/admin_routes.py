import secrets
import string
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Patient, DeviceRegistration, AuditLog
from backend.schemas import (
    UserCreate, UserResponse, UserUpdate,
    AdminPasswordReset, AssignDoctorRequest, DeviceRegistrationResponse
)
from backend.auth import get_password_hash, require_role, get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])

def generate_secure_temporary_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    # Ensure at least one uppercase, lowercase, digit, and special char
    pwd = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%&*")
    ]
    for _ in range(length - 4):
        pwd.append(secrets.choice(alphabet))
    secrets.SystemRandom().shuffle(pwd)
    return "".join(pwd)

@router.get("/accounts", response_model=List[UserResponse])
def list_accounts(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """Retrieve all system accounts across roles with authorization status."""
    return db.query(User).order_by(User.id.asc()).all()

@router.post("/accounts", response_model=UserResponse)
def create_account(
    req: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """Provision a new user account (Doctor, Patient, Tech, Admin) with secure password hash."""
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{req.username}' is already in use"
        )
    
    new_user = User(
        username=req.username.strip().lower(),
        password_hash=get_password_hash(req.password),
        role=req.role,
        name=req.name,
        department=req.department or "General",
        assigned_patient_id=req.assigned_patient_id,
        is_active=True,
        must_change_password=True
    )
    db.add(new_user)
    
    audit = AuditLog(
        username=admin_user.username,
        action="PROVISION_USER",
        target=f"User:{req.username} Role:{req.role}",
        severity="Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/accounts/{user_id}", response_model=UserResponse)
def update_account(
    user_id: int,
    req: UserUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """Modify account metadata, role, or patient assignment."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if req.name is not None:
        user.name = req.name
    if req.role is not None:
        user.role = req.role
    if req.department is not None:
        user.department = req.department
    if req.assigned_patient_id is not None:
        user.assigned_patient_id = req.assigned_patient_id
    if req.is_active is not None:
        user.is_active = req.is_active
    
    audit = AuditLog(
        username=admin_user.username,
        action="UPDATE_USER",
        target=f"User:{user.username}",
        severity="Info",
        result="Success"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user

@router.post("/assign-doctor")
def assign_doctor_to_patient(
    req: AssignDoctorRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """Assign or reassign an authorized attending doctor to a clinical patient."""
    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {req.patient_id} not found")
    
    old_doctor = patient.doctor_assigned
    patient.doctor_assigned = req.doctor_name
    
    # Audit log
    audit = AuditLog(
        username=admin_user.username,
        action="ASSIGN_DOCTOR",
        target=f"Patient:{req.patient_id} From:{old_doctor} To:{req.doctor_name}",
        severity="Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()
    
    return {
        "message": f"Successfully assigned {req.doctor_name} to patient {patient.name} ({req.patient_id})",
        "patient_id": patient.id,
        "doctor_assigned": patient.doctor_assigned
    }

@router.post("/reset-password")
def reset_password(
    req: AdminPasswordReset,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """Reset user password, issue temporary password and enforce first-login password change."""
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    temp_password = req.new_temporary_password or generate_secure_temporary_password()
    user.password_hash = get_password_hash(temp_password)
    user.must_change_password = True
    
    audit = AuditLog(
        username=admin_user.username,
        action="ADMIN_PASSWORD_RESET",
        target=f"User:{user.username}",
        severity="Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()
    
    return {
        "message": f"Temporary password generated for user '{user.username}'. Password change will be required on first login.",
        "username": user.username,
        "temporary_password": temp_password,
        "must_change_password": True
    }

@router.post("/disable-account/{user_id}")
def disable_account(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """Disable or revoke access for an account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.username == admin_user.username:
        raise HTTPException(status_code=400, detail="Cannot disable your own active admin account")
    
    user.is_active = False
    
    # Deactivate any registered devices for this user
    db.query(DeviceRegistration).filter(DeviceRegistration.user_id == user_id).update({"is_active": False})
    
    audit = AuditLog(
        username=admin_user.username,
        action="DISABLE_ACCOUNT",
        target=f"User:{user.username}",
        severity="Critical",
        result="Success"
    )
    db.add(audit)
    db.commit()
    
    return {"message": f"Account '{user.username}' has been disabled and all device sessions revoked"}

@router.post("/enable-account/{user_id}")
def enable_account(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """Re-enable a suspended account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = True
    
    audit = AuditLog(
        username=admin_user.username,
        action="ENABLE_ACCOUNT",
        target=f"User:{user.username}",
        severity="Info",
        result="Success"
    )
    db.add(audit)
    db.commit()
    
    return {"message": f"Account '{user.username}' has been enabled"}

@router.get("/devices", response_model=List[DeviceRegistrationResponse])
def list_authorized_devices(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """List all registered mobile and client devices across hospital accounts."""
    return db.query(DeviceRegistration).order_by(DeviceRegistration.last_registered.desc()).all()

@router.delete("/devices/{reg_id}")
def revoke_device(
    reg_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_role(["Admin"]))
):
    """Revoke authorized status for a compromised or retired mobile device."""
    dev = db.query(DeviceRegistration).filter(DeviceRegistration.id == reg_id).first()
    if not dev:
        raise HTTPException(status_code=404, detail="Device registration not found")
    
    user = db.query(User).filter(User.id == dev.user_id).first()
    target_username = user.username if user else "Unknown"
    
    db.delete(dev)
    audit = AuditLog(
        username=admin_user.username,
        action="REVOKE_DEVICE",
        target=f"Device:{dev.device_id} User:{target_username}",
        severity="Warning",
        result="Success"
    )
    db.add(audit)
    db.commit()
    
    return {"message": f"Device authorization revoked for {dev.device_name} ({dev.device_id})"}
