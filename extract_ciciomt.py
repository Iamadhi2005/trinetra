import tarfile
import os

archive_path = r"C:\Users\USER\Cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\CICIoMT2024.tar.xz"
# Check standard path
if not os.path.exists(archive_path):
    archive_path = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\CICIoMT2024.tar.xz"
    
extract_dir = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1"

print(f"Opening archive: {archive_path}")
try:
    with tarfile.open(archive_path, "r:xz") as tar:
        members = tar.getmembers()
        csv_members = [m for m in members if m.name.endswith(".csv")]
        
        # Find benign CSV file
        benign_csvs = [m for m in csv_members if "benign" in m.name.lower()]
        print(f"Found {len(benign_csvs)} benign CSV files.")
        
        if benign_csvs:
            target_benign = benign_csvs[0]
            print(f"Extracting benign CSV: {target_benign.name}...")
            tar.extract(target_benign, path=extract_dir)
            print(f"Extraction successful: {os.path.join(extract_dir, target_benign.name)}")
        else:
            print("No benign CSV files found in the archive.")
            
except Exception as e:
    print(f"Error: {e}")
