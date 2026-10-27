import sqlite3

conn = sqlite3.connect('data/trinetra.db')
c = conn.cursor()
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables:", tables)

if "users" in tables:
    print("\nUsers:")
    for row in c.execute("SELECT id, username, role, name, created_at FROM users").fetchall():
        print(" ", row)

if "patients" in tables:
    print("\nPatients:")
    for row in c.execute("SELECT id, name, doctor_assigned, ward_number, bed_number FROM patients").fetchall():
        print(" ", row)

if "devices" in tables:
    print("\nDevices:")
    for row in c.execute("SELECT id, name, type, patient_id, ip_address FROM devices").fetchall():
        print(" ", row)
