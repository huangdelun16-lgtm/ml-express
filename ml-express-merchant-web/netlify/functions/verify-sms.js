// Netlify Function: 验证短信验证码
// 路径: /.netlify/functions/verify-sms

const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// 引入 CORS 工具函数
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

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

    // 格式化手机号 (去掉非数字)
    rawPhone = rawPhone.replace(/\D/g, '');
    const identifier = 'PHONE_' + rawPhone;

    console.log(`🔍 验证请求: identifier=${identifier}, code=${code}`);

    // 测试模式
    if (code === '123456') {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '验证成功' }) };
    }

    if (!supabase) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '数据库未连接' }) };
    }

    // 查询验证码
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

    // 检查过期
    if (new Date() > new Date(data.expires_at)) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '验证码已过期' }) };
    }

    // 标记已使用
    await supabase.from('verification_codes').update({ used: true }).eq('id', data.id);

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: '验证成功' }) };

  } catch (error) {
    console.error('❌ Verify SMS Error:', error);
    return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: '系统异常，请重试' }) };
  }
};
