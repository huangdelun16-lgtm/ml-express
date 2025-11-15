# 🔐 EAS Secrets 环境变量配置指南

## 📋 概述

在生产环境构建应用时，需要在 EAS (Expo Application Services) 中配置环境变量（Secrets），以确保 API 密钥等敏感信息安全。

---

## 🎯 为什么需要 EAS Secrets？

- **安全性**: 环境变量不会暴露在代码仓库中
- **灵活性**: 可以为不同环境（开发、生产）配置不同的值
- **合规性**: 符合安全最佳实践

---

## 📝 步骤 1：安装 EAS CLI

如果还没有安装 EAS CLI：

```bash
npm install -g eas-cli
```

---

## 📝 步骤 2：登录 EAS

```bash
eas login
```

使用您的 Expo 账号登录。

---

## 📝 步骤 3：配置 Google Maps API Key Secret

### 3.1 创建 Secret

```bash
cd ml-express-mobile-app
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE --type string
```

**参数说明**:
- `--scope project`: Secret 的作用域（项目级别）
- `--name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`: Secret 的名称（必须与代码中的变量名一致）
- `--value`: API 密钥的值
- `--type string`: Secret 的类型

### 3.2 验证 Secret 已创建

```bash
eas secret:list
```

应该能看到 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` 在列表中。

---

## 📝 步骤 4：在 eas.json 中配置环境变量

检查 `eas.json` 文件，确保构建配置正确：

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}"
      }
    }
  }
}
```

---

## 📝 步骤 5：构建应用

### 5.1 开发构建（测试）

```bash
eas build --profile development --platform android
```

### 5.2 生产构建

```bash
eas build --profile production --platform android
```

构建过程中，EAS 会自动从 Secrets 中读取环境变量并注入到应用中。

---

## 🔍 验证环境变量

### 方法 1：在构建日志中检查

构建完成后，检查构建日志，确认环境变量已正确注入。

### 方法 2：在应用中验证

在应用代码中添加临时日志（仅用于测试）：

```javascript
console.log('Google Maps API Key:', process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.substring(0, 10) + '...');
```

**注意**: 测试完成后，记得删除此日志代码！

---

## 📚 管理 Secrets

### 查看所有 Secrets

```bash
eas secret:list
```

### 更新 Secret

```bash
eas secret:update --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value new_api_key_value
```

### 删除 Secret

```bash
eas secret:delete --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
```

---

## 🔒 安全最佳实践

1. **不要在代码中硬编码 API 密钥**
   - ✅ 使用环境变量
   - ✅ 使用 EAS Secrets（生产环境）

2. **不要将 .env 文件提交到 Git**
   - ✅ `.env` 已在 `.gitignore` 中
   - ✅ 使用 `.env.example` 作为模板

3. **定期轮换 API 密钥**
   - 每 6-12 个月更换一次
   - 更新 EAS Secret 后重新构建应用

4. **限制 Secret 访问权限**
   - 只给需要的人员访问权限
   - 使用项目级别的 Secret（`--scope project`）

---

## ⚠️ 常见问题

### Q: 构建时环境变量未生效？

**A**: 检查以下几点：
1. Secret 名称是否正确（必须与代码中的变量名完全一致）
2. Secret 是否已创建（运行 `eas secret:list` 检查）
3. `eas.json` 中是否正确配置了环境变量

### Q: 本地开发时环境变量未生效？

**A**: 
1. 确保 `.env` 文件存在于项目根目录
2. 确保变量名以 `EXPO_PUBLIC_` 开头
3. 重启 Expo 开发服务器

### Q: 如何为不同环境使用不同的 API 密钥？

**A**: 可以在 `eas.json` 中为不同构建配置设置不同的环境变量：

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_DEV}"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_PROD}"
      }
    }
  }
}
```

然后创建两个不同的 Secret：
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_DEV`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_PROD`

---

## ✅ 配置检查清单

- [ ] 已安装 EAS CLI
- [ ] 已登录 EAS
- [ ] 已创建 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` Secret
- [ ] 已验证 Secret 已创建（`eas secret:list`）
- [ ] 已测试构建，确认环境变量生效
- [ ] 已确认 `.env` 文件不被提交到 Git

---

**配置完成后，您的 API 密钥将在生产构建中安全使用！** 🔐

