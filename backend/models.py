import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Nurse") # Admin, Doctor, Nurse, Operator, Viewer
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, default=45)
    phone = Column(String)
    guardian_name = Column(String)
    guardian_phone = Column(String)
    photo_path = Column(String, default="")
    status = Column(String, default="Normal") # Normal, Critical, Quarantine
    gender = Column(String, default="Male")
    blood_group = Column(String, default="O+")
    ward_number = Column(String, default="ICU-A")
    bed_number = Column(String, default="Bed-01")
    doctor_assigned = Column(String, default="Dr. Sarah Connor")
    admission_date = Column(DateTime, default=datetime.datetime.utcnow)
    is_calibrated = Column(Boolean, default=False)
    calibration_progress = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    devices = relationship("Device", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")

class Device(Base):
    __tablename__ = "devices"
    id = Column(String, primary_key=True, index=True) # MAC / Device ID
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # ECG Monitor, Pulse Oximeter, Pacemaker, Infusion Pump
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    ip_address = Column(String, default="192.168.1.100")
    mac_address = Column(String, default="00:1B:44:11:3A:B7")
    port = Column(Integer, default=1883)
    battery = Column(Integer, default=100)
    firmware_version = Column(String, default="v2.4.12")
    signal_strength = Column(String, default="Excellent")
    status = Column(String, default="Online") # Online, Offline, Fault, Quarantine
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="devices")
    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")
    security_events = relationship("SecurityEvent", back_populates="device", cascade="all, delete-orphan")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    device_id = Column(String, ForeignKey("devices.id"), nullable=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    severity = Column(String, default="High") # Low, Medium, High, Critical
    message = Column(Text, nullable=False)
    status = Column(String, default="Unresolved") # Unresolved, Acknowledged, Resolved
    resolution_notes = Column(Text, default="")

    device = relationship("Device", back_populates="alerts")
    patient = relationship("Patient", back_populates="alerts")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    username = Column(String, nullable=False)
    action = Column(String, nullable=False)
    target = Column(String, nullable=False)
    severity = Column(String, default="Info") # Info, Warning, Critical
    result = Column(String, default="Success")

class SecurityEvent(Base):
    __tablename__ = "security_events"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    device_id = Column(String, ForeignKey("devices.id"), nullable=True)
    attack_type = Column(String, nullable=False) # DoS, MitM, Replay, Fault, Override
    client_ip = Column(String, default="192.168.1.50")
    status = Column(String, default="Quarantine") # Blocked, Quarantine, Dismissed
    action_taken = Column(String, default="Moved to Quarantine")

    device = relationship("Device", back_populates="security_events")

class NetworkPacket(Base):
    __tablename__ = "network_packets"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    client_id = Column(String, nullable=False)
    packet_size = Column(Integer, default=148)
    latency = Column(Float, default=8.0)
    packet_loss = Column(Float, default=0.0)

class MLModelRecord(Base):
    __tablename__ = "models"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    version = Column(String, default="v1.0")
    accuracy = Column(Float, default=0.982)
    precision = Column(Float, default=0.975)
    recall = Column(Float, default=0.989)
    f1_score = Column(Float, default=0.982)
    roc_auc = Column(Float, default=0.991)
    feature_importances = Column(Text, default="{}")
    last_trained = Column(DateTime, default=datetime.datetime.utcnow)

class Setting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)

class IPSRule(Base):
    __tablename__ = "ips_rules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    enabled = Column(Boolean, default=True)
    threshold = Column(Float, default=5.0)

class QuarantineRecord(Base):
    __tablename__ = "quarantine"
    device_id = Column(String, primary_key=True, index=True)
    payload = Column(Text, nullable=False)
    client_id = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    file_path = Column(String, nullable=False)
    report_type = Column(String, default="Security Audit")
    kpis = Column(Text, default="{}")
