from typing import Optional, List
from pydantic import BaseModel
import datetime

# User & Auth
class UserBase(BaseModel):
    username: str
    name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class LoginRequest(BaseModel):
    username: str
    password: str

# Patient
class PatientBase(BaseModel):
    id: str
    name: str
    age: Optional[int] = 45
    phone: Optional[str] = ""
    guardian_name: Optional[str] = ""
    guardian_phone: Optional[str] = ""
    photo_path: Optional[str] = ""
    status: Optional[str] = "Normal"
    gender: Optional[str] = "Male"
    blood_group: Optional[str] = "O+"
    ward_number: Optional[str] = "ICU-A"
    bed_number: Optional[str] = "Bed-01"
    doctor_assigned: Optional[str] = "Dr. Radhi"
    is_calibrated: Optional[bool] = False
    calibration_progress: Optional[int] = 0

class PatientCreate(PatientBase):
    connected_devices: Optional[List[str]] = []

class PatientResponse(PatientBase):
    admission_date: datetime.datetime
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Device
class DeviceBase(BaseModel):
    id: str
    name: str
    type: str
    patient_id: Optional[str] = None
    ip_address: Optional[str] = "192.168.1.100"
    mac_address: Optional[str] = "00:1B:44:11:3A:B7"
    port: Optional[int] = 1883
    battery: Optional[int] = 100
    firmware_version: Optional[str] = "v2.4.12"
    signal_strength: Optional[str] = "Excellent"
    status: Optional[str] = "Online"

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase):
    last_seen: datetime.datetime

    class Config:
        from_attributes = True

# Alert
class AlertResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    patient_id: Optional[str] = None
    patient_name: Optional[str] = None
    severity: str
    message: str
    status: str
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True

# Audit Log
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    username: str
    action: str
    target: str
    severity: str
    result: str

    class Config:
        from_attributes = True

# Security Event
class SecurityEventResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    device_id: Optional[str]
    attack_type: str
    client_ip: str
    status: str
    action_taken: str

    class Config:
        from_attributes = True

# Active Attack metadata for Dashboard
class ActiveAttackInfo(BaseModel):
    is_active: bool = False
    attack_mode: str = "Normal"
    attack_label: str = "Normal Baseline"
    severity: str = "Normal"
    target_patient_id: Optional[str] = None
    target_patient_name: Optional[str] = None
    ward_number: Optional[str] = None
    bed_number: Optional[str] = None
    target_device_id: Optional[str] = None
    target_device_name: Optional[str] = None
    target_device_type: Optional[str] = None
    alert_message: Optional[str] = None
    action_taken: Optional[str] = None
    timestamp: float = 0.0

# Dashboard Response
class DashboardMetrics(BaseModel):
    active_devices: int
    patients_count: int
    active_alerts_count: int
    attacks_today: int
    threat_level: str
    network_health: str
    uptime: str
    active_attack: Optional[ActiveAttackInfo] = None
    recent_alerts: Optional[List[AlertResponse]] = []

