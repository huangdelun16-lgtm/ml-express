import re

file_path = 'ml-express-client-web/src/pages/HomePage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到 "英雄区域" 注释和 <section id="home" 的位置
hero_section_start = None
for i, line in enumerate(lines):
    if '<section id="home"' in line:
        hero_section_start = i
        break

if hero_section_start is None:
    print("Error: Could not find <section id=\"home\"")
    exit(1)

# 找到第一个 "英雄区域" 注释的位置（应该是残留的）
first_hero_comment = None
for i in range(hero_section_start):
    if '{/* 英雄区域 */}' in lines[i]:
        first_hero_comment = i
        break

if first_hero_comment is None:
    print("Error: Could not find first 英雄区域 comment")
    exit(1)

# 删除从第一个 "英雄区域" 注释的下一行到 <section 之前的所有内容
new_lines = lines[:first_hero_comment+1] + lines[hero_section_start:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Deleted {hero_section_start - first_hero_comment - 1} lines of Banner code")

