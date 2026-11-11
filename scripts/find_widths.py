import re
import sys

def check_file(filename):
    with open(filename, 'r', encoding='utf8') as f:
        text = f.read()

    # Find inline styles with min-width or width > 120px
    print(f"=== {filename} ===")
    matches = re.findall(r'style="([^"]+)"', text)
    for m in set(matches):
        if 'min-width' in m or 'width:' in m:
            for part in m.split(';'):
                part = part.strip()
                if part.startswith('min-width') or part.startswith('width'):
                    # Check if value in px > 100
                    num_match = re.search(r'(\d+)\s*px', part)
                    if num_match and int(num_match.group(1)) > 100:
                        print(f"  Large width: {m}")

check_file('web-preview/app.js')
check_file('web-preview/style.css')
