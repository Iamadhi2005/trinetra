import urllib.request
import json

endpoints = [
    ("Frontend Adversary", "http://localhost:3000/adversary"),
    ("Testbed Console 3002", "http://localhost:3002"),
    ("Cloud Render API", "https://trinetra-ya1h.onrender.com/api/security/attack"),
    ("Local API 8000", "http://localhost:8000/api/security/attack")
]

for name, url in endpoints:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TRINETRA-Checker/1.0"})
        with urllib.request.urlopen(req, timeout=4) as res:
            print(f"[OK] {name} ({url}) -> Status {res.status}")
    except Exception as e:
        print(f"[ERR] {name} ({url}) -> {e}")
