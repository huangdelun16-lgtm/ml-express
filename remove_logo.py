import re

file_path = 'ml-express-client-web/src/pages/HomePage.tsx'

logo_start_marker = "// LOGO组件"
logo_end_marker = "};"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
logo_removed = False
logo_end_found = False

for i, line in enumerate(lines):
    if logo_start_marker in line:
        skip = True
        logo_removed = True
        continue
    
    if skip and logo_end_marker in line and "const Logo" in ''.join(lines[max(0, i-10):i]):
        # 检查是否是 Logo 函数的结束
        if i > 0 and 'const Logo' in ''.join(lines[max(0, i-20):i]):
            skip = False
            logo_end_found = True
            continue
    
    if not skip:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Logo removed: {logo_removed}, Logo end found: {logo_end_found}")

