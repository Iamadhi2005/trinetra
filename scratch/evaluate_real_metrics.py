import os
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)

def evaluate_models():
    print("==================================================================")
    print("Evaluating REAL Multi-Attack ML Performance on CIC-IoMT Dataset   ")
    print("==================================================================")
    
    l2_path = "models/model_l2.joblib"
    if not os.path.exists(l2_path):
        print("[ERROR] model_l2.joblib not found!")
        return
        
    model_l2 = joblib.load(l2_path)
    print(f"Loaded Layer 2 Model: {type(model_l2).__name__} with {model_l2.n_estimators} decision trees")
    
    data_dir = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\WiFI_and_MQTT\attacks\csv\test"
    
    files = {
        "Benign (Normal)": ("Benign_test.pcap.csv", 0),
        "ARP Spoofing": ("ARP_Spoofing_test.pcap.csv", 1),
        "MQTT DDoS Connect Flood": ("MQTT-DDoS-Connect_Flood_test.pcap.csv", 1),
        "MQTT DDoS Publish Flood": ("MQTT-DDoS-Publish_Flood_test.pcap.csv", 1)
    }
    
    dfs = []
    print("\n[Step 1] Loading all attack & benign test files:")
    for label_name, (fname, target_val) in files.items():
        fpath = os.path.join(data_dir, fname)
        if os.path.exists(fpath):
            df = pd.read_csv(fpath)
            df.columns = [c.strip() for c in df.columns]
            df['label'] = target_val
            df['category'] = label_name
            dfs.append(df)
            print(f"  • {label_name:25s} : {len(df):,} flows")
            
    eval_df = pd.concat(dfs, ignore_index=True)
    features = ['Duration', 'Rate', 'Tot size', 'AVG', 'IAT']
    
    X_test = eval_df[features].fillna(0)
    y_true = eval_df['label']
    
    print(f"\nTotal Evaluated Dataset: {len(eval_df):,} flows across 4 categories")
    
    print("\n[Step 2] Running mathematical inference through Scikit-Learn...")
    y_pred = model_l2.predict(X_test)
    y_proba = model_l2.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    roc = roc_auc_score(y_true, y_proba)
    cm = confusion_matrix(y_true, y_pred)
    
    tn, fp, fn, tp = cm.ravel()
    
    print("\n==================================================================")
    print("REAL MATHEMATICAL RESULTS FOR LAYER 2 (MULTI-ATTACK CLASSIFIER):")
    print("==================================================================")
    print(f"Total Evaluated Flows: {len(y_true):,}")
    print(f"  • True Positives  (TP) : {tp:,} (Attacks correctly caught)")
    print(f"  • True Negatives  (TN) : {tn:,} (Benign correctly allowed)")
    print(f"  • False Positives (FP) : {fp:,} (Benign falsely flagged)")
    print(f"  • False Negatives (FN) : {fn:,} (Attacks missed)")
    print("------------------------------------------------------------------")
    print(f"  • REAL Precision : {prec * 100:.2f}%  (TP / (TP + FP))")
    print(f"  • REAL Recall    : {rec * 100:.2f}%  (TP / (TP + FN))")
    print(f"  • REAL Accuracy  : {acc * 100:.2f}%  ((TP + TN) / Total)")
    print(f"  • REAL F1-Score  : {f1 * 100:.2f}%")
    print(f"  • REAL ROC-AUC   : {roc:.4f}")
    print("==================================================================")
    
    # Per-attack category recall breakdown
    print("\nPer-Attack Category Detection Rate (Recall):")
    for cat in eval_df['category'].unique():
        sub = eval_df[eval_df['category'] == cat]
        sub_X = sub[features].fillna(0)
        sub_y = sub['label']
        sub_pred = model_l2.predict(sub_X)
        if sub_y.iloc[0] == 1:
            cat_rec = np.mean(sub_pred == 1) * 100
            print(f"  • {cat:28s}: {cat_rec:.2f}% Caught")
        else:
            cat_spec = np.mean(sub_pred == 0) * 100
            print(f"  • {cat:28s}: {cat_spec:.2f}% Allowed (Specificity)")
            
    print("==================================================================")

if __name__ == "__main__":
    evaluate_models()
