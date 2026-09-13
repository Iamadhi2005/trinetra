import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

def train_realistic_layer1():
    print("Retraining Layer 1 Isolation Forest with realistic clinical vital distributions...")
    
    np.random.seed(42)
    n_samples = 25000
    
    # Realistic Indian / Global ICU Patient Baseline Distributions:
    # Heart Rate: normal resting 60-95 bpm (mean 76, std 8)
    # SpO2: normal 94% - 100% (uniform/beta distribution heavily skewed to 96-99%)
    # Lead Impedance: normal skin electrode contact 400 - 650 Ohms (mean 500, std 40)
    # Infusion Rate: normal IV medication rate 2.0 - 8.0 mL/h (mean 5.0, std 1.2)
    
    hr_normal = np.clip(np.random.normal(76.0, 8.0, n_samples), 58.0, 105.0)
    spo2_normal = np.clip(np.random.normal(97.5, 1.2, n_samples), 94.0, 100.0)
    imp_normal = np.clip(np.random.normal(500.0, 35.0, n_samples), 400.0, 680.0)
    inf_normal = np.clip(np.random.normal(5.0, 1.0, n_samples), 1.5, 9.5)
    
    X_l1 = pd.DataFrame({
        'heart_rate': hr_normal,
        'spo2': spo2_normal,
        'lead_impedance': imp_normal,
        'infusion_rate': inf_normal
    })
    
    # Contamination set to 0.005 (0.5%) so baseline variations do not flag false positives
    model_l1 = IsolationForest(contamination=0.005, random_state=42, n_estimators=100)
    model_l1.fit(X_l1)
    
    os.makedirs("models", exist_ok=True)
    joblib.dump(model_l1, "models/model_l1.joblib")
    print(f"Layer 1 retrained successfully. Model offset: {model_l1.offset_}")
    
    # Test on normal human vitals:
    test_cases = [
        ("Normal 1 (Standard)", [75, 98.0, 500, 5.0]),
        ("Normal 2 (Mild elevation HR 85)", [85, 96.0, 500, 5.0]),
        ("Normal 3 (Drift HR 88, SpO2 95)", [88, 95.0, 520, 5.0]),
        ("Normal 4 (Resting HR 68, SpO2 99)", [68, 99.0, 480, 4.5]),
        ("Attack 1 (Extreme Tachycardia HR 180)", [180, 97.0, 500, 5.0]),
        ("Attack 2 (Fatal Desaturation SpO2 78)", [75, 78.0, 500, 5.0]),
        ("Attack 3 (Lead Detached Imp 2500)", [75, 98.0, 2500, 5.0]),
        ("Attack 4 (Lethal Infusion Overdose 50 mL/h)", [75, 98.0, 500, 50.0]),
    ]
    
    print("\nValidation Results:")
    for name, vals in test_cases:
        arr = np.array([vals])
        pred = model_l1.predict(arr)[0]
        score = model_l1.score_samples(arr)[0]
        status = "NORMAL (Passed)" if pred == 1 else "ANOMALY (Caught)"
        print(f"  {name:45s} -> {status} (score: {score:.4f})")

if __name__ == "__main__":
    train_realistic_layer1()
