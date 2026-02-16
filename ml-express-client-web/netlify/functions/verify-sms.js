// Netlify Function: 验证短信验证码
// 路径: /.netlify/functions/verify-sms

// 注意：这是简化版本，生产环境应使用 Supabase 或其他数据库存储验证码
// Netlify Functions 是无状态的，无法在多次调用之间共享内存

// 引入 CORS 工具函数
const { getCorsHeaders, handleCorsPreflight } = require('./utils/cors');

exports.handler = async (event, context) => {
  // 处理 CORS 预检请求
  const preflightResponse = handleCorsPreflight(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  });
  if (preflightResponse) {
    return preflightResponse;
  }

  // 获取 CORS 响应头
  const headers = getCorsHeaders(event, {
    allowedMethods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  });

  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method Not Allowed' 
      })
    };
  }

  try {
    // 解析请求体
    const { phoneNumber, code, language = 'zh' } = JSON.parse(event.body || '{}');

    console.log(`🔍 验证请求: 手机号=${phoneNumber}, 验证码=${code}`);

    // 验证参数
    if (!phoneNumber || !code) {
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

    // TODO: 从 Supabase 查询验证码
    // const { data, error } = await supabase
    //   .from('verification_codes')
    //   .select('*')
    //   .eq('phone_number', phoneNumber)
    //   .eq('code', code)
    //   .gt('expires_at', new Date().toISOString())
    //   .single();
    // 
    // if (error || !data) {
    //   return {
    //     statusCode: 400,
    //     headers,
    //     body: JSON.stringify({
    //       success: false,
    //       error: '验证码错误或已过期'
    //     })
    //   };
    // }

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

