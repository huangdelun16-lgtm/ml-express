import re

file_path = 'ml-express-client-web/src/pages/HomePage.tsx'

nav_start_marker = "{/* 顶部导航栏 */}"
nav_end_marker = "</nav>"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
nav_replaced = False
nav_end_found = False

for i, line in enumerate(lines):
    if nav_start_marker in line:
        skip = True
        # 插入 NavigationBar 组件
        new_lines.append("      <NavigationBar\n")
        new_lines.append("        language={language}\n")
        new_lines.append("        onLanguageChange={handleLanguageChange}\n")
        new_lines.append("        currentUser={currentUser}\n")
        new_lines.append("        onLogout={handleLogout}\n")
        new_lines.append("        onShowRegisterModal={(isLoginMode) => {\n")
        new_lines.append("          setIsLoginMode(isLoginMode);\n")
        new_lines.append("          setShowRegisterModal(true);\n")
        new_lines.append("        }}\n")
        new_lines.append("        translations={t}\n")
        new_lines.append("      />\n\n")
        nav_replaced = True
        continue
    
    if skip and nav_end_marker in line:
        # 找到 nav 结束标签，跳过这一行
        nav_end_found = True
        skip = False
        continue
    
    if not skip:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Navigation replaced: {nav_replaced}, Nav end found: {nav_end_found}")

