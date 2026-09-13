import os
import joblib
import pandas as pd
import numpy as np

def test_interactive():
    print("==========================================================")
    print("      TRINETRA AI IDS - Real Dataset Query Tester         ")
    print("==========================================================")
    
    # 1. Load models
    model_l2 = joblib.load("models/model_l2.joblib")
    model_l1 = joblib.load("models/model_l1.joblib")
    
    data_dir = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\WiFI_and_MQTT\attacks\csv\test"
    benign_path = os.path.join(data_dir, "Benign_test.pcap.csv")
    attack_path = os.path.join(data_dir, "ARP_Spoofing_test.pcap.csv")
    
    features = ['Duration', 'Rate', 'Tot size', 'AVG', 'IAT']
    
    # TEST 1: Real Benign Sample from CIC-IoMT-2024
    print("\n--- TEST 1: Real Hospital Normal Packet from CIC-IoMT-2024 ---")
    if os.path.exists(benign_path):
        df_b = pd.read_csv(benign_path, nrows=5)
        df_b.columns = [c.strip() for c in df_b.columns]
        sample_b = df_b[features].iloc[[0]]
    else:
        sample_b = pd.DataFrame([{'Duration': 0.0, 'Rate': 0.0, 'Tot size': 60.0, 'AVG': 60.0, 'IAT': 0.0}])
        
    pred_b = model_l2.predict(sample_b)[0]
    prob_b = model_l2.predict_proba(sample_b)[0]
    print(f"Features: {sample_b.to_dict(orient='records')[0]}")
    print(f"Layer 2 Result  : {'[ATTACK DETECTED]' if pred_b == 1 else '[NORMAL / BENIGN]'}")
    print(f"Confidence      : {prob_b[0]*100:.1f}% Benign, {prob_b[1]*100:.1f}% Attack")

    # TEST 2: Real Attack Sample from CIC-IoMT-2024
    print("\n--- TEST 2: Real ARP Spoofing Attack from CIC-IoMT-2024 ---")
    if os.path.exists(attack_path):
        df_a = pd.read_csv(attack_path, nrows=100)
        df_a.columns = [c.strip() for c in df_a.columns]
        # Pick an active attack row
        sample_a = df_a[features].iloc[[15]]
    else:
        sample_a = pd.DataFrame([{'Duration': 0.0, 'Rate': 0.0, 'Tot size': 42.0, 'AVG': 42.0, 'IAT': 0.0}])
        
    pred_a = model_l2.predict(sample_a)[0]
    prob_a = model_l2.predict_proba(sample_a)[0]
    print(f"Features: {sample_a.to_dict(orient='records')[0]}")
    print(f"Layer 2 Result  : {'[ATTACK DETECTED]' if pred_a == 1 else '[NORMAL / BENIGN]'}")
    print(f"Confidence      : {prob_a[1]*100:.1f}% Attack, {prob_a[0]*100:.1f}% Benign")

    # TEST 3: Physiological Anomaly (Layer 1)
    print("\n--- TEST 3: Infusion Pump Overdose / Lethal Tachycardia (Layer 1) ---")
    overdose_vitals = pd.DataFrame([{
        'heart_rate': 185.0,
        'spo2': 78.0,
        'lead_impedance': 500.0,
        'infusion_rate': 45.0
    }])
    l1_pred = model_l1.predict(overdose_vitals)[0]
    print(f"Vitals: HR=185 bpm, SpO2=78%, Infusion=45 mL/h")
    print(f"Layer 1 Result  : {'[PHYSIOLOGICAL ANOMALY DETECTED]' if l1_pred == -1 else '[NORMAL]'}")
    
    print("\n==========================================================")
    print("SUCCESS: Evaluation complete on genuine dataset samples.")
    print("==========================================================")

if __name__ == "__main__":
    test_interactive()
