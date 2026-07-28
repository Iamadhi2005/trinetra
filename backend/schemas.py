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

class PatientCreate(PatientBase):
    connected_devices: Optional[List[str]] = []

class PatientResponse(PatientBase):
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
    device_id: Optional[str]
    patient_id: Optional[str]
    severity: str
    message: str
    status: str
    resolution_notes: Optional[str]

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

# Dashboard Response
class DashboardMetrics(BaseModel):
    active_devices: int
    patients_count: int
    active_alerts_count: int
    attacks_today: int
    threat_level: str
    network_health: str
    uptime: str
