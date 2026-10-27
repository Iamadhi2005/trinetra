import sqlite3

conn = sqlite3.connect('data/trinetra.db')
cur = conn.cursor()
rows = cur.execute('SELECT id, username, name, role, department FROM users').fetchall()
print("ID | USERNAME | NAME | ROLE | DEPARTMENT")
print("-" * 60)
for r in rows:
    print(f"{r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]}")
conn.close()
