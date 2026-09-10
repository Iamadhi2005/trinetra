export interface Patient {
  id: string;
  name: string;
  age?: number;
  status: string;
  phone?: string;
  ward_number?: string;
  bed_number?: string;
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
  timestamp: number;
  device_id: string;
  device_name: string;
  device_type: string;
  patient_id: string;
  patient_name: string;
  severity: "Critical" | "High" | "Warning" | "Info" | string;
  message: string;
  status: "Unresolved" | "Resolved" | string;
  resolution_notes?: string;
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
