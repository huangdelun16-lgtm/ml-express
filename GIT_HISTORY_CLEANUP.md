# 🔒 Git 历史清理指南 - 移除泄漏的 API Keys

## ⚠️ 重要提示

虽然我们已经从当前代码中移除了硬编码的 API Keys，但这些 Keys 仍然存在于 Git 历史记录中。

---

## 📋 当前状态

✅ **已修复**：
- ✅ `UPDATE_API_KEYS.sh` - 已改为使用环境变量
- ✅ `CONFIGURE_NEW_API_KEYS.md` - 已移除硬编码的 Keys
- ✅ `QUICK_CONFIG_GUIDE.md` - 已移除硬编码的 Keys
- ✅ 源代码文件 - 已移除硬编码的 Keys

⚠️ **仍存在的问题**：
- ⚠️ Git 历史记录中仍然包含这些 API Keys
- ⚠️ 如果仓库是公开的，任何人都可以查看历史记录

---

## 🔧 解决方案

### 方案 1：重写 Git 历史（推荐，但需要谨慎）

⚠️ **警告**：这会重写 Git 历史，需要团队协作！

#### 使用 git-filter-repo（推荐）

```bash
# 安装 git-filter-repo（如果未安装）
pip install git-filter-repo

# 备份仓库
cd /Users/aungmyatthu/Desktop/ml-express
git clone . ../ml-express-backup

# 移除包含 API Keys 的文件历史
git filter-repo --path UPDATE_API_KEYS.sh --invert-paths
git filter-repo --path CONFIGURE_NEW_API_KEYS.md --invert-paths
git filter-repo --path QUICK_CONFIG_GUIDE.md --invert-paths

# 或者使用字符串替换（更彻底）
git filter-repo --replace-text <(echo "AIzaSyDEGSFNKgfzTTOtxzB1wJwRQ7FwiAv3ReM==>[REDACTED]")
git filter-repo --replace-text <(echo "AIzaSyDUGaYA0yNPDJC9QZ5Uo6dsmvW3WIHSJqc==>[REDACTED]")

# 强制推送（需要团队协调）
git push origin --force --all
git push origin --force --tags
```

#### 使用 BFG Repo-Cleaner（更简单）

```bash
# 下载 BFG
# https://rtyley.github.io/bfg-repo-cleaner/

# 创建替换文件
echo "AIzaSyDEGSFNKgfzTTOtxzB1wJwRQ7FwiAv3ReM==>[REDACTED]" > replacements.txt
echo "AIzaSyDUGaYA0yNPDJC9QZ5Uo6dsmvW3WIHSJqc==>[REDACTED]" >> replacements.txt

# 清理历史
java -jar bfg.jar --replace-text replacements.txt

# 清理并推送
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

---

### 方案 2：撤销并重新生成 API Keys（更安全）

如果 Git 历史清理太复杂，建议：

1. **在 Google Cloud Console 中撤销泄漏的 API Keys**
2. **创建新的 API Keys**
3. **更新所有配置使用新 Keys**

这样即使历史记录中有旧 Keys，它们也已经失效了。

---

### 方案 3：将仓库设为私有（临时方案）

如果仓库是公开的：
1. 将仓库设为私有
2. 清理 Git 历史
3. 重新设为公开

---

## 📝 推荐步骤

### 立即执行：

1. ✅ **撤销泄漏的 API Keys**（在 Google Cloud Console）
2. ✅ **创建新的 API Keys**
3. ✅ **更新所有配置使用新 Keys**

### 后续执行（可选）：

1. ⏳ 清理 Git 历史（如果仓库是公开的）
2. ⏳ 或者将仓库设为私有

---

## ⚠️ 注意事项

1. **Git 历史清理是破坏性操作**
   - 会改变所有提交的哈希值
   - 需要所有团队成员重新克隆仓库
   - 需要更新所有 fork 和 pull requests

2. **如果仓库是公开的**
   - 即使清理了历史，GitHub 的缓存中可能仍有记录
   - 考虑撤销并重新生成 API Keys

3. **最佳实践**
   - 永远不要在代码中硬编码 API Keys
   - 使用环境变量或密钥管理服务
   - 定期轮换 API Keys

---

## 🔍 验证清理结果

清理后，验证 API Keys 是否已移除：

```bash
# 搜索 Git 历史
git log --all --full-history --source -- "UPDATE_API_KEYS.sh" | grep -i "AIzaSy"

# 如果返回空，说明已清理成功
```

---

**建议**：优先执行方案 2（撤销并重新生成 Keys），这是最安全和最简单的方案。

