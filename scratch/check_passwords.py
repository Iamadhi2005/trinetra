import sqlite3
import hashlib

PASSWORD_SALT = "trinetra_salt_2026"

def get_password_hash(password: str) -> str:
    return hashlib.sha256((password + PASSWORD_SALT).encode('utf-8')).hexdigest()

test_passwords = [
    "DoctorInit2026!", "AdminPass2026!", "TechSec2026!", "NursePass2026!",
    "admin123", "doctor123", "nurse123", "admin", "doctor", "nurse",
    "Admin123!", "Doctor123!", "Nurse123!", "trinetra2026", "Trinetra2026!",
    "PatientInit2026!", "patient123", "password123", "Tech123!"
]

conn = sqlite3.connect('data/trinetra.db')
cur = conn.cursor()
rows = cur.execute('SELECT username, password_hash FROM users').fetchall()

print("RESULTS OF PASSWORD MATCHING:")
for username, pwd_hash in rows:
    matched = None
    for p in test_passwords:
        if get_password_hash(p) == pwd_hash:
            matched = p
            break
    print(f"User: {username} -> Password: {matched if matched else 'Generated Temp Password'}")
conn.close()
