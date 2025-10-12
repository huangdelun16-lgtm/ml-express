// Netlify Function: 使用 Infobip 发送短信验证码
// 最便宜！比 Twilio 便宜 49%

const axios = require('axios');

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

    // 检查 Infobip 配置
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL || 'https://api.infobip.com';
    const senderId = process.env.INFOBIP_SENDER_ID || 'MyanmarExp';

    if (!apiKey) {
      console.log('⚠️ Infobip 未配置，使用开发模式');
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

    // 生成验证码
    const code = generateVerificationCode();

    // 构建短信内容
    let messageText = '';
    if (language === 'zh') {
      messageText = `【缅甸同城快递】验证码：${code}，5分钟内有效。`;
    } else if (language === 'en') {
      messageText = `[Myanmar Express] Code: ${code}. Valid 5min.`;
    } else {
      messageText = `[Myanmar Express] ကုဒ်: ${code}။ ၅ မိနစ်။`;
    }

    // 缅甸手机号格式转换
    const internationalPhone = phoneNumber.replace(/^0/, '95');

    console.log(`📱 正在通过 Infobip 发送验证码到: ${internationalPhone}`);

    // Infobip SMS API 请求
    const response = await axios.post(
      `${baseUrl}/sms/2/text/advanced`,
      {
        messages: [
          {
            from: senderId,
            destinations: [
              { to: internationalPhone }
            ],
            text: messageText
          }
        ]
      },
      {
        headers: {
          'Authorization': `App ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log(`✅ Infobip 短信发送成功:`, response.data);

    if (response.data.messages && response.data.messages[0].status.groupName === 'PENDING') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: language === 'zh' ? '验证码已发送，请查收短信' : 
                   language === 'en' ? 'Verification code sent' : 
                   'အတည်ပြုကုဒ်ပို့ပြီးပါပြီ',
          messageId: response.data.messages[0].messageId
        })
      };
    } else {
      throw new Error('Infobip 发送状态异常');
    }

  } catch (error) {
    console.error('❌ Infobip 发送短信失败:', error.response?.data || error.message);

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

