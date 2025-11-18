# 🔐 EAS 凭据删除指南

## 📋 当前情况

您正在运行 `eas credentials --platform android`，看到了主菜单。

---

## ✅ 删除凭据的正确步骤

### 步骤 1：选择 "Keystore" 选项

在当前的菜单中：
```
? What do you want to do? ›
  > Keystore: Manage everything needed to build your project
    Google Service Account
    Push Notifications (Legacy)
    credentials.json
    Go back
    Exit
```

**操作**：
1. 使用方向键选择 **"Keystore: Manage everything needed to build your project"**
2. 按 **Enter** 确认

---

### 步骤 2：在 Keystore 管理界面中删除

选择 "Keystore" 后，您会看到 Keystore 管理选项：

```
? What do you want to do? ›
  > Set up a new Android Keystore
    Use existing Android Keystore
    Remove credentials
    Go back
```

**操作**：
1. 使用方向键选择 **"Remove credentials"**
2. 按 **Enter** 确认
3. 确认删除操作

---

## 🔄 替代方案：直接设置新密钥

如果您只是想重新生成密钥（不需要先删除），可以直接：

### 方法 1：设置新密钥（推荐）

在 Keystore 管理界面中：
1. 选择 **"Set up a new Android Keystore"**
2. EAS 会自动覆盖现有密钥并生成新密钥
3. 记录新的 SHA-1、SHA-256 指纹和 Key Alias

**优点**：
- ✅ 更简单，一步完成
- ✅ 自动处理旧密钥
- ✅ 不需要手动删除

---

## 📋 完整操作流程

### 选项 A：删除后重新生成（完全清理）

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
eas credentials --platform android
```

**操作步骤**：
1. 选择 `production`
2. 选择 `Keystore`
3. 选择 `Remove credentials`
4. 确认删除
5. 再次运行 `eas credentials --platform android`
6. 选择 `production` → `Keystore` → `Set up a new Android Keystore`

### 选项 B：直接设置新密钥（推荐）

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
eas credentials --platform android
```

**操作步骤**：
1. 选择 `production`
2. 选择 `Keystore`
3. 选择 `Set up a new Android Keystore`
4. EAS 会自动生成新密钥
5. 记录 SHA-1、SHA-256、Key Alias 和密码

---

## 🎯 推荐操作

**如果您想删除并重新发布应用**，建议使用 **选项 B（直接设置新密钥）**：

1. ✅ 更简单快捷
2. ✅ 自动处理所有细节
3. ✅ 不需要手动删除

---

## 📝 记录重要信息

生成新密钥后，请记录：

```
SHA-1: [显示的指纹]
SHA-256: [显示的指纹]
Key Alias: [显示的别名]
Keystore Password: [显示的密码]
Key Password: [显示的密码]
```

这些信息后续可能需要：
- 更新 Google Cloud Console API Key 限制
- 导出证书为 PEM 文件（如果需要）

---

**文档创建时间**: 2025-01-16  
**状态**: ✅ 操作指南已更新

