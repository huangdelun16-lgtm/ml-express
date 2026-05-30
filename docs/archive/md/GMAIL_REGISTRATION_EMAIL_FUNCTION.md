# 📧 客户端注册账号时发送Gmail验证码功能说明

## 📋 功能概述

客户端App和Web在用户注册账号时，会通过 **Netlify Function** 调用 **Gmail SMTP服务** 发送邮箱验证码到用户的Gmail邮箱。

---

## 🔧 技术实现

### 1. **使用的技术栈**

- **邮件发送库**: `nodemailer` (Node.js)
- **SMTP服务**: Gmail SMTP
- **认证方式**: Gmail应用专用密码 (App Password)
- **后端服务**: Netlify Functions (Serverless)
- **数据库**: Supabase (存储验证码，5分钟有效期)

### 2. **核心文件位置**

#### 客户端App (`ml-express-client`)
- **注册界面**: `ml-express-client/src/screens/RegisterScreen.tsx`
- **API端点**: `https://market-link-express.com/.netlify/functions/send-email-code`

#### 客户端Web (`ml-express-client-web`)
- **注册界面**: `ml-express-client-web/src/pages/HomePage.tsx`
- **邮件服务**: `ml-express-client-web/src/services/emailService.ts`
- **API端点**: `/.netlify/functions/send-email-code` (本地) 或 `https://market-link-express.com/.netlify/functions/send-email-code` (生产)

#### 后端Function (`netlify/functions`)
- **发送验证码**: `netlify/functions/send-email-code.js`
- **验证验证码**: `netlify/functions/verify-email-code.js`

---

## 📨 邮件发送流程

### **Step 1: 用户输入邮箱**
用户在注册页面输入Gmail邮箱地址

### **Step 2: 客户端调用API**
```javascript
// 客户端App示例 (RegisterScreen.tsx)
const response = await fetch('https://market-link-express.com/.netlify/functions/send-email-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: email.trim().toLowerCase(),
    language: language  // 'zh' | 'en' | 'my'
  })
});
```

### **Step 3: Netlify Function处理**
1. **验证邮箱格式**
   ```javascript
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   ```

2. **检查Gmail配置**
   - 环境变量: `GMAIL_USER` (Gmail邮箱地址)
   - 环境变量: `GMAIL_APP_PASSWORD` (Gmail应用专用密码)
   - 如果未配置，返回开发模式固定验证码 `123456`

3. **生成6位随机验证码**
   ```javascript
   function generateVerificationCode() {
     return Math.floor(100000 + Math.random() * 900000).toString();
   }
   ```

4. **存储验证码到Supabase**
   - 表名: `verification_codes`
   - 字段: `email`, `code`, `expires_at`, `used`
   - 有效期: 5分钟

5. **使用Nodemailer发送邮件**
   ```javascript
   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: gmailUser,        // Gmail邮箱
       pass: gmailPass         // Gmail应用专用密码
     }
   });
   
   const mailOptions = {
     from: `"Myanmar Express" <${gmailUser}>`,
     to: email,
     subject: '【缅甸同城快递】邮箱验证码',
     html: createEmailTemplate(code, language)
   };
   
   await transporter.sendMail(mailOptions);
   ```

### **Step 4: 用户收到邮件**
- 邮件主题: `【缅甸同城快递】邮箱验证码` (中文)
- 邮件内容: HTML格式，包含6位验证码
- 支持语言: 中文、英文、缅甸语

---

## 🎨 邮件模板特点

### **HTML邮件模板**
- ✅ 精美的渐变背景设计
- ✅ 大号验证码显示（48px字体）
- ✅ 响应式设计，适配移动端
- ✅ 多语言支持（中文/英文/缅甸语）
- ✅ 品牌标识和Logo

### **邮件内容**
- 问候语（根据语言）
- 验证码（6位数字，大号显示）
- 有效期提示（5分钟内有效）
- 安全提示（不要泄露给他人）

---

## ⚙️ 环境变量配置

### **Netlify环境变量**

