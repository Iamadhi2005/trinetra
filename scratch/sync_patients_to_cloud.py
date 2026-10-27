import sqlite3
import urllib.request
import urllib.parse
import json

def sync():
    # 1. Login to Render Cloud
    print("Logging into Render Cloud as admin...")
    login_req = urllib.request.Request(
        'https://trinetra-ya1h.onrender.com/api/auth/login',
        data=json.dumps({'username': 'admin', 'password': 'admin123'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req, timeout=15) as resp:
        token = json.loads(resp.read().decode('utf-8'))['access_token']
    print("Admin token acquired.")

    # 2. Read local patients
    conn = sqlite3.connect('data/trinetra.db')
    conn.row_factory = sqlite3.Row
    local_patients = [dict(r) for r in conn.cursor().execute('SELECT * FROM patients').fetchall()]
    print(f"Total local patients found: {len(local_patients)}")

    # 3. Read existing cloud patients
    cloud_req = urllib.request.Request('https://trinetra-ya1h.onrender.com/api/patients')
    with urllib.request.urlopen(cloud_req, timeout=15) as resp:
        cloud_patients = json.loads(resp.read().decode('utf-8'))
    cloud_names = {p['name'].strip().lower() for p in cloud_patients}
    print(f"Existing cloud patient names: {cloud_names}")

    # 4. Sync each local patient to Cloud
    for p in local_patients:
        name = p['name'].strip()
        if name.lower() in cloud_names:
            print(f"Already on cloud: {name}")
            continue

        form_data = {
            'name': name,
            'age': str(p.get('age') or 45),
            'gender': p.get('gender') or 'Male',
            'blood_group': p.get('blood_group') or 'O+',
            'phone': p.get('phone') or '+91 9876543210',
            'guardian_name': p.get('guardian_name') or 'Guardian',
            'guardian_phone': p.get('guardian_phone') or '+91 9876543211',
            'ward_number': p.get('ward_number') or 'ICU-A',
            'bed_number': p.get('bed_number') or 'Bed-01',
            'doctor_assigned': p.get('doctor_assigned') or 'Dr. Radhi',
            'devices': 'ICU Monitor, ECG Monitor, Pulse Oximeter, Infusion Pump'
        }

        encoded_data = urllib.parse.urlencode(form_data).encode('utf-8')
        add_req = urllib.request.Request(
            'https://trinetra-ya1h.onrender.com/api/patients',
            data=encoded_data,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        )
        try:
            with urllib.request.urlopen(add_req, timeout=15) as add_resp:
                res = json.loads(add_resp.read().decode('utf-8'))
                print(f"Synced successfully: {name} (ID: {res.get('id')}) -> Doctor: {res.get('doctor_assigned')}")
        except Exception as e:
            print(f"Failed to sync {name}: {e}")

    print("\nSync completed! Verifying cloud patient directory...")
    with urllib.request.urlopen('https://trinetra-ya1h.onrender.com/api/patients', timeout=15) as resp:
        final_list = json.loads(resp.read().decode('utf-8'))
    print(f"Final cloud patient count: {len(final_list)}")
    for p in final_list:
        print(f"  - [{p['id']}] {p['name']} | Ward: {p.get('ward_number')} | Doctor: {p.get('doctor_assigned')}")

if __name__ == '__main__':
    sync()
