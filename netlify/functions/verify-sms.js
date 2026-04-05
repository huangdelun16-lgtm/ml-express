// Netlify Function: 验证短信验证码 (与 ml-express-client-web/netlify/functions 对齐)

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

/** 生产环境禁止万能测试码；预览/分支或本地可放行；显式 ALLOW_DEV_SMS_CODE=true 时生产也可放行（慎用） */
function allowStaticDevSmsCode() {
  if (process.env.ALLOW_DEV_SMS_CODE === 'true') return true;
  if (process.env.CONTEXT === 'production') return false;
  return true;
}

exports.handler = async (event, context) => {
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
    const { phoneNumber, phone, code, language = 'zh' } = JSON.parse(event.body || '{}');
    let rawPhone = phoneNumber || phone || '';

    if (!rawPhone || !code) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少手机号或验证码' }) };
    }

    rawPhone = rawPhone.replace(/\D/g, '');
    const identifier = 'PHONE_' + rawPhone;

    console.log(`🔍 验证请求: identifier=${identifier}, code=${code}`);

    if (code === '123456' && allowStaticDevSmsCode()) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '验证成功' }) };
    }

    if (!supabase) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '数据库未连接' }) };
    }

    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', identifier)
      .eq('code', code)
      .eq('used', false)
      .single();

    if (error || !data) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '验证码错误或已失效' }) };
    }

    if (new Date() > new Date(data.expires_at)) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '验证码已过期' }) };
    }

    await supabase.from('verification_codes').update({ used: true }).eq('id', data.id);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '验证成功' }) };

  } catch (error) {
    console.error('❌ Verify SMS Error:', error);
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '系统异常，请重试' }) };
  }
};
