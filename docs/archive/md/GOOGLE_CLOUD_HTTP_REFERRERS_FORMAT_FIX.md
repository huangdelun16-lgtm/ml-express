# 🔧 Google Cloud Console HTTP Referrers 格式修复指南

## ❌ 问题

在 Google Cloud Console 中配置 HTTP referrers 时，以下格式显示为 "Invalid website domain"：
- `http://127.0.0.1:*`
- `http://localhost:*`

## 🔍 原因

Google Cloud Console 的 HTTP referrers 限制不支持 `localhost` 和 `127.0.0.1` 的通配符端口格式。

## ✅ 解决方案

### 方案 1：使用具体的端口号（推荐用于开发）

对于本地开发环境，使用具体的端口号：

```
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
http://127.0.0.1:3001/*
```

**注意**: 需要为每个使用的端口号单独添加一条。

### 方案 2：只添加生产环境域名（推荐用于生产）

如果主要用于生产环境，可以只添加生产域名，本地开发时使用不同的 API Key：

**生产环境域名**:
```
https://market-link-express.com/*
https://*.market-link-express.com/*
https://admin-market-link-express.com/*
https://*.admin-market-link-express.com/*
```

**本地开发**: 使用另一个无限制的 API Key 或使用具体的端口号。

### 方案 3：使用通配符域名（如果支持）

某些情况下，可以使用以下格式（但可能不被支持）：

```
http://localhost/*
http://127.0.0.1/*
```

**注意**: 这个格式可能仍然不被接受，建议使用方案 1 或方案 2。

---

## 📝 推荐配置

### 完整的 HTTP Referrers 配置

在 Google Cloud Console 的 API Key 限制中，添加以下条目：

#### 生产环境（必须）
```
https://market-link-express.com/*
https://*.market-link-express.com/*
https://admin-market-link-express.com/*
https://*.admin-market-link-express.com/*
```

#### 开发环境（可选，使用具体端口）
```
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
http://127.0.0.1:3001/*
```

**注意**: 
- 如果您的开发服务器使用其他端口（如 3002, 8080 等），需要单独添加
- 或者创建一个单独的开发用 API Key，不设置限制（仅用于本地开发）

---

## 🔧 操作步骤

### 步骤 1：删除无效的条目

1. 在 Google Cloud Console 中，找到您的 Web 专用 API Key
2. 点击进入编辑页面
3. 在 "HTTP referrers (web sites)" 部分
4. 删除以下无效条目：
   - `http://127.0.0.1:*` ❌
   - `http://localhost:*` ❌

### 步骤 2：添加正确的格式

#### 如果用于生产环境（推荐）

只添加生产域名：
```
https://market-link-express.com/*
https://*.market-link-express.com/*
https://admin-market-link-express.com/*
https://*.admin-market-link-express.com/*
```

#### 如果需要支持本地开发

添加具体的端口号：
```
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
http://127.0.0.1:3001/*
```

**注意**: 根据您实际使用的端口号调整。

### 步骤 3：保存更改

1. 点击 "保存" 按钮
2. 等待几秒钟让更改生效

---

## 🎯 最佳实践建议

### 推荐方案：创建两个 API Key

#### API Key 1：生产环境专用（Web 应用）

**Application restrictions**: HTTP referrers (web sites)

**只添加生产域名**:
```
https://market-link-express.com/*
https://*.market-link-express.com/*
https://admin-market-link-express.com/*
https://*.admin-market-link-express.com/*
```

**用途**: 
- 客户端 Web（Netlify）
- Admin Web（Vercel）

#### API Key 2：开发环境专用（可选）

**Application restrictions**: None（无限制，仅用于本地开发）

**用途**: 
- 本地开发环境
- 测试环境

**注意**: 
- ⚠️ 这个 API Key 没有限制，安全性较低
- ✅ 仅用于本地开发，不要提交到代码仓库
- ✅ 不要在生产环境使用

---

## 📋 配置检查清单

完成配置后，请确认：

- [ ] ✅ 已删除无效的 `http://127.0.0.1:*` 条目
- [ ] ✅ 已删除无效的 `http://localhost:*` 条目
- [ ] ✅ 已添加生产域名（`https://market-link-express.com/*` 等）
- [ ] ✅ （可选）已添加本地开发端口（`http://localhost:3000/*` 等）
- [ ] ✅ 已保存更改
- [ ] ✅ 等待配置生效（通常立即生效，最多几分钟）

---

## ⚠️ 重要提示

### 1. 本地开发环境

- ✅ 如果主要用于生产环境，可以只添加生产域名
- ✅ 本地开发时，可以临时使用无限制的 API Key（仅用于开发）
- ✅ 或者添加具体的端口号（如 `http://localhost:3000/*`）

### 2. 通配符支持

- ❌ Google Cloud Console **不支持** `localhost:*` 或 `127.0.0.1:*` 格式
- ✅ 必须使用具体的端口号（如 `localhost:3000`）
- ✅ 或者使用通配符域名（如 `*.market-link-express.com`）

### 3. 安全性

- ⚠️ 不要在生产 API Key 中添加无限制的本地开发域名
- ✅ 为本地开发创建单独的 API Key（无限制或限制较少）
- ✅ 生产 API Key 只添加生产域名

---

## 🚀 快速修复步骤

### 立即修复（推荐）

1. **删除无效条目**
   - 在 Google Cloud Console 中删除 `http://127.0.0.1:*` 和 `http://localhost:*`

2. **只添加生产域名**
   ```
   https://market-link-express.com/*
   https://*.market-link-express.com/*
   https://admin-market-link-express.com/*
   https://*.admin-market-link-express.com/*
   ```

3. **保存更改**

4. **本地开发**
   - 如果需要本地开发，创建另一个无限制的 API Key
   - 或在 `.env.local` 中使用不同的 API Key

---

## ✅ 总结

**问题**: `http://127.0.0.1:*` 和 `http://localhost:*` 格式无效

**解决方案**: 
1. ✅ **删除无效条目**
2. ✅ **只添加生产域名**（推荐）
3. ✅ **或添加具体端口号**（如 `http://localhost:3000/*`）

**推荐**: 只添加生产域名，本地开发使用单独的 API Key。

---

**文档创建时间**: 2025-01-16

