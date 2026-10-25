import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_FILE = os.path.join(DB_DIR, "trinetra.db")

# Auto-seed all patients, devices, and alerts from backend/seed_trinetra.db if cloud instance boots up
SEED_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_trinetra.db")
if os.path.exists(SEED_FILE) and (not os.path.exists(DB_FILE) or os.path.getsize(DB_FILE) < 50000):
    try:
        shutil.copyfile(SEED_FILE, DB_FILE)
        print(f"[DATABASE] Seeded permanent database from {SEED_FILE} -> {DB_FILE} ({os.path.getsize(DB_FILE)} bytes)")
    except Exception as e:
        print("[DATABASE] Error copying seed database:", e)

DATABASE_URL = f"sqlite:///{DB_FILE}"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
