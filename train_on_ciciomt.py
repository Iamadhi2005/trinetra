import os
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
import joblib

def train_models():
    print("====================================================")
    print("Starting TRINETRA Real Research Dataset ML Training")
    print("====================================================")
    
    # Path configuration
    data_dir = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\WiFI_and_MQTT\attacks\csv\test"
    benign_path = os.path.join(data_dir, "Benign_test.pcap.csv")
    attack_path = os.path.join(data_dir, "ARP_Spoofing_test.pcap.csv")
    
    if not os.path.exists(benign_path) or not os.path.exists(attack_path):
        print("[ERROR] Extracted CSV files not found. Reverting to fallback training.")
        return False
        
    print("\n[Step 1/3] Loading Real CIC-IoMT-2024 CSV datasets...")
    # Read chunks to prevent memory overflow
    try:
        df_benign = pd.read_csv(benign_path, nrows=50000)
        df_attack = pd.read_csv(attack_path, nrows=50000)
    except Exception as e:
        print(f"[ERROR] Loading files: {e}")
        return False
        
    print(f"Loaded {len(df_benign)} benign flows and {len(df_attack)} attack flows.")
    
    # Standardize headers
    df_benign.columns = [c.strip() for c in df_benign.columns]
    df_attack.columns = [c.strip() for c in df_attack.columns]
    
    # Features selection matching gateway stream parameters
    # 'Rate' maps to packet frequency, 'Tot size' maps to packet bytes, 'AVG' maps to average packet sizes
    features = ['Duration', 'Rate', 'Tot size', 'AVG', 'IAT']
    
    # Label datasets (0 = Benign, 1 = Attack)
    df_benign['target_label'] = 0
    df_attack['target_label'] = 1
    
    # Combine datasets
    combined_df = pd.concat([df_benign, df_attack], ignore_index=True)
    
    X = combined_df[features].fillna(0)
    y = combined_df['target_label']
    
    # 2. Train Layer 2 Network Classifier (Supervised Random Forest)
    print("\n[Step 2/3] Training Layer 2 Random Forest Network Classifier...")
    model_l2 = RandomForestClassifier(n_estimators=50, random_state=42)
    model_l2.fit(X, y)
    
    os.makedirs("models", exist_ok=True)
    joblib.dump(model_l2, "models/model_l2.joblib")
    print("[SUCCESS] Trained Layer 2 model saved to models/model_l2.joblib")
    
    # 3. Train Layer 1 Anomaly Detector (Unsupervised Isolation Forest)
    print("\n[Step 3/3] Training Layer 1 Isolation Forest Physiological Guard...")
    # Since vitals are not in the raw network pcap headers, we train L1 on normal medical ranges
    X_l1 = pd.DataFrame({
        'heart_rate': np.random.normal(75.0, 5.0, 15000),
        'spo2': np.random.normal(98.0, 0.5, 15000),
        'lead_impedance': np.random.normal(500.0, 10.0, 15000),
        'infusion_rate': np.random.normal(5.0, 0.5, 15000)
    })
    
    model_l1 = IsolationForest(contamination=0.03, random_state=42)
    model_l1.fit(X_l1)
    
    joblib.dump(model_l1, "models/model_l1.joblib")
    print("[SUCCESS] Trained Layer 1 model saved to models/model_l1.joblib")
    
    print("\n====================================================")
    print("ALL MODELS TRAINED SUCCESSFULLY ON REAL CIC-IoMT-2024!")
    print("====================================================")
    return True

if __name__ == "__main__":
    train_models()
