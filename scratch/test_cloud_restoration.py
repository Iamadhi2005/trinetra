import urllib.request
import json

def verify():
    print("=== VERIFYING RENDER CLOUD DATA RESTORATION ===")
    
    # 1. Patients
    try:
        req = urllib.request.Request('https://trinetra-ya1h.onrender.com/api/patients')
        with urllib.request.urlopen(req, timeout=15) as res:
            patients = json.loads(res.read().decode('utf-8'))
            print(f"Total Cloud Patients: {len(patients)}")
            for p in patients:
                print(f"  - [{p.get('id')}] {p.get('name')} | Ward: {p.get('ward_number')} | Doctor: {p.get('doctor_assigned')}")
    except Exception as e:
        print("Patients check error:", e)

    # 2. Alerts
    try:
        req = urllib.request.Request('https://trinetra-ya1h.onrender.com/api/alerts')
        with urllib.request.urlopen(req, timeout=15) as res:
            alerts = json.loads(res.read().decode('utf-8'))
            print(f"\nTotal Cloud Alerts: {len(alerts)}")
            for a in alerts[:5]:
                print(f"  - [{a.get('severity')}] {a.get('message')} | Status: {a.get('status')}")
    except Exception as e:
        print("Alerts check error:", e)

    # 3. Devices (via admin token)
    try:
        login_req = urllib.request.Request(
            'https://trinetra-ya1h.onrender.com/api/auth/login',
            data=json.dumps({'username': 'admin', 'password': 'admin123'}).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(login_req, timeout=15) as res:
            token = json.loads(res.read().decode('utf-8'))['access_token']
        
        dev_req = urllib.request.Request(
            'https://trinetra-ya1h.onrender.com/api/admin/devices',
            headers={'Authorization': f'Bearer {token}'}
        )
        with urllib.request.urlopen(dev_req, timeout=15) as res:
            devices = json.loads(res.read().decode('utf-8'))
            print(f"\nTotal Cloud Medical Devices: {len(devices)}")
            for d in devices[:8]:
                print(f"  - [{d.get('id')}] {d.get('name')} | Type: {d.get('type')} | Patient: {d.get('patient_id')}")
    except Exception as e:
        print("Devices check error:", e)

if __name__ == '__main__':
    verify()
