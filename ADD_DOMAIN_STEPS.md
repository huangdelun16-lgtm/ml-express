# 添加 market-link-express.com 域名步骤

## ✅ 当前状态

- ✅ 构建配置已正确设置（Base directory 和 Publish directory）
- ✅ 代码已提交并部署

## 🎯 需要添加域名

**是的，需要在 client-ml-express 项目中添加 `market-link-express.com` 域名！**

### 步骤：

1. **在当前的域名管理页面（图二）中：**
   - 点击 **"Add a domain"** 按钮

2. **输入域名：**
   - 输入：`market-link-express.com`
   - 点击 **Verify** 或 **Add**

3. **配置 DNS：**
   - Netlify 会显示需要配置的 DNS 记录
   - 通常是一个 CNAME 记录，指向 `client-ml-express.netlify.app`

4. **在你的域名注册商配置 DNS：**
   ```
   类型    主机名    值
   CNAME   @         client-ml-express.netlify.app
   ```
   或者如果使用子域名：
   ```
   CNAME   www       client-ml-express.netlify.app
   ```

5. **等待 DNS 生效：**
   - 通常需要 5-30 分钟
   - 最多可能需要 24 小时

## ⚠️ 重要提示

### 关于 netlify.toml 的警告

图一中显示的警告：
> "Overridden by netlify.toml. Published deploy built with '/Users/aungmyatthu/Desktop/ml-express'."

这个警告是因为 `netlify.toml` 中的配置与 Dashboard 中的配置不一致。

**解决方案：**
- 我已经更新了 `ml-express-client-web/netlify.toml`，移除了可能冲突的配置
- Dashboard 中的配置会优先使用
- 下次部署时警告应该会消失

## 📋 域名分配方案

配置完成后：

| 项目 | Netlify 项目名 | 域名 | 用途 |
|------|---------------|------|------|
| 客户端 Web | `client-ml-express` | `market-link-express.com` | 客户下单、跟踪 |
| 后台管理 | `market-link-express` | `admin-market-link-express.com` | 管理员后台 |

## ✅ 验证

添加域名后：
1. 等待 DNS 生效
2. 访问 https://market-link-express.com
3. 应该能看到客户端 Web 的首页

