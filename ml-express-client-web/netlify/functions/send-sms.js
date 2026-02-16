// Netlify Function: 发送短信验证码
// 路径: /.netlify/functions/send-sms

const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

    if (!rawPhone) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '请输入电话号码' }) };
    }

    // 缅甸手机号逻辑：转换成 Twilio 要求的国际格式 +959...
    let formattedForTwilio = '';
    if (rawPhone.startsWith('959')) {
      formattedForTwilio = '+' + rawPhone;
    } else if (rawPhone.startsWith('95')) {
      formattedForTwilio = '+' + rawPhone;
    } else if (rawPhone.startsWith('09')) {
      formattedForTwilio = '+95' + rawPhone.substring(1);
    } else if (rawPhone.startsWith('9')) {
      formattedForTwilio = '+95' + rawPhone;
    } else {
      formattedForTwilio = '+95' + rawPhone.replace(/^0+/, '');
    }

    console.log(`📱 Twilio Formatting: Raw=${rawPhone} -> Final=${formattedForTwilio}`);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    // 如果没配置 Twilio，返回模拟成功（开发模式）
    if (!accountSid || !authToken || (!twilioPhone && !messagingServiceSid)) {
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

    // 初始化 Twilio
    let client;
    try {
      client = twilio(accountSid.trim(), authToken.trim());
    } catch (err) {
      console.error('Twilio Init Error:', err);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, error: 'Twilio 配置格式错误，请检查 SID/TOKEN' })
      };
    }

    const code = generateVerificationCode();
    
    // 存储验证码到 Supabase (借用 email 字段存储手机号)
    if (supabase) {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const identifier = 'PHONE_' + rawPhone; // 使用特殊前缀防止与邮箱冲突
      
      // 删除旧验证码
      await supabase.from('verification_codes').delete().eq('email', identifier);
      
      // 插入新验证码
      const { error: dbError } = await supabase.from('verification_codes').insert({
        email: identifier,
        code: code,
        expires_at: expiresAt,
        used: false
      });
      
      if (dbError) console.error('❌ Supabase Save Error:', dbError);
      else console.log(`✅ Code stored in DB for ${identifier}`);
    }

    // 构造短信内容
    const messageBody = language === 'zh' 
      ? `【ML Express】您的验证码是：${code}，5分钟内有效。`
      : `[ML Express] Your verification code is: ${code}. Valid for 5 mins.`;

    console.log(`📱 Attempting to send SMS to: ${formattedForTwilio}`);

    // 发送参数：优先使用 Messaging Service
    const sendOptions = {
      body: messageBody,
      to: formattedForTwilio
    };

    if (messagingServiceSid) {
      sendOptions.messagingServiceSid = messagingServiceSid.trim();
    } else {
      sendOptions.from = twilioPhone.trim();
    }

    const message = await client.messages.create(sendOptions);

    console.log(`✅ SMS Sent Success, SID: ${message.sid}`);

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
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: '发送失败: ' + (error.message || '未知错误'),
        errorCode: error.code
      })
    };
  }
};
