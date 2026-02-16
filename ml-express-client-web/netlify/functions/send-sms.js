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

    // 预处理手机号：去掉所有空格、横杠、括号
    rawPhone = rawPhone.replace(/\D/g, '');

    // 验证手机号格式 (缅甸 09 开头，后面 7-9 位数字)
    if (!rawPhone || !/^09\d{7,9}$/.test(rawPhone)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: language === 'zh' ? '无效的手机号格式，请输入 09 开头的缅甸号码' : 'Invalid Myanmar phone number'
        })
      };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    // 如果没配置 Twilio，返回模拟成功（开发模式）
    if (!accountSid || !authToken || !twilioPhone) {
      console.log('⚠️ Twilio Credentials missing, using Dev Mode');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '验证码已发送（测试模式，请输入 123456）',
          code: '123456',
          isDevelopmentMode: true
        })
      };
    }

    // 初始化 Twilio (放入 try 以防环境变量格式错误导致崩溃)
    let client;
    try {
      client = twilio(accountSid.trim(), authToken.trim());
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Twilio 初始化失败，请检查 SID/TOKEN 格式', details: err.message })
      };
    }

    const code = generateVerificationCode();
    
    // 构造短信
    const messageBody = language === 'zh' 
      ? `【ML Express】您的验证码是：${code}，5分钟内有效。`
      : `[ML Express] Your verification code is: ${code}. Valid for 5 mins.`;

    // 转换成国际格式 +959...
    const toPhone = '+95' + rawPhone.substring(1);

    console.log(`📱 Attempting to send SMS to: ${toPhone}`);

    const message = await client.messages.create({
      body: messageBody,
      from: twilioPhone.trim(),
      to: toPhone
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
