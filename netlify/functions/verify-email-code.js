// Netlify Function: 验证邮箱验证码
// 路径: /.netlify/functions/verify-email-code

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
    }

    // TODO: 从数据库查询验证码
    // 生产环境建议使用 Supabase 或 Redis 存储验证码

    // 验证码错误
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: language === 'zh' ? '验证码错误或已过期' : 
               language === 'en' ? 'Verification code is incorrect or expired' : 
               'အတည်ပြုကုဒ် မှားယွင်းနေသည် သို့မဟုတ် သက်တမ်းကုန်ပါပြီ'
      })
    };

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

