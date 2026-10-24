"""
TRINETRA Real-Time MQTT Hardware Telemetry Ingestion Bridge
Subscribes to incoming ESP32 / hardware medical sensor telemetry on topic:
hospital/telemetry/#
Passes incoming frames directly through TRINETRA IDS Engine and ML classifiers.
"""

import json
import time
import datetime
import os
import paho.mqtt.client as mqtt
from backend.simulator_service import global_simulator_service
from backend.database import SessionLocal
from backend.models import Patient, Device, Alert, SecurityEvent

MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
MQTT_TOPIC_SUB = "hospital/telemetry/#"
MQTT_ACTUATOR_TOPIC_PREFIX = "hospital/actuator"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT BRIDGE] Connected successfully to MQTT Broker at {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
        client.subscribe(MQTT_TOPIC_SUB)
        print(f"[MQTT BRIDGE] Subscribed to topic stream: {MQTT_TOPIC_SUB}")
    else:
        print(f"[MQTT BRIDGE] Failed to connect to MQTT Broker (Return Code: {rc})")

def on_message(client, userdata, msg):
    try:
        raw_payload = msg.payload.decode("utf-8")
        packet_size = len(msg.payload)
        payload = json.loads(raw_payload)
        
        device_id = payload.get("device_id", "esp32_device")
        patient_id = payload.get("patient_id", "patient_101")
        client_ip = f"esp32_node_{device_id}"
        
        # 1. Process packet through TRINETRA IDS Engine (HMAC + Replay + Layer 1 ML + Layer 2 Flow)
        res = global_simulator_service.ids.process_packet(payload, client_ip, packet_size)
        status = res.get("status", "Normal")
        
        # 2. Update Database and Local Telemetry Cache
        db = SessionLocal()
        try:
            dev = db.query(Device).filter(Device.id == device_id).first()
            if not dev:
                dev = Device(
                    id=device_id,
                    name=f"ESP32 Hardware Monitor ({device_id})",
                    type="Hardware Bio-Sensor",
                    patient_id=patient_id,
                    status=status if status in ["Online", "Quarantine", "Fault"] else "Online",
                    last_seen=datetime.datetime.utcnow()
                )
                db.add(dev)
            else:
                dev.status = status if status in ["Online", "Quarantine", "Fault"] else "Online"
                dev.last_seen = datetime.datetime.utcnow()
                
            vitals = payload.get("vitals", {})
            if "battery" in vitals:
                dev.battery = int(vitals["battery"])
                
            # If Quarantine or Anomaly flagged by ML/HMAC, record Alert
            if status == "Quarantine":
                active_alert = db.query(Alert).filter(
                    Alert.device_id == device_id,
                    Alert.status == "Unresolved"
                ).first()
                if not active_alert:
                    new_mqtt_alert = Alert(
                        device_id=device_id,
                        patient_id=patient_id,
                        severity="Critical",
                        message=res.get("alert", f"Anomaly detected on hardware node {device_id}"),
                        status="Unresolved"
                    )
                    db.add(new_mqtt_alert)
                    db.commit()
                    db.refresh(new_mqtt_alert)
                    # Push notification to authorized users
                    try:
                        from backend.routes.notification_routes import route_security_alert_to_accounts
                        route_security_alert_to_accounts(
                            db, new_mqtt_alert,
                            attack_type="MQTT Hardware Anomaly",
                            clinical_payload={"source_ip": client_id}
                        )
                    except Exception:
                        pass
                else:
                    db.commit()
                
                # 3. Publish Automated IPS Actuator Override back to ESP32
                actuator_topic = f"{MQTT_ACTUATOR_TOPIC_PREFIX}/{patient_id}/{device_id}/control"
                control_payload = json.dumps({
                    "command": "QUARANTINE_OVERRIDE",
                    "mode": "KVO_FALLBACK",
                    "safe_infusion_rate": 1.0,
                    "safe_pacing_rate": 70.0,
                    "reason": res.get("alert", "IPS Intervention Triggered")
                })
                client.publish(actuator_topic, control_payload, qos=1)
                print(f"[IPS ACTUATOR] Quarantine override dispatched to ESP32 on topic: {actuator_topic}")
            else:
                db.commit()
        finally:
            db.close()
            
        # 4. Sync in-memory simulator patient vitals from real ESP32
        p_dev = global_simulator_service.simulator.get_or_create_patient(patient_id)
        vitals = payload.get("vitals", {})
        if "heart_rate" in vitals:
            p_dev.heart_rate = float(vitals["heart_rate"])
        if "spo2" in vitals:
            p_dev.spo2 = float(vitals["spo2"])
        if "lead_impedance" in vitals:
            p_dev.lead_impedance = float(vitals["lead_impedance"])
        if "pacing_rate" in vitals:
            p_dev.pacing_rate = float(vitals["pacing_rate"])
        if "battery" in vitals:
            p_dev.battery = float(vitals["battery"])
        if "infusion_rate" in vitals:
            p_dev.infusion_rate = float(vitals["infusion_rate"])
        p_dev.attack_mode = "Normal" if status != "Quarantine" else "Hardware Anomaly"
            
    except Exception as e:
        print(f"[MQTT BRIDGE ERROR] Failed to process message: {e}")

def start_mqtt_listener():
    """Starts the background MQTT client listener."""
    client = mqtt.Client(client_id="trinetra_soc_bridge")
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
        client.loop_start()
        return client
    except Exception as e:
        print(f"[MQTT BRIDGE] MQTT Broker not reachable at {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}. (Optional when using software simulator).")
        return None

if __name__ == "__main__":
    print("Starting TRINETRA Standalone MQTT Hardware Ingestion Bridge...")
    c = start_mqtt_listener()
    if c:
        try:
            while True:
                time.sleep(1.0)
        except KeyboardInterrupt:
            c.loop_stop()
            print("MQTT Bridge stopped.")
