import os

wifi_mqtt_root = r"C:\Users\USER\.cache\kagglehub\datasets\cyberdeeplearning\ciciomt2024\versions\1\WiFI_and_MQTT"

print("==================================================")
print("Listing all contents inside WiFI_and_MQTT:")
print("==================================================")

if os.path.exists(wifi_mqtt_root):
    for root, dirs, files in os.walk(wifi_mqtt_root):
        print(f"Directory: {root}")
        for f in files:
            fpath = os.path.join(root, f)
            size_mb = os.path.getsize(fpath) / (1024 * 1024)
            print(f"   • {f} ({size_mb:.2f} MB)")
else:
    print(f"Not found: {wifi_mqtt_root}")
