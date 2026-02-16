// Netlify Function: 发送短信验证码
// 路径: /.netlify/functions/send-sms

const twilio = require('twilio');

// 生成6位随机验证码
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 引入 CORS 工具函数
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

exports.handler = async (event, context) => {
  // 处理 CORS 预检请求
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  });

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let rawPhone = body.phoneNumber || body.phone || '';
    const language = body.language || 'zh';

    // 预处理手机号：去掉所有非数字字符
    rawPhone = rawPhone.replace(/\D/g, '');

    // 缅甸手机号逻辑：
    // 客户可能输入 09... 或 9...
    // 我们统一将其转换为 +959... 格式发送给 Twilio
    let formattedForTwilio = '';
    if (rawPhone.startsWith('95')) {
      formattedForTwilio = '+' + rawPhone; // 已经是 95... 开头
    } else if (rawPhone.startsWith('09')) {
      formattedForTwilio = '+95' + rawPhone.substring(1); // 09... -> +959...
    } else if (rawPhone.startsWith('9')) {
      formattedForTwilio = '+95' + rawPhone; // 9... -> +959...
    } else {
      // 其他情况尝试直接加 +95
      formattedForTwilio = '+95' + rawPhone.replace(/^0+/, '');
    }

    console.log(`📱 Twilio Formatting: Raw=${rawPhone} -> Final=${formattedForTwilio}`);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    // ... (rest of the code)

    const code = generateVerificationCode();
    
    // 构造短信
    const messageBody = language === 'zh' 
      ? `【ML Express】您的验证码是：${code}，5分钟内有效。`
      : `[ML Express] Your verification code is: ${code}. Valid for 5 mins.`;

    console.log(`📱 Attempting to send SMS to: ${formattedForTwilio}`);

    const message = await client.messages.create({
      body: messageBody,
      from: twilioPhone.trim(),
      to: formattedForTwilio
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: language === 'zh' ? '验证码已发送' : 'Verification code sent',
        sid: message.sid
      })
    };

  } catch (error) {
    console.error('❌ SMS Function Error:', error);
    return {
      statusCode: 200, // 即使报错也返回 200，但在 body 中详细说明原因，防止 502
      headers,
      body: JSON.stringify({
        success: false,
        error: '发送失败: ' + (error.message || '未知错误'),
        code: error.code,
        moreInfo: '请检查 Twilio 控制台或余额'
      })
    };
  }
};
