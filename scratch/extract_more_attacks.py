import tarfile
import os

archive_path = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\CICIoMT2024.tar.xz"
extract_dir = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1"

print("==================================================")
print("Scanning CICIoMT2024.tar.xz for Attack CSV files...")
print("==================================================")

if not os.path.exists(archive_path):
    print(f"[ERROR] Archive not found at {archive_path}")
    exit(1)

extracted_count = 0
target_names = ["dos", "mqtt", "scan", "flood", "mirai", "bruteforce", "spoofing"]

with tarfile.open(archive_path, "r:xz") as tar:
    print("Archive opened. Iterating members...")
    for member in tar:
        if member.name.endswith(".csv"):
            print(f"Found CSV member: {member.name} ({member.size / (1024*1024):.2f} MB)")
            # Extract up to 3 interesting attack CSVs
            low = member.name.lower()
            if any(t in low for t in target_names) and not "benign" in low:
                print(f"--> Extracting: {member.name}...")
                tar.extract(member, path=extract_dir)
                extracted_count += 1
                if extracted_count >= 3:
                    print(f"Successfully extracted {extracted_count} attack CSV files!")
                    break

print("==================================================")
