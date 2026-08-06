import sqlite3
import os

db_path = "data/trinetra.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM quarantine_records")
    cursor.execute("DELETE FROM alerts")
    cursor.execute("DELETE FROM security_events")
    cursor.execute("UPDATE devices SET status = 'Online'")
    conn.commit()
    conn.close()
    print("Database alerts, security events, and quarantine records cleared. Devices reset to Online.")
