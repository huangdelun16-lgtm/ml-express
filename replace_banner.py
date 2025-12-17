import os

file_path = 'ml-express-client-web/src/pages/HomePage.tsx'

banner_start_marker = "{/* 3D 风格广告横幅 (自动轮播) */}"
# Tracking section starts right after banner
tracking_start_marker = "{/* 运单追踪与扫码 */}"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
banner_replaced = False

for line in lines:
    if banner_start_marker in line:
        skip = True
        new_lines.append("      <HomeBanner />\n\n")
        banner_replaced = True
        continue
    
    if skip and tracking_start_marker in line:
        skip = False
        # Don't append tracking start line yet, we want to replace it too
        # But for now let's just finish Banner replacement
        new_lines.append(line)
        continue
    
    if not skip:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Banner replaced: {banner_replaced}")
