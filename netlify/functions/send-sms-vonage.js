// Netlify Function: 使用 Vonage (Nexmo) 发送短信验证码
// 比 Twilio 便宜 39%！

const { Vonage } = require('@vonage/server-sdk');

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
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

    // 检查 Vonage 配置
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    const brandName = process.env.VONAGE_BRAND_NAME || 'MyanmarExpress';

    if (!apiKey || !apiSecret) {
      console.log('⚠️ Vonage 未配置，使用开发模式');
      const devCode = '123456';
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '验证码已发送（开发模式）',
          code: devCode,
          isDevelopmentMode: true
        })
      };
    }

    // 初始化 Vonage 客户端
    const vonage = new Vonage({
      apiKey: apiKey,
      apiSecret: apiSecret
    });

    // 生成验证码
    const code = generateVerificationCode();

    // 构建短信内容
    let messageText = '';
    if (language === 'zh') {
      messageText = `【缅甸同城快递】验证码：${code}，5分钟内有效。`;
    } else if (language === 'en') {
      messageText = `[Myanmar Express] Code: ${code}. Valid for 5 min.`;
    } else {
      messageText = `[Myanmar Express] ကုဒ်: ${code}။ ၅ မိနစ်။`;
    }

    // 发送短信
    const from = brandName; // 发件人名称
    const to = phoneNumber.replace(/^0/, '95'); // 缅甸国际区号：95

    console.log(`📱 正在通过 Vonage 发送验证码到: ${to}`);

    // Vonage SMS API
    const response = await vonage.sms.send({
      to: to,
      from: from,
      text: messageText
    });

    console.log(`✅ Vonage 短信发送成功:`, response);

    if (response.messages[0].status === '0') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: language === 'zh' ? '验证码已发送，请查收短信' : 
                   language === 'en' ? 'Verification code sent' : 
                   'အတည်ပြုကုဒ်ပို့ပြီးပါပြီ',
          messageId: response.messages[0]['message-id'],
          cost: response.messages[0]['remaining-balance']
        })
      };
    } else {
      throw new Error(`Vonage 发送失败: ${response.messages[0]['error-text']}`);
    }

  } catch (error) {
    console.error('❌ Vonage 发送短信失败:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: language === 'zh' ? '发送失败，请稍后重试' : 
               language === 'en' ? 'Failed to send' : 
               'ပို့ဆောင်မှု မအောင်မြင်ပါ',
        errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

