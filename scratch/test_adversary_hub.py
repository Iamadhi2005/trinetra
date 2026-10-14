import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_full_adversary_pipeline():
    print("=== TRINETRA ADVERSARY HUB VERIFICATION TEST ===")
    
    # 1. Login
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] 1. Authenticated as Admin. JWT Token acquired.")

    # 2. Connect Session
    connect_resp = requests.post(f"{BASE_URL}/api/adversary/session/connect", headers=headers)
    assert connect_resp.status_code == 200, f"Connect failed: {connect_resp.text}"
    conn_data = connect_resp.json()
    assert conn_data["status"] == "connected"
    print(f"[PASS] 2. Adversary session established. Connected targets: {len(conn_data['targets'])}, Scenarios: {len(conn_data['scenarios'])}")
    print(f"       Model Status: {conn_data['model_status']}")
    patient_id = conn_data["targets"][0]["patient_id"]
    patient_name = conn_data["targets"][0]["patient_name"]
    print(f"       Target Selected: {patient_name} ({patient_id})")

    # 3. Launch Simulation Scenario A: DoS
    sim_payload = {
        "scenario": "DoS",
        "target_patient": patient_id,
        "config": {"rate": 50, "duration": 10, "intensity": "High"}
    }
    sim_resp = requests.post(f"{BASE_URL}/api/adversary/simulate", json=sim_payload, headers=headers)
    assert sim_resp.status_code == 200, f"Simulate DoS failed: {sim_resp.text}"
    sim_record = sim_resp.json()
    sim_id = sim_record["sim_id"]
    print(f"[PASS] 3. Scenario A (DoS) launched. Sim ID: {sim_id}, State: {sim_record['state']}")
    assert sim_record["state"] == "RUNNING"
    assert len(sim_record["stages"]) >= 3 # CONFIGURED, AUTHORIZED, RUNNING

    # 4. Check Sim Status & ML Diagnostics
    time.sleep(2)
    status_resp = requests.get(f"{BASE_URL}/api/adversary/simulate/{sim_id}", headers=headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    print(f"[PASS] 4. Simulation polled. State: {status_data['state']}, Stages: {[s['stage'] for s in status_data['stages']]}")
    if status_data.get("ml_result"):
        print(f"       ML Result attached: {bool(status_data['ml_result'])}")

    # 5. Complete Simulation
    complete_resp = requests.post(f"{BASE_URL}/api/adversary/simulate/{sim_id}/complete", headers=headers)
    assert complete_resp.status_code == 200
    comp_data = complete_resp.json()
    print(f"[PASS] 5. Simulation completed. Final state: {comp_data['state']}, Outcome: {comp_data['final_status']}")
    assert comp_data["state"] == "COMPLETED"

    # 6. Launch Scenario B: Tampering & then Cancel
    sim_payload_b = {
        "scenario": "Tampering",
        "target_patient": patient_id,
        "config": {"heart_rate": 185, "spo2": 72, "lead_impedance": 450}
    }
    sim_b_resp = requests.post(f"{BASE_URL}/api/adversary/simulate", json=sim_payload_b, headers=headers)
    assert sim_b_resp.status_code == 200
    sim_b_id = sim_b_resp.json()["sim_id"]
    print(f"[PASS] 6. Scenario B (Tampering) launched. Sim ID: {sim_b_id}")

    time.sleep(1)
    cancel_resp = requests.post(f"{BASE_URL}/api/adversary/simulate/{sim_b_id}/cancel", headers=headers)
    assert cancel_resp.status_code == 200
    cancel_data = cancel_resp.json()
    print(f"[PASS] 7. Simulation cancelled. State: {cancel_data['state']}")
    assert cancel_data["state"] == "CANCELLED"

    # 8. Verify Evidence Registry
    evidence_resp = requests.get(f"{BASE_URL}/api/adversary/evidence", headers=headers)
    assert evidence_resp.status_code == 200
    ev_data = evidence_resp.json()
    print(f"[PASS] 8. Evidence registry checked. Total recorded simulations: {ev_data['total']}")
    assert ev_data["total"] >= 2

    # 9. Export Evidence Report
    export_resp = requests.get(f"{BASE_URL}/api/adversary/evidence/{sim_id}/export", headers=headers)
    assert export_resp.status_code == 200
    exp_report = export_resp.json()
    print(f"[PASS] 9. Evidence report exported. Report type: {exp_report['report_type']}")
    print(f"       Exported by: {exp_report['exported_by']}, Disclaimer present: {bool(exp_report['disclaimer'])}")

    # 10. Disconnect Session
    disc_resp = requests.post(f"{BASE_URL}/api/adversary/session/disconnect", headers=headers)
    assert disc_resp.status_code == 200
    print(f"[PASS] 10. Adversary session cleanly disconnected. Status: {disc_resp.json()['status']}")

    print("\n>>> ALL 10 TRINETRA ADVERSARY PIPELINE TESTS PASSED WITH 100% SUCCESS! <<<")

if __name__ == "__main__":
    test_full_adversary_pipeline()
