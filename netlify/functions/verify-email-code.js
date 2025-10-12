// Netlify Function: 验证邮箱验证码
// 路径: /.netlify/functions/verify-email-code

const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

exports.handler = async (event, context) => {
  // 设置 CORS 头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // 处理 OPTIONS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
    // 解析请求体
    const { email, code, language = 'zh' } = JSON.parse(event.body || '{}');

    console.log(`🔍 验证请求: 邮箱=${email}, 验证码=${code}`);

    // 验证参数
    if (!email || !code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: language === 'zh' ? '缺少必要参数' : 
                 language === 'en' ? 'Missing required parameters' : 
                 'လိုအပ်သော အချက်အလက်များ ပျောက်ဆုံးနေပါသည်'
        })
      };
    }

    // 开发模式：固定验证码 123456
    if (code === '123456') {
      console.log('✅ 开发模式验证成功');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: language === 'zh' ? '验证成功（开发模式）' : 
                   language === 'en' ? 'Verification successful (Dev Mode)' : 
                   'အတည်ပြုခြင်း အောင်မြင်ပါသည် (Dev Mode)'
        })
      };
    }

    // 从 Supabase 查询验证码
    if (supabase) {
      const { data, error } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .eq('used', false)
        .single();

      if (error || !data) {
        console.log(`❌ 验证码不存在或已使用: ${email} -> ${code}`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: language === 'zh' ? '验证码错误或已过期' : 
                     language === 'en' ? 'Verification code is incorrect or expired' : 
                     'အတည်ပြုကုဒ် မှားယွင်းနေသည် သို့မဟုတ် သက်တမ်းကုန်ပါပြီ'
          })
        };
      }

      // 检查是否过期
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      
      if (now > expiresAt) {
        console.log(`❌ 验证码已过期: ${email} -> ${code}`);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: language === 'zh' ? '验证码已过期，请重新获取' : 
                     language === 'en' ? 'Verification code expired, please request a new one' : 
                     'အတည်ပြုကုဒ် သက်တမ်းကုန်ပါပြီ'
          })
        };
      }

      // 标记验证码为已使用
      await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('email', email)
        .eq('code', code);

      console.log(`✅ 验证码验证成功: ${email} -> ${code}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: language === 'zh' ? '验证成功' : 
                   language === 'en' ? 'Verification successful' : 
                   'အတည်ပြုခြင်း အောင်မြင်ပါသည်'
        })
      };
    } else {
      // Supabase 未配置，只能使用开发模式
      console.warn('⚠️ Supabase 未配置，只接受固定验证码 123456');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: language === 'zh' ? '验证码错误（仅支持开发模式 123456）' : 
                   language === 'en' ? 'Incorrect code (Only dev code 123456 is supported)' : 
                   'အတည်ပြုကုဒ် မှားယွင်းနေသည်'
        })
      };
    }

  } catch (error) {
    console.error('❌ 验证失败:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '服务器错误，请稍后重试'
      })
    };
  }
};

