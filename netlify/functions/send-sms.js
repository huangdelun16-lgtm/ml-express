// Netlify Function: 发送短信验证码
// 路径: /.netlify/functions/send-sms

const twilio = require('twilio');

// 验证码存储（简单实现，生产环境应使用数据库或 Redis）
// 注意：Netlify Functions 是无状态的，每次调用都会重置
// 建议使用 Supabase 或其他数据库存储验证码
const verificationCodes = new Map();

// 生成6位随机验证码
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.handler = async (event, context) => {
  // 设置 CORS 头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // 处理 OPTIONS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

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
    const { phoneNumber, language = 'zh' } = JSON.parse(event.body || '{}');

    // 验证手机号格式
    const phoneRegex = /^09\d{7,9}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: language === 'zh' ? '无效的手机号格式' : 
                 language === 'en' ? 'Invalid phone number format' : 
                 'ဖုန်းနံပါတ် မမှန်ကန်ပါ'
        })
      };
    }

    // 检查 Twilio 配置
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      console.log('⚠️ Twilio 未配置，使用开发模式');
      
      // 开发模式：返回固定验证码
      const devCode = '123456';
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '验证码已发送（开发模式）',
          code: devCode, // 仅开发模式返回
          isDevelopmentMode: true
        })
      };
    }

    // 初始化 Twilio 客户端
    const client = twilio(accountSid, authToken);

    // 生成验证码
    const code = generateVerificationCode();

    // 构建短信内容（多语言）
    let messageText = '';
    if (language === 'zh') {
      messageText = `【缅甸同城快递】您的验证码是：${code}，5分钟内有效。请勿泄露给他人。`;
    } else if (language === 'en') {
      messageText = `[Myanmar Express] Your verification code is: ${code}. Valid for 5 minutes. Do not share with others.`;
    } else {
      messageText = `[Myanmar Express] သင့်အတည်ပြုကုဒ်မှာ: ${code} ဖြစ်ပါသည်။ ၅ မိနစ်အတွင်း အသုံးပြုပါ။`;
    }

    // 发送短信（缅甸手机号需要加国际区号 +95）
    // 09xxxxxxxx -> +959xxxxxxxx
    const internationalPhone = '+95' + phoneNumber.substring(1);
    
    console.log(`📱 正在发送验证码到: ${internationalPhone} (原始号码: ${phoneNumber})`);
    
    const message = await client.messages.create({
      body: messageText,
      from: twilioPhone,
      to: internationalPhone
    });

    console.log(`✅ 短信发送成功，SID: ${message.sid}`);

    // 存储验证码到 Supabase（推荐）
    // TODO: 实现 Supabase 存储逻辑
    // await supabase.from('verification_codes').insert({
    //   phone_number: phoneNumber,
    //   code: code,
    //   expires_at: new Date(Date.now() + 5 * 60 * 1000)
    // });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: language === 'zh' ? '验证码已发送，请查收短信' : 
                 language === 'en' ? 'Verification code sent, please check your SMS' : 
                 'အတည်ပြုကုဒ်ပို့ပြီးပါပြီ၊ SMS စစ်ဆေးပါ',
        messageSid: message.sid,
        // 生产环境不应返回验证码，这里仅用于测试
        // code: code
      })
    };

  } catch (error) {
    console.error('❌ 发送短信失败:', error);

    // 错误处理
    let errorMessage = '';
    let statusCode = 500;

    if (error.code === 21211) {
      errorMessage = language === 'zh' ? '无效的手机号' : 
                     language === 'en' ? 'Invalid phone number' : 
                     'ဖုန်းနံပါတ် မမှန်ကန်ပါ';
      statusCode = 400;
    } else if (error.code === 21608) {
      errorMessage = language === 'zh' ? '该号码无法接收短信' : 
                     language === 'en' ? 'This number cannot receive SMS' : 
                     'ဤနံပါတ်သည် SMS လက်ရှိမရနိုင်ပါ';
      statusCode = 400;
    } else if (error.code === 20003) {
      errorMessage = language === 'zh' ? 'Twilio 认证失败，请检查配置' : 
                     language === 'en' ? 'Twilio authentication failed' : 
                     'Twilio အထောက်အထား မအောင်မြင်ပါ';
      statusCode = 500;
    } else {
      errorMessage = language === 'zh' ? '发送失败，请稍后重试' : 
                     language === 'en' ? 'Failed to send, please try again later' : 
                     'ပို့ဆောင်မှု မအောင်မြင်ပါ';
    }

    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode: error.code,
        errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

