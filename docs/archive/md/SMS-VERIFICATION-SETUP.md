# 📱 短信验证码配置指南

## 目录
- [方案对比](#方案对比)
- [Twilio 配置步骤](#twilio-配置步骤推荐)
- [其他方案](#其他方案)
- [代码集成](#代码集成)
- [测试验证](#测试验证)
- [常见问题](#常见问题)

---

## 📊 方案对比

| 方案 | 支持缅甸 | 价格 | 难度 | 推荐度 |
|------|---------|------|------|--------|
| **Twilio** | ✅ | $0.0545/条 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Vonage (Nexmo)** | ✅ | $0.0522/条 | ⭐⭐ | ⭐⭐⭐⭐ |
| **AWS SNS** | ✅ | $0.05/条 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **MessageBird** | ✅ | €0.045/条 | ⭐⭐ | ⭐⭐⭐⭐ |
| **缅甸本地运营商** | ✅ | 便宜 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 Twilio 配置步骤（推荐）

### **第一步：注册 Twilio 账号**

1. 访问 [Twilio 注册页面](https://www.twilio.com/try-twilio)
2. 填写信息：
   - First name / Last name
   - Email
   - Password
3. 验证邮箱
4. 验证手机号（可以用中国手机号）

**注册成功后获得 $15.50 免费额度！**

---

### **第二步：获取 API 凭证**

1. 登录 [Twilio Console](https://console.twilio.com/)
2. 在 Dashboard 页面找到：
   ```
   Account SID:  ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token:   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. 复制这两个值，稍后配置使用

---

### **第三步：购买 Twilio 电话号码**

1. 进入 [Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. 点击 **"Buy a Number"**
3. 选择国家：**United States**（美国号码可发送到缅甸）
4. 勾选 **SMS** 功能
5. 点击 **"Search"**
6. 选择一个号码，点击 **"Buy"**
7. 确认购买（使用免费额度，无需付费）

**获得的号码格式**：`+1xxxxxxxxxx`

---

### **第四步：配置环境变量**

在项目根目录创建 `.env` 文件（或修改现有文件）：

```env
# Twilio SMS 配置
REACT_APP_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REACT_APP_TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

**⚠️ 重要：** 
- 不要将 `.env` 文件提交到 Git
- 添加到 `.gitignore` 中

---

### **第五步：安装依赖**

```bash
npm install twilio
```

或

```bash
yarn add twilio
```

---

### **第六步：Netlify 环境变量配置**

由于前端应用部署在 Netlify，需要配置环境变量：

1. 登录 [Netlify Dashboard](https://app.netlify.com/)
2. 选择您的项目
3. 进入 **Site settings** → **Environment variables**
4. 点击 **Add a variable**
5. 添加三个变量：
   ```
   Key: REACT_APP_TWILIO_ACCOUNT_SID
   Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   Key: REACT_APP_TWILIO_AUTH_TOKEN
   Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   
   Key: REACT_APP_TWILIO_PHONE_NUMBER
   Value: +1xxxxxxxxxx
   ```
6. 点击 **Save**
7. 重新部署网站

---

## ⚠️ 重要提示：前端限制

由于您的项目是纯前端应用（React），**直接在前端调用 Twilio API 会暴露您的密钥**，存在安全风险。

### **推荐解决方案：**

#### **方案 A：使用 Netlify Functions（推荐）**

创建无服务器函数来处理短信发送：

1. 在项目中创建 `netlify/functions/send-sms.js`：

```javascript
const twilio = require('twilio');

exports.handler = async (event, context) => {
  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { phoneNumber, language } = JSON.parse(event.body);

    // 初始化 Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // 生成验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 构建短信内容
    let messageText = '';
    if (language === 'zh') {
      messageText = `【缅甸同城快递】您的验证码是：${code}，5分钟内有效。`;
    } else if (language === 'en') {
      messageText = `[Myanmar Express] Your verification code is: ${code}. Valid for 5 minutes.`;
    } else {
      messageText = `[Myanmar Express] သင့်အတည်ပြုကုဒ်မှာ: ${code} ဖြစ်ပါသည်။`;
    }

    // 发送短信
    const internationalPhone = phoneNumber.replace(/^0/, '+95');
    
    const message = await client.messages.create({
      body: messageText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: internationalPhone
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        code: code, // 在生产环境中，应该存储在数据库而不是返回
        messageSid: message.sid
      })
    };
  } catch (error) {
    console.error('发送短信失败:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
```

2. 在 `netlify.toml` 中配置：

```toml
[build]
  functions = "netlify/functions"
```

3. 前端调用：

```typescript
// 调用 Netlify Function
const response = await fetch('/.netlify/functions/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '09xxxxxxxx',
    language: 'zh'
  })
});

const result = await response.json();
if (result.success) {
  console.log('验证码:', result.code);
}
```

---

#### **方案 B：使用 Supabase Edge Functions**

1. 在 Supabase Dashboard 创建 Edge Function
2. 部署短信发送逻辑
3. 从前端调用 Supabase Function

---

## 🔧 其他短信服务方案

### **1. Vonage (Nexmo)**

- **网址**: https://www.vonage.com/
- **价格**: $0.0522/条
- **配置类似 Twilio**

```bash
npm install @vonage/server-sdk
```

---

### **2. AWS SNS**

- **网址**: https://aws.amazon.com/sns/
- **价格**: $0.05/条
- **需要 AWS 账号**

```bash
npm install @aws-sdk/client-sns
```

---

### **3. MessageBird**

- **网址**: https://www.messagebird.com/
- **价格**: €0.045/条
- **欧洲公司，支持缅甸**

```bash
npm install messagebird
```

---

### **4. 缅甸本地运营商**

如果您在缅甸有本地业务，可以联系：

- **MPT (Myanmar Posts and Telecommunications)**
- **Ooredoo Myanmar**
- **Telenor Myanmar**

**优点**：
- 更便宜
- 本地化支持

**缺点**：
- 需要本地营业执照
- 申请流程复杂
- 技术文档可能不完善

---

## 💻 代码集成示例

### **前端集成（使用 Netlify Functions）**

修改 `src/pages/HomePage.tsx`：

```typescript
// 添加验证码相关状态
const [verificationCode, setVerificationCode] = useState('');
const [sentCode, setSentCode] = useState('');
const [codeSent, setCodeSent] = useState(false);
const [countdown, setCountdown] = useState(0);

// 发送验证码
const handleSendVerificationCode = async () => {
  if (countdown > 0) {
    alert('请稍后再试');
    return;
  }

  if (!registerForm.phone) {
    alert('请先输入手机号');
    return;
  }

  try {
    // 调用 Netlify Function
    const response = await fetch('/.netlify/functions/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: registerForm.phone,
        language: language
      })
    });

    const result = await response.json();

    if (result.success) {
      setSentCode(result.code); // 仅开发环境，生产环境不返回
      setCodeSent(true);
      setCountdown(60); // 60秒倒计时
      alert('验证码已发送');
    } else {
      alert(result.error || '发送失败');
    }
  } catch (error) {
    console.error('发送验证码失败:', error);
    alert('网络错误，请重试');
  }
};

// 倒计时
useEffect(() => {
  if (countdown > 0) {
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }
}, [countdown]);
```

### **在注册表单中添加验证码输入框**

```tsx
{/* 手机号 */}
<div style={{ marginBottom: '1.5rem' }}>
  <label>手机号 *</label>
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    <input
      type="tel"
      value={registerForm.phone}
      onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
      placeholder="09xxxxxxxx"
      style={{ flex: 1 }}
    />
    <button
      type="button"
      onClick={handleSendVerificationCode}
      disabled={countdown > 0}
      style={{
        padding: '0.8rem 1rem',
        background: countdown > 0 ? '#cbd5e0' : '#38a169',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: countdown > 0 ? 'not-allowed' : 'pointer'
      }}
    >
      {countdown > 0 ? `${countdown}秒` : '发送验证码'}
    </button>
  </div>
</div>

{/* 验证码 */}
{codeSent && (
  <div style={{ marginBottom: '1.5rem' }}>
    <label>验证码 *</label>
    <input
      type="text"
      value={verificationCode}
      onChange={(e) => setVerificationCode(e.target.value)}
      placeholder="请输入6位验证码"
      maxLength={6}
      required
    />
  </div>
)}
```

---

## ✅ 测试验证

### **开发环境测试**

如果未配置 Twilio，系统会自动使用**开发模式**：
- 固定验证码：`123456`
- 控制台输出日志
- 不实际发送短信

### **生产环境测试**

1. 配置 Twilio 凭证
2. 使用真实缅甸手机号测试
3. 检查短信接收
4. 验证倒计时功能
5. 测试验证码验证

---

## 🐛 常见问题

### **Q1: 为什么收不到短信？**

**A:** 检查以下几点：
1. 手机号格式正确（09xxxxxxxx）
2. Twilio 号码已购买且支持 SMS
3. 账户余额充足
4. 号码不在黑名单中
5. 缅甸地区网络正常

---

### **Q2: 如何降低成本？**

**A:** 
1. 设置倒计时（60秒内不能重复发送）
2. 添加图形验证码（防止恶意请求）
3. 限制每个号码每天发送次数
4. 使用更便宜的服务商

---

### **Q3: 验证码有效期多久？**

**A:** 
- 默认：5分钟
- 可在 `smsService.ts` 中修改：
  ```typescript
  expires: Date.now() + 5 * 60 * 1000 // 5分钟
  ```

---

### **Q4: 如何防止验证码被滥用？**

**A:**
1. **频率限制**：60秒内只能发送一次
2. **IP 限制**：同一 IP 每天最多发送10次
3. **图形验证码**：发送前先通过人机验证
4. **手机号验证**：检查号码真实性
5. **数据库记录**：记录所有发送日志

---

## 📞 技术支持

- **Twilio 文档**: https://www.twilio.com/docs/sms
- **Twilio 中文文档**: https://www.twilio.com/docs/sms/quickstart/node
- **Netlify Functions**: https://docs.netlify.com/functions/overview/

---

## 💰 费用估算

假设每天注册 100 个新用户：

| 服务商 | 单价 | 日费用 | 月费用 |
|--------|------|--------|--------|
| Twilio | $0.0545 | $5.45 | $163.50 |
| Vonage | $0.0522 | $5.22 | $156.60 |
| AWS SNS | $0.05 | $5.00 | $150.00 |

**推荐**：先使用 Twilio 的免费额度测试，稳定后再考虑优化成本。

---

## 🚀 下一步

1. ✅ 已创建 `smsService.ts` 文件
2. ⏳ 创建 Netlify Function（`netlify/functions/send-sms.js`）
3. ⏳ 在 HomePage 中集成验证码功能
4. ⏳ 测试短信发送
5. ⏳ 部署到生产环境

需要我帮您继续实现吗？

