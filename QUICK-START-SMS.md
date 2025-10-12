# 📱 短信验证码快速开始指南

## 🚀 5分钟快速配置

### **第一步：注册 Twilio（免费）**

1. 访问：https://www.twilio.com/try-twilio
2. 注册账号（使用您的邮箱）
3. 验证邮箱和手机号
4. **获得 $15.50 免费额度！**

---

### **第二步：获取 API 凭证**

登录后，在 Dashboard 复制：

```
Account SID:  ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token:   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### **第三步：购买电话号码（免费）**

1. 点击左侧菜单 **Phone Numbers** → **Manage** → **Buy a number**
2. 选择国家：**United States** 
3. 勾选 **SMS**
4. 点击 **Search**
5. 选择一个号码，点击 **Buy**
6. 复制号码（格式：`+1xxxxxxxxxx`）

---

### **第四步：配置 Netlify 环境变量**

1. 登录 **Netlify Dashboard**：https://app.netlify.com/
2. 选择您的项目 **ml-express**
3. 进入 **Site settings** → **Environment variables**
4. 点击 **Add a variable**，添加以下3个变量：

#### **变量 1：**
```
Key:   TWILIO_ACCOUNT_SID
Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### **变量 2：**
```
Key:   TWILIO_AUTH_TOKEN
Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### **变量 3：**
```
Key:   TWILIO_PHONE_NUMBER
Value: +1xxxxxxxxxx
```

5. 点击 **Save**

---

### **第五步：安装依赖并部署**

在本地项目中运行：

```bash
# 安装 Twilio SDK
npm install twilio

# 提交代码
git add .
git commit -m "feat: Add SMS verification"
git push

# Netlify 会自动部署
```

---

## ✅ 测试

### **开发模式（未配置 Twilio）**

- 固定验证码：`123456`
- 不发送真实短信
- 控制台会显示日志

### **生产模式（已配置 Twilio）**

1. 打开网站注册页面
2. 输入缅甸手机号（09xxxxxxxx）
3. 点击"发送验证码"
4. 等待1-2分钟接收短信
5. 输入验证码
6. 完成注册

---

## 💰 费用

| 项目 | 费用 |
|------|------|
| 注册 | 免费 |
| 免费额度 | $15.50 |
| 每条短信（缅甸） | $0.0545 |
| 免费额度可发送 | ~284条短信 |

**建议**：先用免费额度测试，稳定后再充值。

---

## 📞 联系支持

- **Twilio 支持**：https://support.twilio.com/
- **文档**：https://www.twilio.com/docs/sms

---

## 🔗 相关文件

- `netlify/functions/send-sms.js` - 发送短信的云函数
- `netlify/functions/verify-sms.js` - 验证码验证函数
- `src/services/smsService.ts` - 前端 SMS 服务
- `SMS-VERIFICATION-SETUP.md` - 详细配置文档

---

## ⚠️ 重要提示

1. **不要**将 Twilio 凭证提交到 Git
2. **只在** Netlify 环境变量中配置
3. **测试**完成后再上生产
4. **监控**短信发送量，避免超支

---

## 🎉 完成！

配置完成后，您的系统就可以发送短信验证码了！

如有问题，请参考 `SMS-VERIFICATION-SETUP.md` 详细文档。

