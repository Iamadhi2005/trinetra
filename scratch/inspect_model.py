import joblib
import os
import numpy as np

print("Checking model files...")
l1_exists = os.path.exists("models/model_l1.joblib")
l2_exists = os.path.exists("models/model_l2.joblib")
print(f"model_l1.joblib exists: {l1_exists}, size: {os.path.getsize('models/model_l1.joblib') if l1_exists else 0} bytes")
print(f"model_l2.joblib exists: {l2_exists}, size: {os.path.getsize('models/model_l2.joblib') if l2_exists else 0} bytes")

if l2_exists:
    m2 = joblib.load("models/model_l2.joblib")
    print("Model L2 Type:", type(m2))
    print("Model L2 n_estimators:", getattr(m2, "n_estimators", None))
    print("Model L2 classes:", getattr(m2, "classes_", None))
    print("Model L2 n_features_in_:", getattr(m2, "n_features_in_", None))
    if hasattr(m2, "feature_importances_"):
        print("Model L2 feature_importances_ (Duration, Rate, Tot size, AVG, IAT):")
        for f, imp in zip(['Duration', 'Rate', 'Tot size', 'AVG', 'IAT'], m2.feature_importances_):
            print(f"  {f}: {imp:.4f} ({imp*100:.1f}%)")

if l1_exists:
    m1 = joblib.load("models/model_l1.joblib")
    print("Model L1 Type:", type(m1))
    print("Model L1 offset_:", getattr(m1, "offset_", None))
