import os

cache_root = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1"

print("==================================================")
print("Scanning CIC-IoMT-2024 Cache Directory:")
print("==================================================")

if os.path.exists(cache_root):
    for root, dirs, files in os.walk(cache_root):
        level = root.replace(cache_root, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files[:10]:
            fpath = os.path.join(root, f)
            size_mb = os.path.getsize(fpath) / (1024 * 1024)
            print(f"{subindent}{f} ({size_mb:.2f} MB)")
        if len(files) > 10:
            print(f"{subindent}... and {len(files) - 10} more files")
else:
    print(f"Path does not exist: {cache_root}")

print("==================================================")
