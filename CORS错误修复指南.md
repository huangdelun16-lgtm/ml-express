# 🔧 CORS 错误修复指南

## 📋 问题描述

控制台显示 CORS 错误：
- `Cross-Origin Request Blocked`
- `CORS header 'Access-Control-Allow-Origin' missing`
- `Status code: 556`

这说明 Supabase 的 CORS 配置没有允许客户端 web 的域名。

---

## 🚨 快速修复步骤

### 步骤 1: 检查 Supabase CORS 配置

1. **登录 Supabase Dashboard**
   - 访问：https://app.supabase.com
   - 选择项目：`uopkyuluxnrewvlmutam`

2. **进入项目设置**
   - 左侧菜单 → **Settings** → **API**

3. **检查 CORS 配置**
   - 找到 **CORS** 或 **Allowed Origins** 设置
   - 确认是否包含以下域名：
     - `https://market-link-express.com`
     - `https://client-ml-express.netlify.app`
     - `http://localhost:3000` (本地开发)

---

### 步骤 2: 添加允许的域名

在 Supabase Dashboard 中：

1. **Settings** → **API** → **CORS**
2. **添加以下域名**：
   ```
   https://market-link-express.com
   https://client-ml-express.netlify.app
   https://*.netlify.app
   http://localhost:3000
   http://localhost:8080
   ```

3. **保存设置**

---

### 步骤 3: 如果 Supabase 没有 CORS 设置

Supabase 默认允许所有来源，但如果出现 CORS 错误，可能是：

1. **API Key 配置问题**
   - 确认使用的是 **Anon Key**，不是 Service Role Key
   - 确认 Key 没有过期或被撤销

2. **项目暂停或限制**
   - 检查项目状态是否正常
   - 检查是否有使用量限制

3. **网络问题**
   - 检查网络连接
   - 尝试清除浏览器缓存

---

## 🔍 检查当前配置

### 检查 Supabase 客户端配置

确认 `ml-express-client-web/src/services/supabase.ts` 中的配置：

```typescript
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '...';
```

---

## 🛠️ 临时解决方案

如果无法立即修复 CORS，可以：

1. **使用代理**
   - 通过 Netlify Functions 代理 Supabase 请求
   - 避免 CORS 问题

2. **检查环境变量**
   - 确认 Netlify 环境变量已正确配置
   - 重新部署站点

---

## 📝 验证步骤

修复后：

1. **清除浏览器缓存**
   - 按 `Ctrl+Shift+Delete` (Windows) 或 `Cmd+Shift+Delete` (Mac)
   - 清除缓存和 Cookie

2. **重新加载页面**
   - 按 `Ctrl+F5` (Windows) 或 `Cmd+Shift+R` (Mac) 强制刷新

3. **检查控制台**
   - 应该不再有 CORS 错误
   - 应该可以正常查询用户

---

## ⚠️ 重要提示

**Status code: 556** 通常表示：
- Supabase 服务器拒绝了请求
- 可能是 API Key 问题
- 可能是项目暂停或限制

请检查：
1. Supabase 项目状态
2. API Key 是否有效
3. 是否有使用量限制

