import os
import sqlite3

for root, dirs, files in os.walk('.'):
    if any(x in root for x in ['node_modules', '.git', '.next', 'build', '.dart_tool']):
        continue
    for f in files:
        if f.endswith('.db') or f.endswith('.sqlite'):
            fp = os.path.join(root, f)
            print(f"\n==========================================")
            print(f"DATABASE: {fp}")
            print(f"==========================================")
            try:
                conn = sqlite3.connect(fp)
                cur = conn.cursor()
                tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
                print("Tables:", tables)
                for t in tables:
                    count = cur.execute(f"SELECT COUNT(*) FROM `{t}`").fetchone()[0]
                    print(f"  Table `{t}` ({count} rows):")
                    col_names = [col[1] for col in cur.execute(f"PRAGMA table_info(`{t}`)").fetchall()]
                    print(f"    Columns: {col_names}")
                    rows = cur.execute(f"SELECT * FROM `{t}` LIMIT 10").fetchall()
                    for r in rows:
                        print(f"    - {r}")
                conn.close()
            except Exception as e:
                print("Error reading db:", e)
