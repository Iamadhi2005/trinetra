import os
import pandas as pd

data_dir = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\WiFI_and_MQTT\attacks\csv\test"

print("==================================================")
print("Available Extracted CSV Files & Row Counts:")
print("==================================================")

total_rows = 0
for f in os.listdir(data_dir):
    if f.endswith(".csv"):
        fpath = os.path.join(data_dir, f)
        df = pd.read_csv(fpath)
        rows = len(df)
        total_rows += rows
        size_mb = os.path.getsize(fpath) / (1024*1024)
        print(f" • {f} ({size_mb:.2f} MB) -> {rows:,} rows")

print("--------------------------------------------------")
print(f"Total Rows Available Now: {total_rows:,}")
print("==================================================")
