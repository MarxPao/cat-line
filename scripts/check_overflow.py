import re

with open('web-preview/app.js', 'r', encoding='utf8') as f:
    code = f.read()

# Find templates with buttons or rows
print("Checking flex rows in app.js...")
for i, line in enumerate(code.split('\n')):
    if 'flex-row' in line or 'display: flex' in line or 'flex: 1' in line:
        if any(w in line for w in ['space-between', 'gap', 'button', 'input']):
            # Print if suspicious
            if 'gap: 1' in line or 'gap: 8' in line or 'gap: 6' in line:
                pass
            # print line number and snippet
            # print(f"{i+1}: {line.strip()[:100]}")

# Look for table or grid or horizontal lists
matches = re.findall(r'<div[^>]*class="[^"]*(?:row|table|grid|list|nav)[^"]*"[^>]*>', code)
print(f"Found {len(matches)} class-based rows/containers.")

# Check for fixed widths in html strings in app.js
fixed_w = re.findall(r'(?:width|min-width):\s*(\d+)px', code)
print("Fixed widths in app.js:", set([int(x) for x in fixed_w if int(x) > 80]))

with open('web-preview/style.css', 'r', encoding='utf8') as f:
    css = f.read()

fixed_w_css = re.findall(r'(?:width|min-width):\s*(\d+)px', css)
print("Fixed widths in style.css:", set([int(x) for x in fixed_w_css if int(x) > 80]))
