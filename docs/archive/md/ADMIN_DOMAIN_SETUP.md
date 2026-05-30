# 后台管理域名配置步骤

## ✅ 当前状态

- ✅ 后台管理项目已成功部署
- ✅ 构建错误已修复（ProtectedRoute 已提交）
- ✅ 可以访问：https://market-link-express.com

## 🎯 配置 admin-market-link-express.com 域名

### 步骤 1：在 Netlify Dashboard 中添加域名

1. **访问域名设置页面：**
   - 打开：https://app.netlify.com/projects/market-link-express/settings/domain
   - 或者：https://app.netlify.com/projects/market-link-express → **Site settings** → **Domain management**

2. **添加新域名：**
   - 点击 **Add custom domain** 按钮
   - 输入：`admin-market-link-express.com`
   - 点击 **Verify**

3. **查看 DNS 配置说明：**
   - Netlify 会显示需要配置的 DNS 记录
   - 通常是一个 CNAME 记录

### 步骤 2：在你的域名注册商配置 DNS

在你的域名注册商（如 GoDaddy, Namecheap, Cloudflare）添加以下 DNS 记录：

#### 选项 1：使用 CNAME 记录（推荐）

```
类型    主机名/名称    值/目标
CNAME   admin          market-link-express.netlify.app
```

#### 选项 2：使用 Netlify DNS（最简单）

1. 在 Netlify Dashboard 中，进入 **Site settings** → **Domain management**
2. 找到你的域名 `market-link-express.com`
3. 点击 **Use Netlify DNS**
4. Netlify 会显示 nameservers（如：`dns1.p01.nsone.net`）
5. 在你的域名注册商更新 nameservers
6. Netlify 会自动管理所有 DNS 记录，包括子域名

### 步骤 3：等待 DNS 生效

- DNS 配置通常需要 **5-30 分钟** 生效
- 最多可能需要 **24 小时**
- 可以在 Netlify Dashboard 中查看域名验证状态

### 步骤 4：验证访问

DNS 生效后：
- 访问：https://admin-market-link-express.com
- 应该能看到后台管理登录页面

## 🔄 域名分配方案

**最终配置应该是：**

| 项目 | Netlify 项目名 | 域名 | 用途 |
|------|---------------|------|------|
| 客户端 Web | `client-ml-express` | `market-link-express.com` | 客户下单、跟踪 |
| 后台管理 | `market-link-express` | `admin-market-link-express.com` | 管理员后台 |

## ⚠️ 当前问题

目前 `market-link-express.com` 还在后台管理项目上，需要：

1. **从后台管理项目移除** `market-link-express.com`
2. **添加到客户端项目** `client-ml-express`
3. **为后台管理添加** `admin-market-link-express.com`

## 📋 完整域名迁移步骤

### 步骤 A：为客户端项目添加 market-link-express.com

1. 访问：https://app.netlify.com/projects/client-ml-express/settings/domain
2. 点击 **Add custom domain**
3. 输入：`market-link-express.com`
4. 按照提示配置 DNS

### 步骤 B：从后台管理项目移除 market-link-express.com

1. 访问：https://app.netlify.com/projects/market-link-express/settings/domain
2. 找到 `market-link-express.com`
3. 点击 **Remove** 或 **Unlink**
4. 确认移除

### 步骤 C：为后台管理添加 admin-market-link-express.com

1. 在同一个页面（market-link-express 的域名设置）
2. 点击 **Add custom domain**
3. 输入：`admin-market-link-express.com`
4. 按照提示配置 DNS

## 🚀 临时访问方式

在域名配置完成之前，可以使用：

- **后台管理**: https://market-link-express.netlify.app
- **客户端 Web**: https://client-ml-express.netlify.app

## ✅ 验证清单

配置完成后，检查：

- [ ] `admin-market-link-express.com` 可以访问后台管理
- [ ] `market-link-express.com` 可以访问客户端 Web
- [ ] SSL 证书已自动配置（HTTPS 可用）
- [ ] 两个网站功能正常

