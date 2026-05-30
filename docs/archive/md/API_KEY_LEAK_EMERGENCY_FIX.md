# 🚨 API Key 泄漏紧急修复指南

## ⚠️ 严重安全警告

**检测到多个 API Key 已公开泄漏！** 需要立即采取行动。

---

## 📋 泄漏的密钥清单

根据安全扫描结果，以下密钥已被检测到泄漏：

### 1. Google API Keys（已泄漏）

| 泄漏位置 | API Key 片段 | 状态 |
|---------|-------------|------|
| `vercel.json:25` | `AIzaSyBQXxGLGseV9D0tXs01...` | 🔴 已泄漏 |
| `src/pages/TrackingPage.tsx:7` | `AIzaSyBQXxGLGseV9D0tXs01...` | 🔴 已泄漏 |
| `ml-express-client-web/.../TrackingPage.tsx:7` | `AIzaSyBQXxGLGseV9D0tXs01...` | 🔴 已泄漏 |
| `src/pages/TrackingPage.tsx:7` | `AIzaSyCYXeF02DGWHpDhbwOC...` | 🔴 已泄漏 |
| `src/pages/TrackingPage.tsx:7` | `AIzaSyAlWquo-iUvh_2tQPol...` | 🔴 已泄漏 |
| `.env:2` | `AIzaSyCtf57YS_4-7meheIlU...` | 🔴 已泄漏 |
| `ml-express-client/android/app/src/main/AndroidManifest.xml:18` | `AIzaSyDziYSarzsBiZHuyza-...` | 🔴 已泄漏 |

### 2. Supabase Service Keys（已泄漏）

| 泄漏位置 | Key 片段 | 状态 |
|---------|---------|------|
| `.env:7` | `eyJhbGciOiJIUzI1NiIsInR5...` | 🔴 已泄漏 |
| `test-verification-codes....:5` | `eyJhbGciOiJIUzI1NiIsInR5...` | 🔴 已泄漏 |

---

## 🔥 立即行动步骤（按优先级）

### **Step 1: 立即撤销泄漏的 Google API Keys** ⚡ 最高优先级

#### 1.1 登录 Google Cloud Console

1. 访问：https://console.cloud.google.com
2. 选择您的项目
3. 进入 **APIs & Services** → **Credentials**

#### 1.2 撤销泄漏的 API Keys

对于每个泄漏的 API Key：

1. **找到对应的 API Key**
2. **点击 API Key 名称进入编辑页面**
3. **点击 "DELETE" 或 "RESTRICT"**
4. **如果选择限制，配置以下限制**：
   - **Application restrictions**: HTTP referrers
   - **添加允许的域名**：
     ```
     https://market-link-express.com/*
     https://admin-market-link-express.com/*
     https://*.netlify.app/*
     http://localhost:*
     ```
   - **API restrictions**: 仅允许必要的 API（Maps JavaScript API, Places API 等）

#### 1.3 创建新的 API Keys

为每个平台创建新的专用 API Key：

**客户端 Web API Key**:
1. 点击 **"Create Credentials"** → **"API Key"**
2. 命名：`ML Express - Client Web`
3. 配置限制（同上）
4. **保存新 Key** → 更新到 Netlify 环境变量

**客户端 App API Key**:
1. 创建新的 API Key
2. 命名：`ML Express - Client App`
3. 配置 Android 应用限制（包名）
4. **保存新 Key** → 更新到 EAS Secrets

**后台管理 Web API Key**:
1. 创建新的 API Key
2. 命名：`ML Express - Admin Web`
3. 配置 HTTP referrer 限制
4. **保存新 Key** → 更新到 Netlify 环境变量

---

### **Step 2: 撤销泄漏的 Supabase Service Keys** ⚡ 高优先级

#### 2.1 登录 Supabase Dashboard

1. 访问：https://app.supabase.com
2. 选择您的项目
3. 进入 **Settings** → **API**

#### 2.2 检查 Service Role Key 是否泄漏

⚠️ **重要**：Service Role Key 具有完全访问权限，如果泄漏必须立即撤销！

1. **如果 Service Role Key 泄漏**：
   - 进入 **Settings** → **API**
   - 找到 **service_role** key
   - 点击 **"Reset"** 或 **"Regenerate"**
   - **保存新 Key** → 更新到服务器环境变量（仅后端使用）

2. **Anon Key 泄漏**（相对安全）：
   - Anon Key 是公开的，但应通过 RLS 策略保护
   - 检查 RLS 策略是否正确配置
   - 如果担心，可以重新生成（但需要更新所有客户端）

---

### **Step 3: 从代码中移除硬编码的 API Keys** ⚡ 高优先级

#### 3.1 更新源代码文件

需要修改的文件：

**客户端 Web**:
- `ml-express-client-web/src/pages/HomePage.tsx`
- `ml-express-client-web/src/pages/TrackingPage.tsx`

**后台管理 Web**:
- `src/pages/HomePage.tsx`
- `src/pages/TrackingPage.tsx`
- `src/pages/RealTimeTracking.tsx`
- `src/pages/DeliveryStoreManagement.tsx`

**客户端 App**:
- `ml-express-client/android/app/src/main/AndroidManifest.xml`
- `ml-express-mobile-app/app.json`
- `ml-express-mobile-app/app.config.js`

**修改方式**：

将硬编码的 fallback 值移除：

