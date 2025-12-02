# 🔧 Netlify API Key 配置修复指南

## ❌ 错误信息
```
数据库错误: Invalid API key (代码: undefined)
```

## 🔍 问题原因
这个错误通常是因为 Netlify 上的环境变量没有正确配置，导致 Supabase API Key 无法正确加载。

## ✅ 解决步骤

### 1. 登录 Netlify Dashboard
访问：https://app.netlify.com

### 2. 选择项目
找到并点击项目：**client-ml-express**

### 3. 进入环境变量设置
1. 点击 **Site settings**（网站设置）
2. 在左侧菜单中找到 **Environment variables**（环境变量）
3. 点击进入

### 4. 配置必需的环境变量

需要添加以下三个环境变量：

#### 变量 1: REACT_APP_SUPABASE_URL
- **Key**: `REACT_APP_SUPABASE_URL`
- **Value**: `https://uopkyuluxnrewvlmutam.supabase.co`
- **Scopes**: 选择所有（Production, Deploy previews, Branch deploys）

#### 变量 2: REACT_APP_SUPABASE_ANON_KEY
- **Key**: `REACT_APP_SUPABASE_ANON_KEY`
- **Value**: `[请从 Supabase Dashboard → Settings → API → API Keys 获取 Anon Key]`
- **Scopes**: 选择所有（Production, Deploy previews, Branch deploys）

#### 变量 3: REACT_APP_GOOGLE_MAPS_API_KEY
- **Key**: `REACT_APP_GOOGLE_MAPS_API_KEY`
- **Value**: `AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE`
- **Scopes**: 选择所有（Production, Deploy previews, Branch deploys）

### 5. 添加环境变量的步骤
1. 点击 **Add a variable**（添加变量）按钮
2. 输入 **Key**（变量名）
3. 输入 **Value**（变量值）
4. 选择 **Scopes**（作用域）
5. 点击 **Save**（保存）
6. 重复以上步骤添加所有三个变量

### 6. 重新部署网站
配置完环境变量后，需要重新部署网站：

#### 方法 1: 触发新部署
1. 在 Netlify Dashboard 中，点击 **Deploys**（部署）标签
2. 点击 **Trigger deploy**（触发部署）→ **Deploy site**（部署网站）

#### 方法 2: 推送代码触发自动部署
```bash
# 在本地项目目录执行
git commit --allow-empty -m "触发 Netlify 重新部署"
git push origin main
```

### 7. 验证配置
1. 等待部署完成（通常需要 2-5 分钟）
2. 访问网站：https://market-link-express.com
3. 尝试创建订单并支付
4. 检查浏览器控制台（F12）是否有错误信息

## 🔍 检查清单

- [ ] 已登录 Netlify Dashboard
- [ ] 已找到项目 `client-ml-express`
- [ ] 已添加 `REACT_APP_SUPABASE_URL`
- [ ] 已添加 `REACT_APP_SUPABASE_ANON_KEY`
- [ ] 已添加 `REACT_APP_GOOGLE_MAPS_API_KEY`
- [ ] 所有变量的 Scopes 都选择了所有环境
- [ ] 已触发重新部署
- [ ] 部署成功完成
- [ ] 网站功能正常

## ⚠️ 常见问题

### Q1: 环境变量已配置，但仍然报错
**A**: 确保：
1. 变量名完全正确（区分大小写）
2. 变量值完整且没有多余的空格
3. 已重新部署网站
4. 清除浏览器缓存后重试

### Q2: 如何确认环境变量已生效？
**A**: 
1. 在 Netlify Dashboard → Deploys → 选择最新部署 → 查看构建日志
2. 搜索 "REACT_APP_SUPABASE" 确认环境变量已加载
3. 检查浏览器控制台（F12）是否有相关警告

### Q3: 部署后仍然失败
**A**: 
1. 检查构建日志中的错误信息
2. 确认 Supabase 项目是否正常运行
3. 确认 API Key 是否有效（未过期或被撤销）
4. 联系技术支持

## 📞 需要帮助？
如果问题持续存在，请联系：
- 电话：(+95) 09788848928 / (+95) 09259369349
- 邮箱：marketlink982@gmail.com

