# ⚡ 快速配置指南 - 新的 Google Maps API Keys

## ✅ 已完成的配置

- ✅ 本地 `.env` 文件已创建
- ✅ API Keys 已写入本地配置

## 📋 新的 API Keys

⚠️ **安全提示**：API Keys 已从本文档中移除，请从安全的位置获取（如密码管理器或环境变量）。

- **Website API Key**: `请从安全位置获取`
- **Android App API Key**: `请从安全位置获取`

---

## 🚀 快速配置步骤

### 1️⃣ Netlify - 客户端 Web（必须配置）

**站点**: `client-ml-express`

**方法A：通过 Dashboard（推荐）**
1. 访问：https://app.netlify.com
2. 选择站点：**client-ml-express**
3. **Site settings** → **Environment variables**
4. 找到 `REACT_APP_GOOGLE_MAPS_API_KEY`
5. 点击 **Edit**，更新为：`AIzaSyDEGSFNKgfzTTOtxzB1wJwRQ7FwiAv3ReM`
6. 点击 **Save**
7. **Deploys** → **Trigger deploy** → **Deploy site**

**方法B：通过 CLI**
```bash
cd ml-express-client-web
netlify env:set REACT_APP_GOOGLE_MAPS_API_KEY "AIzaSyDEGSFNKgfzTTOtxzB1wJwRQ7FwiAv3ReM"
netlify deploy --prod
```

---

### 2️⃣ Netlify - 后台管理 Web（必须配置）

**站点**: `admin-ml-express`（或您的后台管理站点名）

**方法A：通过 Dashboard（推荐）**
1. 在 Netlify Dashboard 中选择站点：**admin-ml-express**
2. **Site settings** → **Environment variables**
3. 找到 `REACT_APP_GOOGLE_MAPS_API_KEY`
4. 点击 **Edit**，更新为：`AIzaSyDEGSFNKgfzTTOtxzB1wJwRQ7FwiAv3ReM`
5. 点击 **Save**
6. **Deploys** → **Trigger deploy** → **Deploy site**

**方法B：通过 CLI**
```bash
cd /path/to/admin/project
netlify env:set REACT_APP_GOOGLE_MAPS_API_KEY "AIzaSyDEGSFNKgfzTTOtxzB1wJwRQ7FwiAv3ReM"
netlify deploy --prod
```

---

### 3️⃣ EAS Secrets - 客户端 App（必须配置）

**项目**: `ml-express-client`

**方法A：通过 CLI（推荐）**
```bash
cd ml-express-client
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value AIzaSyDUGaYA0yNPDJC9QZ5Uo6dsmvW3WIHSJqc --type string --force
```

**方法B：通过 Web 界面**
1. 访问：https://expo.dev/accounts/amt349/projects/ml-express-client/secrets
2. 找到或创建 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
3. 更新值为：`AIzaSyDUGaYA0yNPDJC9QZ5Uo6dsmvW3WIHSJqc`
4. 保存

**验证配置**：
```bash
cd ml-express-client
eas secret:list
```

应该看到 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` 在列表中。

---

## ✅ 配置检查清单

完成以下检查，确保所有配置正确：

### Netlify 配置
- [ ] 客户端 Web 环境变量已更新
- [ ] 后台管理 Web 环境变量已更新
- [ ] 两个站点都已重新部署
- [ ] 部署成功，没有错误

### EAS 配置
- [ ] EAS Secret 已创建/更新
- [ ] 使用 `eas secret:list` 验证配置

### 测试
- [ ] 访问 https://market-link-express.com，测试地图功能
- [ ] 访问后台管理站点，测试地图功能
- [ ] 在 App 中测试地图功能
- [ ] 检查浏览器控制台，确认没有 API Key 错误

---

## 🔍 验证配置

### 验证 Netlify 配置

1. **检查环境变量**：
   - 在 Netlify Dashboard 中确认变量值已更新
   - 确认作用域包含 Production、Deploy previews、Branch deploys

2. **检查部署日志**：
   - 查看最新部署的日志
   - 确认没有 API Key 相关错误

3. **测试网站**：
   - 访问网站，打开浏览器开发者工具（F12）
   - 检查控制台，确认没有错误
   - 测试地图加载是否正常

### 验证 EAS Secrets

```bash
cd ml-express-client
eas secret:list
```

应该看到：
```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: [您的Android App API Key]
```

---

## 🐛 故障排除

### 问题1：Netlify 环境变量未生效

**解决方案**：
1. 确认变量名正确：`REACT_APP_GOOGLE_MAPS_API_KEY`
2. 确认已重新部署
3. 清除浏览器缓存，或使用无痕模式测试
4. 检查部署日志，确认环境变量已加载

### 问题2：EAS Secret 未生效

**解决方案**：
1. 确认 Secret 名称正确：`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
2. 使用 `eas secret:list` 验证配置
3. 重新构建 App：`eas build --platform android`

### 问题3：地图无法加载

**解决方案**：
1. 检查 Google Cloud Console 中的 API Key 限制配置
2. 确认域名在 HTTP referrers 限制列表中
3. 确认 Android 包名在应用限制中
4. 检查 API 配额是否超限

---

## 📞 需要帮助？

如果遇到问题：
1. 检查 `CONFIGURE_NEW_API_KEYS.md` 获取详细步骤
2. 查看 Netlify 部署日志
3. 检查 Google Cloud Console 中的 API Key 配置

---

**配置完成后，请测试所有功能确保正常工作！** ✅

