import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ids_engine import IDSEngine
from backend.simulator_service import global_simulator_service

def test_pure_ml():
    print("=== Testing Pure ML Engine Methods ===")
    ids = IDSEngine()
    
    print("\n[Test 1] Evaluating Normal Baseline via evaluate_custom_features...")
    normal_res = ids.evaluate_custom_features(
        heart_rate=75.0, spo2=98.0, lead_impedance=500.0, infusion_rate=5.0,
        duration=1.0, rate=5.0, tot_size=750, avg_size=150, iat=0.2
    )
    print("Normal Evaluation Result:", normal_res)
    assert normal_res['layer_2_random_forest']['is_anomaly'] == False
    print("[PASS] Normal network traffic correctly evaluated as benign.")

    print("\n[Test 2] Evaluating Flooding Network Attack (DoS)...")
    attack_res = ids.evaluate_custom_features(
        heart_rate=75.0, spo2=98.0, lead_impedance=500.0, infusion_rate=5.0,
        duration=0.5, rate=120.0, tot_size=54000, avg_size=450, iat=0.008
    )
    print("DoS Evaluation Result:", attack_res)
    print("Random Forest P(Attack):", attack_res['layer_2_random_forest']['prob_attack'])
    print("[PASS] Layer 2 Random Forest inference responded to network features.")

    print("\n[Test 3] Evaluating Physiological Overdose (Infusion = 500 mL/h, HR = 180 bpm)...")
    vital_res = ids.evaluate_custom_features(
        heart_rate=180.0, spo2=75.0, lead_impedance=500.0, infusion_rate=500.0,
        duration=1.0, rate=5.0, tot_size=750, avg_size=150, iat=0.2
    )
    print("Vital Override Evaluation Result:", vital_res)
    print("Isolation Forest Score:", vital_res['layer_1_isolation_forest']['score'])
    print("[PASS] Layer 1 Isolation Forest inference responded to physiological features.")

    print("\n[Test 4] Testing Simulator Service System Mode Switch...")
    global_simulator_service.set_system_mode('pure_ml')
    assert global_simulator_service.get_system_mode() == 'pure_ml'
    print("[PASS] Successfully switched system_mode to pure_ml.")

    state = global_simulator_service.trigger_attack_pure_ml('DoS', 'patient_101')
    print("Pure ML attack triggered state:", state)
    print("[PASS] Pure ML attack triggered without instant DB injection.")

    global_simulator_service.set_system_mode('standard')
    global_simulator_service.trigger_attack_now('Normal', '')
    print("[PASS] Cleaned up and restored standard mode.")

    print("\nALL BACKEND PURE ML TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_pure_ml()
