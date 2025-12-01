# 🔐 EAS env:create Visibility 选择指南

## 📋 当前情况

在执行 `eas env:create` 命令时，需要选择 visibility（可见性）选项。

---

## 🎯 选项说明

### 1. Plain text（纯文本）
- **用途**: 可以公开使用的环境变量
- **特点**: 在 EAS Dashboard 中完全可见
- **适用**: 客户端使用的公开密钥（如 Anon Key）

### 2. Sensitive（敏感）
- **用途**: 敏感但可以在客户端使用的环境变量
- **特点**: 在 EAS Dashboard 中部分隐藏（显示为 `***`）
- **适用**: 客户端使用的密钥，但希望增加一些保护

### 3. Secret（秘密）
- **用途**: 绝对不能公开的秘密密钥
- **特点**: 在 EAS Dashboard 中完全隐藏
- **适用**: 服务器端使用的密钥（如 Service Role Key）

---

## ✅ 推荐选择

### 对于 `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**推荐选择**: **"Sensitive"** 或 **"Plain text"**

**原因**:
- Anon Key 是设计为可以在客户端使用的
- 但为了更好的安全实践，建议选择 "Sensitive"
- 如果选择 "Plain text" 也可以（因为它是公开的）

---

## 🔧 操作步骤

1. **使用方向键**选择 **"Sensitive"**（推荐）或 **"Plain text"**
2. **按 Enter** 确认选择
3. 命令会继续执行并创建环境变量

---

## 📝 完整命令示例

如果您想直接指定 visibility，可以使用：

```bash
# 方法 1: 交互式选择（当前方式）
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 然后选择 "Sensitive" 或 "Plain text"
```

---

## 💡 建议

**选择 "Sensitive"** - 这是最平衡的选择：
- ✅ 提供一定的安全保护（在 Dashboard 中部分隐藏）
- ✅ 仍然可以在客户端使用（符合 Anon Key 的设计）
- ✅ 符合安全最佳实践

---

**请选择 "Sensitive"，然后按 Enter 继续！** 🚀

