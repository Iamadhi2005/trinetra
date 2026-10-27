import os
import re

patterns = [r'\b400\b', r'false positive', r'fp\b']

for root, dirs, files in os.walk('.'):
    if '.git' in root or '.venv' in root or 'node_modules' in root:
        continue
    for f in files:
        if f.endswith(('.py', '.md', '.html', '.txt', '.json', '.docx')):
            path = os.path.join(root, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                    lines = fp.readlines()
                    for idx, line in enumerate(lines):
                        if '400' in line and any(w in line.lower() for w in ['fp', 'false', 'positive', 'cases', 'sample', 'eval', 'matrix']):
                            print(f"{path}:{idx+1}: {line.strip()}")
            except:
                pass
