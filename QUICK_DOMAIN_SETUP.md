# 快速域名配置指南

## ✅ 当前状态

- **client-ml-express** 项目已成功部署 ✅
- **market-link-express** 项目已有 `market-link-express.com` 域名

## 🎯 需要完成的配置

### 步骤 1：配置 client-ml-express 的域名

1. 访问：https://app.netlify.com/projects/client-ml-express/settings/domain
2. 点击 **Add custom domain**
3. 输入：`market-link-express.com`
4. 点击 **Verify**
5. 按照提示配置 DNS 记录

### 步骤 2：从 market-link-express 移除域名

1. 访问：https://app.netlify.com/projects/market-link-express/settings/domain
2. 找到 `market-link-express.com`
3. 点击 **Remove** 或 **Unlink**
4. 确认移除

### 步骤 3：为 market-link-express 添加新域名

1. 在同一个页面（market-link-express 的域名设置）
2. 点击 **Add custom domain**
3. 输入：`admin-market-link-express.com`
4. 点击 **Verify**
5. 按照提示配置 DNS 记录

## 📋 DNS 配置

在你的域名注册商配置以下 DNS 记录：

```
类型    主机名    值
CNAME   admin     market-link-express.netlify.app
CNAME   @         client-ml-express.netlify.app
```

或者使用 Netlify DNS（推荐）：
1. 在 Netlify Dashboard 中，进入域名设置
2. 点击 **Use Netlify DNS**
3. 按照提示更新 nameservers

## ⚙️ 环境变量配置

### client-ml-express 项目

访问：https://app.netlify.com/projects/client-ml-express/settings/env

添加：
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_GOOGLE_MAPS_API_KEY`

## ✅ 验证

配置完成后：
- 客户端 Web: https://market-link-express.com
- 后台管理: https://admin-market-link-express.com

