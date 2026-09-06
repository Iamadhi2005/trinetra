import hmac
import hashlib
import time
import sqlite3
import pandas as pd

SECRET_KEY = b"hospital_secure_key_2026"

def verify_payload_signature(payload):
    """
    Verifies the cryptographic HMAC signature of an incoming telemetry payload.
    """
    if "signature" not in payload or "vitals" not in payload:
        return False
        
    device_id = payload.get("device_id", "")
    timestamp = payload.get("timestamp", 0)
    vitals = payload["vitals"]
    
    hr = vitals.get("heart_rate", 0)
    spo2 = vitals.get("spo2", 0)
    impedance = vitals.get("lead_impedance", 0)
    pacing = vitals.get("pacing_rate", 0)
    batt = vitals.get("battery", 0)
    inf_rate = vitals.get("infusion_rate", 0)
    
    data_string = f"{device_id}:{timestamp}:{hr:.2f}:{spo2:.2f}:{impedance:.2f}:{pacing:.2f}:{batt:.2f}:{inf_rate:.2f}"
    expected_sig = hmac.new(SECRET_KEY, data_string.encode('utf-8'), hashlib.sha256).hexdigest()
    
    return hmac.compare_digest(payload["signature"], expected_sig)

def is_replay_packet(packet_time, current_time=None, max_delta=1.5):
    """
    Checks if a packet is a replay attack based on its timestamp latency.
    """
    if current_time is None:
        current_time = time.time()
    # If the packet's timestamp is older than the threshold, flag as replay
    return (current_time - packet_time) > max_delta

def init_db(db_path="data/audit_log.db"):
    """
    Initializes the SQLite audit log database and patient profiles.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS security_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            device_id TEXT,
            attack_type TEXT,
            client_ip TEXT,
            status TEXT,
            action_taken TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            patient_id TEXT PRIMARY KEY,
            name TEXT,
            phone TEXT,
            guardian_name TEXT,
            guardian_phone TEXT,
            connected_devices TEXT,
            photo_path TEXT
        )
    """)
    conn.commit()
    conn.close()

def log_security_event(timestamp, device_id, attack_type, client_ip, status, action_taken, db_path="data/audit_log.db"):
    """
    Logs a security alert or bypass event into the database.
    """
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO security_logs (timestamp, device_id, attack_type, client_ip, status, action_taken)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (timestamp, device_id, attack_type, client_ip, status, action_taken))
    conn.commit()
    conn.close()

def get_security_logs(db_path="data/audit_log.db"):
    """
    Retrieves all logged security events as a Pandas DataFrame.
    """
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query("SELECT * FROM security_logs ORDER BY id DESC", conn)
    conn.close()
    return df

def add_patient_to_db(patient_id, name, phone, guardian_name, guardian_phone, devices_list, photo_path, db_path="data/audit_log.db"):
    """
    Saves a new patient profile into the SQLite database.
    """
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    devices_str = ",".join(devices_list)
    cursor.execute("""
        INSERT OR REPLACE INTO patients (patient_id, name, phone, guardian_name, guardian_phone, connected_devices, photo_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (patient_id, name, phone, guardian_name, guardian_phone, devices_str, photo_path))
    conn.commit()
    conn.close()

def get_patients_from_db(db_path="data/audit_log.db"):
    """
    Loads all patient profiles from the SQLite database.
    """
    init_db(db_path)
    conn = sqlite3.connect(db_path)
    df = pd.read_sql_query("SELECT * FROM patients", conn)
    conn.close()
    return df

