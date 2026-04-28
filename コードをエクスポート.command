#!/bin/bash
cd "$(dirname "$0")"
OUTPUT="$HOME/Desktop/nantubo_code.txt"

python3 - <<'EOF'
import os, sys

src_dir = "src"
output = os.path.expanduser("~/Desktop/nantubo_code.txt")
files = []
for root, dirs, filenames in os.walk(src_dir):
    for f in filenames:
        files.append(os.path.join(root, f))
files.sort()

with open(output, "w", encoding="utf-8") as out:
    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            out.write(f"\n\n=== {path} ===\n")
            out.write(content)
        except:
            pass

print(f"✅ 完了: {output}")
EOF

open -R "$OUTPUT"
