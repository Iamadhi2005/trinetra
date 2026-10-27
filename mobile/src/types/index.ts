export interface User {
  id: number;
  username: string;
  name: string;
  role: "Doctor" | "Patient" | "Tech" | "Admin" | "Nurse";
  department?: string;
  assigned_patient_id?: string;
  is_active?: boolean;
  must_change_password?: boolean;
  created_at?: string;
}

export interface Patient {
  id: string;
  name: string;
  age?: number;
  status: string;
  phone?: string;
  ward_number?: string;
  bed_number?: string;
  doctor_assigned?: string;
}

export interface AttackScenario {
  mode: string;
  label: string;
  category: "Layer 1: Medical & Physiology" | "Layer 2: Network & Protocol" | "System Control";
  target: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "SAFE";
  desc: string;
  reportScenario: string;
  payloadEffect: string;
}

export interface AttackState {
  attack_mode: string;
  target_patient: string;
  timestamp?: number;
  attack_label?: string;
  target_device_id?: string;
  target_device_name?: string;
  target_device_type?: string;
  target_patient_name?: string;
  ward_number?: string;
  bed_number?: string;
  severity?: string;
  alert_message?: string;
  action_taken?: string;
}

export interface Alert {
  id: number;
  timestamp: string | number;
  device_id: string;
  device_name: string;
  device_type: string;
  patient_id: string;
  patient_name: string;
  severity: "Critical" | "High" | "Warning" | "Info" | string;
  message: string;
  status: "Unresolved" | "Resolved" | "Acknowledged" | "Investigating" | "Escalated" | "New" | string;
  resolution_notes?: string;
}

export interface AlertDetail {
  alert: Alert;
  patient?: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    blood_group?: string;
    ward_number?: string;
    bed_number?: string;
    doctor_assigned?: string;
    status?: string;
    is_calibrated?: boolean;
    calibration_progress?: number;
  } | null;
  device?: {
    id: string;
    name: string;
    type: string;
    ip_address?: string;
    mac_address?: string;
    port?: number;
    battery?: number;
    firmware_version?: string;
    signal_strength?: string;
    status?: string;
    last_seen?: string;
  } | null;
  security_event?: {
    id: number;
    timestamp?: string;
    attack_type: string;
    client_ip?: string;
    status?: string;
    action_taken?: string;
  } | null;
  notification_payload?: Record<string, any>;
  network_info?: {
    packet_size?: number;
    latency?: number;
    packet_loss?: number;
    broker?: string;
    protocol?: string;
    qos?: number;
  };
}

export interface QuarantineItem {
  device_id: string;
  client_id: string;
  patient_id: string;
  reason: string;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "exploit" | "defense" | "error";
}

export interface NotificationLog {
  id: number;
  alert_id?: number;
  user_id: number;
  title: string;
  body: string;
  payload: string;
  delivery_status: "Sent" | "Delivered" | "Acknowledged" | "Failed";
  channel: "FCM" | "InApp" | "AudibleChannel";
  attempt_count: number;
  created_at: string;
  acknowledged_at?: string;
}

export interface DeviceRegistration {
  id: number;
  user_id: number;
  device_id: string;
  fcm_token?: string;
  device_name: string;
  platform: string;
  is_active: boolean;
  last_registered: string;
}
