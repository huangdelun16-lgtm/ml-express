# Netlify Functions 依赖问题修复

## 🚨 问题
Netlify Functions 依赖安装失败：
```
Cannot find module 'twilio'
```

## ✅ 解决方案

### 问题原因
Netlify Functions 有自己的 `package.json`，但 Netlify 默认不会自动安装这些依赖。

### 修复步骤

#### 1. 将依赖移到根目录 ✅
已将以下依赖添加到根目录 `package.json`：
```json
{
  "dependencies": {
    "twilio": "^5.3.5",
    "nodemailer": "^6.9.7", 
    "@supabase/supabase-js": "^2.58.0"
  }
}
```

#### 2. 删除 Functions 的 package.json ✅
删除了 `netlify/functions/package.json` 文件

#### 3. 更新 netlify.toml ✅
```toml
[build]
  command = "npm install && npm run build"
  publish = "build"

[functions]
  directory = "netlify/functions"
```

## 📋 Functions 列表
- ✅ `send-sms.js` - 发送短信验证码 (需要 twilio)
- ✅ `send-email-code.js` - 发送邮件验证码 (需要 nodemailer)
- ✅ `verify-sms.js` - 验证短信验证码
- ✅ `verify-email-code.js` - 验证邮件验证码 (需要 @supabase/supabase-js)

## 🎯 预期结果
- ✅ Netlify Functions 依赖正确安装
- ✅ 短信和邮件功能正常工作
- ✅ 部署成功

## 📚 参考
- [Netlify Functions Dependencies](https://docs.netlify.com/functions/overview/)
- [Netlify Build Configuration](https://docs.netlify.com/configure-builds/file-based-configuration/)
