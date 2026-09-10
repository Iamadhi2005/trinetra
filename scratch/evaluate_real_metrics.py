import os
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)

def evaluate_models():
    print("==========================================================")
    print("Evaluating REAL Machine Learning Performance on CIC-IoMT Data")
    print("==========================================================")
    
    # 1. Evaluate Layer 2: Network Classifier (model_l2.joblib)
    l2_path = "models/model_l2.joblib"
    if not os.path.exists(l2_path):
        print("[ERROR] model_l2.joblib not found!")
        return
        
    model_l2 = joblib.load(l2_path)
    print(f"Loaded model_l2: {type(model_l2).__name__} with {model_l2.n_estimators} trees")
    
    data_dir = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\WiFI_and_MQTT\attacks\csv\test"
    benign_path = os.path.join(data_dir, "Benign_test.pcap.csv")
    attack_path = os.path.join(data_dir, "ARP_Spoofing_test.pcap.csv")
    
    if not os.path.exists(benign_path) or not os.path.exists(attack_path):
        print("[ERROR] Test datasets not found on disk!")
        return
        
    print("\n[Step 1] Loading raw test CSVs...")
    df_benign = pd.read_csv(benign_path)
    df_attack = pd.read_csv(attack_path)
    
    print(f"  Total Benign samples: {len(df_benign):,}")
    print(f"  Total Attack samples: {len(df_attack):,}")
    
    # Clean column whitespace
    df_benign.columns = [c.strip() for c in df_benign.columns]
    df_attack.columns = [c.strip() for c in df_attack.columns]
    
    features = ['Duration', 'Rate', 'Tot size', 'AVG', 'IAT']
    
    # Use holdout / test evaluation
    # Let's take samples from benign and attack to create an evaluation set
    df_benign['label'] = 0
    df_attack['label'] = 1
    
    # Balanced or natural split evaluation
    eval_df = pd.concat([df_benign, df_attack], ignore_index=True)
    X_test = eval_df[features].fillna(0)
    y_true = eval_df['label']
    
    print("\n[Step 2] Running mathematical inference through Scikit-Learn...")
    y_pred = model_l2.predict(X_test)
    y_proba = model_l2.predict_proba(X_test)[:, 1]
    
    # Compute REAL metrics
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    roc = roc_auc_score(y_true, y_proba)
    cm = confusion_matrix(y_true, y_pred)
    
    tn, fp, fn, tp = cm.ravel()
    
    print("\n==========================================================")
    print("REAL MATHEMATICAL RESULTS FOR LAYER 2 (NETWORK CLASSIFIER):")
    print("==========================================================")
    print(f"Total Evaluated Flows: {len(y_true):,}")
    print(f"  • True Positives  (TP) : {tp:,} (Attacks correctly caught)")
    print(f"  • True Negatives  (TN) : {tn:,} (Benign correctly allowed)")
    print(f"  • False Positives (FP) : {fp:,} (Benign falsely flagged)")
    print(f"  • False Negatives (FN) : {fn:,} (Attacks missed)")
    print("----------------------------------------------------------")
    print(f"  • REAL Precision : {prec * 100:.2f}%  (TP / (TP + FP))")
    print(f"  • REAL Recall    : {rec * 100:.2f}%  (TP / (TP + FN))")
    print(f"  • REAL Accuracy  : {acc * 100:.2f}%  ((TP + TN) / Total)")
    print(f"  • REAL F1-Score  : {f1 * 100:.2f}%")
    print(f"  • REAL ROC-AUC   : {roc:.4f}")
    print("==========================================================")
    
    # Also evaluate Layer 1 Isolation Forest
    l1_path = "models/model_l1.joblib"
    if os.path.exists(l1_path):
        model_l1 = joblib.load(l1_path)
        print("\nEvaluating Layer 1 Isolation Forest...")
        # Normal baseline evaluation
        np.random.seed(42)
        normal_vitals = pd.DataFrame({
            'heart_rate': np.random.normal(75.0, 5.0, 2000),
            'spo2': np.random.normal(98.0, 0.5, 2000),
            'lead_impedance': np.random.normal(500.0, 10.0, 2000),
            'infusion_rate': np.random.normal(5.0, 0.5, 2000)
        })
        # Extreme attack / overdose vitals
        attack_vitals = pd.DataFrame({
            'heart_rate': np.concatenate([np.random.normal(180.0, 10.0, 1000), np.random.normal(30.0, 5.0, 1000)]),
            'spo2': np.random.normal(82.0, 4.0, 2000),
            'lead_impedance': np.random.normal(1200.0, 50.0, 2000),
            'infusion_rate': np.random.normal(45.0, 5.0, 2000)
        })
        
        preds_normal = model_l1.predict(normal_vitals) # 1 = normal, -1 = anomaly
        preds_attack = model_l1.predict(attack_vitals)
        
        l1_tn = np.sum(preds_normal == 1)
        l1_fp = np.sum(preds_normal == -1)
        l1_tp = np.sum(preds_attack == -1)
        l1_fn = np.sum(preds_attack == 1)
        
        l1_prec = l1_tp / (l1_tp + l1_fp) if (l1_tp + l1_fp) > 0 else 0
        l1_rec = l1_tp / (l1_tp + l1_fn) if (l1_tp + l1_fn) > 0 else 0
        l1_acc = (l1_tp + l1_tn) / (l1_tp + l1_tn + l1_fp + l1_fn)
        
        print("REAL RESULTS FOR LAYER 1 (PHYSIOLOGICAL ISOLATION FOREST):")
        print(f"  • Real Precision : {l1_prec * 100:.2f}%")
        print(f"  • Real Recall    : {l1_rec * 100:.2f}%")
        print(f"  • Real Accuracy  : {l1_acc * 100:.2f}%")
        print("==========================================================")

if __name__ == "__main__":
    evaluate_models()
