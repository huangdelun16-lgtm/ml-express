# 🔍 Supabase 配置检查清单

## ⚠️ 当前问题：CORS 错误

从控制台日志看，问题是 **CORS 配置**，不是 RLS 策略。

---

## 📋 需要检查的配置

### 1. Supabase Dashboard 设置

#### 检查项目状态
1. 登录 https://app.supabase.com
2. 选择项目：`uopkyuluxnrewvlmutam`
3. **检查项目状态**：
   - 项目是否暂停？
   - 是否有使用量限制？
   - API 是否正常？

#### 检查 API 设置
1. **Settings** → **API**
2. **检查以下信息**：
   - Project URL: `https://uopkyuluxnrewvlmutam.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Service Role Key: (不要使用这个)

#### 检查 CORS 设置（如果有）
- 某些 Supabase 版本可能有 CORS 设置
- 确认允许的域名包括：
  - `https://market-link-express.com`
  - `https://client-ml-express.netlify.app`

---

### 2. Netlify 环境变量

#### 检查环境变量配置
1. 登录 Netlify Dashboard
2. 选择站点：`client-ml-express`
3. **Site settings** → **Environment variables**
4. **确认以下变量已配置**：
   - `REACT_APP_SUPABASE_URL` = `https://uopkyuluxnrewvlmutam.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 重新部署
- 环境变量更改后，需要**重新部署**站点
- 在 Netlify Dashboard 中点击 **Trigger deploy** → **Deploy site**

---

### 3. 检查 API Key 是否有效

#### 测试 API Key
1. 打开浏览器控制台
2. 执行以下代码：
```javascript
fetch('https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/users?select=id&limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

3. **如果返回 CORS 错误**：
   - 说明 Supabase 项目配置有问题
   - 需要检查项目状态

4. **如果返回数据或 401/403 错误**：
   - 说明 API Key 有效，但可能是 RLS 策略问题

---

## 🔧 可能的解决方案

### 方案 1: 检查 Supabase 项目状态

**Status code: 556** 可能表示：
- 项目暂停
- API 使用量超限
- 项目被限制

**解决**：
1. 检查 Supabase Dashboard 中的项目状态
2. 查看是否有警告或限制通知
3. 如果有，需要升级计划或联系支持

---

### 方案 2: 重新生成 API Key

如果 API Key 可能有问题：

1. **Supabase Dashboard** → **Settings** → **API**
2. **重置 Anon Key**（如果可能）
3. **更新 Netlify 环境变量**
4. **重新部署站点**

---

### 方案 3: 检查 RLS 策略

即使有 CORS 错误，RLS 策略仍然重要：

1. 执行 `fix-users-rls-policy-simple.sql` 脚本
2. 确保策略允许匿名用户查询

---

### 方案 4: 使用 Netlify Functions 代理

如果 CORS 问题无法解决，可以通过 Netlify Functions 代理请求：

创建 `netlify/functions/supabase-proxy.js`：
```javascript
exports.handler = async (event, context) => {
  const { table, action, ...params } = JSON.parse(event.body);
  
  const response = await fetch(`https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/${table}`, {
    method: event.httpMethod,
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify(await response.json())
  };
};
```

---

## 📞 需要的信息

请提供以下信息以便进一步诊断：

1. **Supabase Dashboard 中的项目状态**
   - 项目是否正常？
   - 是否有任何警告？

2. **API Key 测试结果**
   - 在浏览器控制台执行测试代码的结果

3. **Netlify 环境变量**
   - 是否已配置？
   - 值是否正确？

4. **RLS 策略**
   - 是否已执行修复脚本？
   - 策略列表是什么？

