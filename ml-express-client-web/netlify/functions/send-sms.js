// Netlify Function: 发送短信验证码 (增强安全版)
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
  const preflightResponse = handleCorsPreflight(event, { allowedMethods: ['POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] });
  if (preflightResponse) return preflightResponse;

  const headers = getCorsHeaders(event, { allowedMethods: ['POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] });

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let rawPhone = body.phoneNumber || body.phone || '';
    const language = body.language || 'zh';
    const captchaToken = body.captchaToken; // 预留给第3步

    // 1. 基础验证
    rawPhone = rawPhone.replace(/\D/g, '');
    if (!rawPhone) return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '请输入手机号' }) };

    // 2. 后端频率限制 (使用 Supabase)
    if (supabase) {
      const identifier = 'PHONE_' + rawPhone;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

      // A. 检查 60 秒内是否发过
      const { count: recentCount } = await supabase
        .from('verification_codes')
        .select('*', { count: 'exact', head: true })
        .eq('email', identifier)
        .gt('created_at', oneMinuteAgo);

      if (recentCount && recentCount > 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '请求太频繁，请 60 秒后再试' }) };
      }

      // B. 检查 1 小时内发送次数 (上限 3 次)
      const { count: hourCount } = await supabase
        .from('verification_codes')
        .select('*', { count: 'exact', head: true })
        .eq('email', identifier)
        .gt('created_at', oneHourAgo);

      if (hourCount && hourCount >= 3) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '该号码发送验证码过于频繁，请 1 小时后再试' }) };
      }
    }

    // 3. Twilio 配置检查
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || (!twilioPhone && !messagingServiceSid)) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '测试模式: 123456', isDevelopmentMode: true }) };
    }

    // 4. 执行发送
    const client = twilio(accountSid.trim(), authToken.trim());
    const code = generateVerificationCode();
    
    // 存储到数据库 (带 created_at)
    if (supabase) {
      const identifier = 'PHONE_' + rawPhone;
      await supabase.from('verification_codes').delete().eq('email', identifier).lt('expires_at', new Date().toISOString()); // 清理过期
      await supabase.from('verification_codes').insert({
        email: identifier,
        code: code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        used: false
      });
    }

    const messageBody = language === 'zh' 
      ? `【ML Express】您的验证码是：${code}，5分钟内有效。`
      : `[ML Express] Your verification code is: ${code}. Valid for 5 mins.`;

    const toPhone = (rawPhone.startsWith('95') ? '+' : '+95') + rawPhone.replace(/^0+/, '');

    const message = await client.messages.create({
      body: messageBody,
      to: toPhone,
      ...(messagingServiceSid ? { messagingServiceSid: messagingServiceSid.trim() } : { from: twilioPhone.trim() })
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, messageSid: message.sid }) };

  } catch (error) {
    console.error('❌ SMS Error:', error);
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '发送失败: ' + error.message }) };
  }
};
