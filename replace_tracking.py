import os

file_path = 'ml-express-client-web/src/pages/HomePage.tsx'

tracking_start_marker = "{/* 运单追踪与扫码 */}"
services_start_marker = "{/* 服务卡片网格 */}"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
tracking_replaced = False

for line in lines:
    if tracking_start_marker in line:
        skip = True
        new_lines.append("      <TrackingSection \n")
        new_lines.append("        language={language}\n")
        new_lines.append("        onTrack={(id) => navigate(`/tracking?id=${id}`)}\n")
        new_lines.append("        onScan={() => {\n")
        new_lines.append("          if (window.innerWidth < 768) {\n")
        new_lines.append("            alert('扫码功能开发中');\n")
        new_lines.append("          } else {\n")
        new_lines.append("            alert(language === 'zh' ? '请使用手机访问以使用扫码功能' : language === 'en' ? 'Please use mobile device to scan' : 'ဖုန်းဖြင့်အသုံးပြုပါ');\n")
        new_lines.append("          }\n")
        new_lines.append("        }}\n")
        new_lines.append("      />\n\n")
        tracking_replaced = True
        continue
    
    if skip and services_start_marker in line:
        skip = False
        new_lines.append(line)
        continue
    
    if not skip:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Tracking replaced: {tracking_replaced}")
