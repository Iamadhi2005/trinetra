import os
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
import joblib

def train_models():
    print("==================================================================")
    print("  TRINETRA Real Multi-Attack CIC-IoMT-2024 ML Pipeline Training   ")
    print("==================================================================")
    
    data_dir = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\WiFI_and_MQTT\attacks\csv\test"
    
    benign_path = os.path.join(data_dir, "Benign_test.pcap.csv")
    arp_path = os.path.join(data_dir, "ARP_Spoofing_test.pcap.csv")
    mqtt_connect_path = os.path.join(data_dir, "MQTT-DDoS-Connect_Flood_test.pcap.csv")
    mqtt_publish_path = os.path.join(data_dir, "MQTT-DDoS-Publish_Flood_test.pcap.csv")
    
    print("\n[Step 1/3] Loading Real Multi-Vector CIC-IoMT-2024 CSV datasets...")
    
    dfs = []
    
    # 1. Benign Hospital Traffic
    if os.path.exists(benign_path):
        df_b = pd.read_csv(benign_path)
        df_b.columns = [c.strip() for c in df_b.columns]
        df_b['target_label'] = 0
        df_b['attack_type'] = 'Benign'
        dfs.append(df_b)
        print(f"  • Benign Telemetry Loaded     : {len(df_b):,} flows")
        
    # 2. ARP Spoofing Attack
    if os.path.exists(arp_path):
        df_arp = pd.read_csv(arp_path)
        df_arp.columns = [c.strip() for c in df_arp.columns]
        df_arp['target_label'] = 1
        df_arp['attack_type'] = 'ARP_Spoofing'
        dfs.append(df_arp)
        print(f"  • ARP Spoofing Attack Loaded  : {len(df_arp):,} flows")
        
    # 3. MQTT DDoS Connect Flood
    if os.path.exists(mqtt_connect_path):
        df_mc = pd.read_csv(mqtt_connect_path)
        df_mc.columns = [c.strip() for c in df_mc.columns]
        df_mc['target_label'] = 1
        df_mc['attack_type'] = 'MQTT_DDoS_Connect_Flood'
        dfs.append(df_mc)
        print(f"  • MQTT DDoS Connect Flood     : {len(df_mc):,} flows")
        
    # 4. MQTT DDoS Publish Flood
    if os.path.exists(mqtt_publish_path):
        df_mp = pd.read_csv(mqtt_publish_path)
        df_mp.columns = [c.strip() for c in df_mp.columns]
        df_mp['target_label'] = 1
        df_mp['attack_type'] = 'MQTT_DDoS_Publish_Flood'
        dfs.append(df_mp)
        print(f"  • MQTT DDoS Publish Flood     : {len(df_mp):,} flows")
        
    if not dfs:
        print("[ERROR] No dataset CSV files found!")
        return False
        
    combined_df = pd.concat(dfs, ignore_index=True)
    print(f"\nTotal Multi-Vector Training Flows: {len(combined_df):,} flows")
    
    features = ['Duration', 'Rate', 'Tot size', 'AVG', 'IAT']
    
    X = combined_df[features].fillna(0)
    y = combined_df['target_label']
    
    # Train Layer 2 Network Classifier (Supervised Random Forest with 50 Trees)
    print("\n[Step 2/3] Training Layer 2 Multi-Attack Random Forest Classifier...")
    model_l2 = RandomForestClassifier(n_estimators=50, max_depth=15, random_state=42, n_jobs=-1)
    model_l2.fit(X, y)
    
    os.makedirs("models", exist_ok=True)
    joblib.dump(model_l2, "models/model_l2.joblib")
    print("[SUCCESS] Trained Layer 2 model saved to models/model_l2.joblib")
    
    # Train Layer 1 Anomaly Detector (Unsupervised Isolation Forest)
    print("\n[Step 3/3] Training Layer 1 Isolation Forest Physiological Guard...")
    X_l1 = pd.DataFrame({
        'heart_rate': np.random.normal(75.0, 5.0, 20000),
        'spo2': np.random.normal(98.0, 0.5, 20000),
        'lead_impedance': np.random.normal(500.0, 10.0, 20000),
        'infusion_rate': np.random.normal(5.0, 0.5, 20000)
    })
    
    model_l1 = IsolationForest(contamination=0.03, random_state=42)
    model_l1.fit(X_l1)
    joblib.dump(model_l1, "models/model_l1.joblib")
    print("[SUCCESS] Trained Layer 1 model saved to models/model_l1.joblib")
    
    print("\n==================================================================")
    print(f"ALL MODELS TRAINED SUCCESSFULLY ON {len(combined_df):,} REAL FLOWS!")
    print("==================================================================")
    return True

if __name__ == "__main__":
    train_models()