```typescript
// ❌ 错误：硬编码 API Key
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBQXxGLGseV9D0tXs01IaZlim6yksYG3mM";

// ✅ 正确：仅使用环境变量
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// 如果环境变量不存在，显示错误
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API Key 未配置！请检查环境变量。');
  // 可以选择显示错误提示给用户
}
```

---

### **Step 4: 更新环境变量配置** ⚡ 高优先级

#### 4.1 更新 Netlify 环境变量

**客户端 Web** (`market-link-express.com`):
1. 登录 Netlify Dashboard
2. 选择站点：**client-ml-express**
3. 进入 **Site settings** → **Environment variables**
4. 更新 `REACT_APP_GOOGLE_MAPS_API_KEY` 为新生成的 Key
5. 点击 **Save**
6. **触发重新部署**

**后台管理 Web** (`admin-market-link-express.com`):
1. 选择站点：**admin-ml-express**
2. 更新 `REACT_APP_GOOGLE_MAPS_API_KEY` 为新生成的 Key
3. **触发重新部署**

#### 4.2 更新 EAS Secrets（客户端 App）

```bash
cd ml-express-client
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value [新生成的API Key] --type string --force
```

#### 4.3 更新本地 .env 文件

**不要提交 .env 文件！**

更新本地 `.env` 文件：
```bash
REACT_APP_GOOGLE_MAPS_API_KEY=[新生成的API Key]
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=[新生成的API Key]
```

---

### **Step 5: 确保 .gitignore 正确配置** ⚡ 中优先级

检查 `.gitignore` 文件，确保包含：

```
# Environment variables
.env
.env*.local
.env.development.local
.env.test.local
.env.production.local

# 敏感文件
*.key
*.pem
*.p12
*.keystore
```

---

### **Step 6: 清理 Git 历史（可选，高级操作）** ⚠️ 谨慎操作

如果密钥已经被提交到 Git 历史中：

⚠️ **警告**：这会重写 Git 历史，需要团队协作！

```bash
# 使用 git-filter-repo 移除敏感信息
git filter-repo --path .env --invert-paths
git filter-repo --path vercel.json --invert-paths

# 强制推送（需要团队协调）
git push origin --force --all
```

**或者**：如果仓库是公开的，考虑：
1. 创建新的私有仓库
2. 迁移代码（不包含敏感信息）
3. 更新部署配置

---

## 📊 修复检查清单

完成以下检查清单，确保所有泄漏已修复：

### Google API Keys
- [ ] 已撤销所有泄漏的 Google API Keys
- [ ] 已创建新的 API Keys
- [ ] 已配置 API Key 限制（HTTP referrers, API restrictions）
- [ ] 已更新 Netlify 环境变量
- [ ] 已更新 EAS Secrets
- [ ] 已从源代码中移除硬编码的 API Keys
- [ ] 已测试新 API Key 正常工作

### Supabase Keys
- [ ] 已检查 Service Role Key 是否泄漏
- [ ] 如果泄漏，已重新生成 Service Role Key
- [ ] 已更新服务器环境变量
- [ ] 已检查 RLS 策略配置
- [ ] 已从代码中移除硬编码的 Keys

### 代码清理
- [ ] 已从所有源代码文件中移除硬编码的 API Keys
- [ ] 已更新所有文件使用环境变量
- [ ] 已添加错误处理（环境变量缺失时）
- [ ] 已测试应用正常运行

### Git 安全
- [ ] 已确认 .gitignore 包含 .env 文件
- [ ] 已确认敏感文件不会被提交
- [ ] （可选）已清理 Git 历史中的敏感信息

---

## 🔒 预防措施

### 1. 使用环境变量

**永远不要**在代码中硬编码 API Keys！

```typescript
// ❌ 错误
const API_KEY = "AIzaSy...";

// ✅ 正确
const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  throw new Error('API Key 未配置');
}
```

### 2. 配置 API Key 限制

**必须**为每个 API Key 配置：
- **Application restrictions**（HTTP referrers 或 Android/iOS 应用限制）
- **API restrictions**（仅允许必要的 API）

### 3. 使用密钥管理服务

考虑使用：
- **AWS Secrets Manager**
- **Google Secret Manager**
- **HashiCorp Vault**
- **Netlify Environment Variables**（已使用）

### 4. 定期轮换密钥

建议每 3-6 个月轮换一次 API Keys。

### 5. 监控 API 使用

定期检查：
- Google Cloud Console → APIs & Services → Dashboard
- 查看 API 使用量和异常请求

---

## 📞 需要帮助？

如果遇到问题：

1. **Google API Key 问题**：
   - Google Cloud Console 支持文档
   - 检查 API 配额和限制

2. **Supabase Key 问题**：
   - Supabase Dashboard → Settings → API
   - 检查 RLS 策略

3. **部署问题**：
   - Netlify Dashboard → Deploys
   - 检查环境变量是否正确加载

---

## ⏱️ 时间线

**立即执行**（今天）：
- ✅ 撤销泄漏的 API Keys
- ✅ 创建新的 API Keys
- ✅ 更新环境变量

**本周内完成**：
- ✅ 从代码中移除硬编码的 Keys
- ✅ 测试所有功能正常
- ✅ 更新文档

**长期维护**：
- ✅ 定期检查密钥安全
- ✅ 监控 API 使用情况
- ✅ 定期轮换密钥

---

**最后更新**: 2024年12月

**状态**: 🚨 紧急修复中

