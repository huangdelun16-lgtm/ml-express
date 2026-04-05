// Netlify Function: 发送短信验证码 (与 ml-express-client-web/netlify/functions 对齐)
// 后台站点部署时使用本仓库根目录 netlify/functions

const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    rawPhone = rawPhone.replace(/\D/g, '');
    if (!rawPhone) return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '请输入手机号' }) };

    if (supabase) {
      const identifier = 'PHONE_' + rawPhone;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

      const { count: recentCount } = await supabase.from('verification_codes').select('*', { count: 'exact', head: true }).eq('email', identifier).gt('created_at', oneMinuteAgo);
      if (recentCount > 0) return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '请求太频繁，请 1 分钟后再试' }) };

      const { count: hourCount } = await supabase.from('verification_codes').select('*', { count: 'exact', head: true }).eq('email', identifier).gt('created_at', oneHourAgo);
      if (hourCount >= 3) return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '该号码发送验证码过于频繁，请 1 小时后再试' }) };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || (!twilioPhone && !messagingServiceSid)) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '测试模式: 123456', isDevelopmentMode: true }) };
    }

    const client = twilio(accountSid.trim(), authToken.trim());

    const toPhone = (rawPhone.startsWith('95') ? '+' : '+95') + rawPhone.replace(/^0+/, '');

    console.log(`🔍 正在执行 Lookup 检测: ${toPhone}`);
    try {
      const lookup = await client.lookups.v2.phoneNumbers(toPhone).fetch({ fields: 'line_type_intelligence' });

      if (!lookup.valid) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '无效的电话号码，请检查后重试' }) };
      }

      const lineType = lookup.lineTypeIntelligence ? lookup.lineTypeIntelligence.type : 'unknown';
      console.log(`📱 号码类型: ${lineType}`);

      if (lineType === 'landline' || lineType === 'fixedLine') {
        return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '该号码是固定电话，无法接收短信，请使用手机号' }) };
      }

      if (lineType === 'voip') {
        console.warn('⚠️ 拦截到虚拟号 (VOIP) 请求');
      }
    } catch (lookupErr) {
      console.error('⚠️ Lookup 检测失败 (可能是权限或余额问题):', lookupErr.message);
    }

    const code = generateVerificationCode();
    if (supabase) {
      const identifier = 'PHONE_' + rawPhone;
      await supabase.from('verification_codes').delete().eq('email', identifier).lt('expires_at', new Date().toISOString());
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

    const message = await client.messages.create({
      body: messageBody,
      to: toPhone,
      ...(messagingServiceSid ? { messagingServiceSid: messagingServiceSid.trim() } : { from: twilioPhone.trim() })
    });

    console.log(`✅ Lookup 通过并发送成功, SID: ${message.sid}`);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (error) {
    console.error('❌ SMS Function Error:', error);
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '发送失败: ' + error.message }) };
  }
};