需要在Netlify Dashboard中配置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GMAIL_USER` | Gmail邮箱地址 | `support@ml-express.com` |
| `GMAIL_APP_PASSWORD` | Gmail应用专用密码 | `abcd efgh ijkl mnop` |

### **如何获取Gmail应用专用密码**

1. 登录Google账户: https://myaccount.google.com/
2. 启用两步验证（如果未启用）
3. 访问: https://myaccount.google.com/apppasswords
4. 选择应用: "邮件"
5. 选择设备: "其他（自定义名称）"
6. 输入名称: `ML Express Netlify`
7. 生成并保存16位密码

---

## 🔄 开发模式 vs 生产模式

### **开发模式** (Gmail未配置时)
- 返回固定验证码: `123456`
- 不实际发送邮件
- 响应中包含 `isDevelopmentMode: true`
- 用于本地开发和测试

### **生产模式** (Gmail已配置)
- 生成随机6位验证码
- 实际发送邮件到用户邮箱
- 验证码存储在Supabase
- 5分钟有效期

---

## 📊 验证码验证流程

### **Step 1: 用户输入验证码**
用户在注册页面输入收到的6位验证码

### **Step 2: 调用验证API**
```javascript
// 客户端调用
const response = await fetch('/.netlify/functions/verify-email-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code, language })
});
```

### **Step 3: 验证逻辑**
1. 查询Supabase中的验证码记录
2. 检查验证码是否匹配
3. 检查是否已使用 (`used = false`)
4. 检查是否过期 (`expires_at > now()`)
5. 标记为已使用 (`used = true`)

---

## 🛡️ 安全特性

1. **验证码有效期**: 5分钟自动过期
2. **一次性使用**: 验证后标记为已使用
3. **邮箱格式验证**: 前端和后端双重验证
4. **环境变量保护**: Gmail密码存储在Netlify环境变量中
5. **CORS保护**: 仅允许POST请求
6. **错误处理**: 完善的错误处理和日志记录

---

## 📝 代码示例

### **客户端App调用示例**
```typescript
// ml-express-client/src/screens/RegisterScreen.tsx
const handleSendCode = async () => {
  try {
    const response = await fetch(
      'https://market-link-express.com/.netlify/functions/send-email-code',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          language: language
        })
      }
    );
    
    const result = await response.json();
    if (result.success) {
      // 显示成功提示
      // 开始倒计时
    }
  } catch (error) {
    // 错误处理
  }
};
```

### **客户端Web调用示例**
```typescript
// ml-express-client-web/src/services/emailService.ts
export async function sendEmailVerificationCode(
  email: string,
  language: 'zh' | 'en' | 'my' = 'zh'
): Promise<VerificationResult> {
  const functionUrl = process.env.NODE_ENV === 'production' 
    ? '/.netlify/functions/send-email-code'
    : 'https://market-link-express.com/.netlify/functions/send-email-code';
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, language })
  });
  
  return await response.json();
}
```

---

## 🐛 故障排查

### **问题1: 邮件发送失败**
- ✅ 检查Netlify环境变量是否配置
- ✅ 检查Gmail应用专用密码是否正确
- ✅ 检查Gmail账户是否启用两步验证
- ✅ 查看Netlify Function日志

### **问题2: 验证码验证失败**
- ✅ 检查Supabase连接是否正常
- ✅ 检查验证码是否过期（5分钟）
- ✅ 检查验证码是否已被使用
- ✅ 检查邮箱地址是否匹配

### **问题3: 开发模式一直返回123456**
- ✅ 检查Netlify环境变量 `GMAIL_USER` 和 `GMAIL_APP_PASSWORD` 是否配置
- ✅ 重新部署Netlify Function
- ✅ 检查环境变量是否在正确的站点配置

---

## 📚 相关文档

- [Gmail验证码配置指南](./GMAIL-VERIFICATION-SETUP.md)
- [Netlify Functions文档](https://docs.netlify.com/functions/overview/)
- [Nodemailer文档](https://nodemailer.com/about/)

---

**最后更新**: 2024年12月

