// Netlify Function: 通过 Gmail 发送邮箱验证码
// 路径: /.netlify/functions/send-email-code

const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// 生成6位随机验证码
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 创建邮件 HTML 模板
function createEmailTemplate(code, language = 'zh') {
  const templates = {
    zh: {
      subject: '【缅甸同城快递】邮箱验证码',
      greeting: '您好！',
      message: '感谢您注册缅甸同城快递服务。您的验证码是：',
      code: code,
      validity: '此验证码5分钟内有效，请勿泄露给他人。',
      ignore: '如果这不是您的操作，请忽略此邮件。',
      footer: '缅甸同城快递团队',
      footerEn: 'Myanmar Express Team'
    },
    en: {
      subject: '[Myanmar Express] Email Verification Code',
      greeting: 'Hello!',
      message: 'Thank you for registering with Myanmar Express. Your verification code is:',
      code: code,
      validity: 'This code is valid for 5 minutes. Do not share it with others.',
      ignore: 'If this was not you, please ignore this email.',
      footer: 'Myanmar Express Team',
      footerEn: 'Myanmar Express Team'
    },
    my: {
      subject: '[Myanmar Express] အီးမေးလ်အတည်ပြုကုဒ်',
      greeting: 'မင်္ဂလာပါ!',
      message: 'Myanmar Express တွင် မှတ်ပုံတင်ခြင်းအတွက် ကျေးဇူးတင်ပါသည်။ သင့်အတည်ပြုကုဒ်မှာ:',
      code: code,
      validity: 'ဤကုဒ်သည် ၅ မိနစ်အတွင်း အသုံးပြုနိုင်ပါသည်။ အခြားသူများကို မမျှဝေပါနှင့်။',
      ignore: 'ဤသည်မှာ သင်မဟုတ်ပါက၊ ဤအီးမေးလ်ကို လျစ်လျူရှုပါ။',
      footer: 'Myanmar Express အဖွဲ့',
      footerEn: 'Myanmar Express Team'
    }
  };

  const t = templates[language] || templates['zh'];

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Arial, sans-serif;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header .icon {
            font-size: 60px;
            margin-bottom: 15px;
        }
        .content {
            padding: 40px 30px;
            color: #333;
        }
        .greeting {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #667eea;
        }
        .message {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #666;
        }
        .code-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 48px;
            font-weight: bold;
            color: white;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
        }
        .validity {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            color: #856404;
            font-size: 14px;
        }
        .ignore {
            color: #999;
            font-size: 14px;
            margin-top: 30px;
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
        }
        .footer-text {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .footer-logo {
            font-size: 24px;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="icon">🚚</div>
            <h1>Myanmar Express</h1>
        </div>
        
        <div class="content">
            <div class="greeting">${t.greeting}</div>
            
            <div class="message">
                ${t.message}
            </div>
            
            <div class="code-box">
                <div class="code">${t.code}</div>
            </div>
            
            <div class="validity">
                ⏰ ${t.validity}
            </div>
            
            <div class="ignore">
                ${t.ignore}
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-logo">Myanmar Express</div>
            <div class="footer-text">${t.footer} / ${t.footerEn}</div>
        </div>
    </div>
</body>
</html>
  `;
}

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
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
    // 解析请求体
    const { email, language = 'zh' } = JSON.parse(event.body || '{}');

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: language === 'zh' ? '无效的邮箱格式' : 
                 language === 'en' ? 'Invalid email format' : 
                 'အီးမေးလ်ပုံစံ မမှန်ကန်ပါ'
        })
      };
    }

    // 检查 Gmail SMTP 配置
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.log('⚠️ Gmail 未配置，使用开发模式');
      
      // 开发模式：返回固定验证码
      const devCode = '123456';
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: language === 'zh' ? '验证码已发送（开发模式）' :
                   language === 'en' ? 'Code sent (Dev Mode)' :
                   'ကုဒ်ပို့ပြီးပါပြီ (Dev Mode)',
          code: devCode, // 仅开发模式返回
          isDevelopmentMode: true
        })
      };
    }

    // 生成验证码
    const code = generateVerificationCode();

    // 存储验证码到 Supabase（5分钟有效期）
    if (supabase) {
      try {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        
        console.log(`📝 准备存储验证码: ${email} -> ${code}, 过期时间: ${expiresAt}`);
        
        // 删除该邮箱的旧验证码
        const { error: deleteError } = await supabase
          .from('verification_codes')
          .delete()
          .eq('email', email);
        
        if (deleteError) {
          console.error('❌ 删除旧验证码失败:', deleteError);
        } else {
          console.log(`✅ 已删除 ${email} 的旧验证码`);
        }
        
        // 插入新验证码
        const { error: insertError } = await supabase
          .from('verification_codes')
          .insert({
            email: email,
            code: code,
            expires_at: expiresAt,
            used: false
          });
        
        if (insertError) {
          console.error('❌ 存储验证码失败:', insertError);
          console.error('❌ 错误详情:', JSON.stringify(insertError, null, 2));
          // 继续发送邮件，即使存储失败
        } else {
          console.log(`✅ 验证码已存储: ${email} -> ${code}`);
        }
      } catch (error) {
        console.error('❌ Supabase操作异常:', error);
        console.error('❌ 异常详情:', JSON.stringify(error, null, 2));
      }
    } else {
      console.warn('⚠️ Supabase 未配置，验证码无法持久化存储');
    }

    // 创建 Nodemailer 传输器
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    // 准备邮件内容
    const mailOptions = {
      from: `"Myanmar Express" <${gmailUser}>`,
      to: email,
      subject: language === 'zh' ? '【缅甸同城快递】邮箱验证码' :
               language === 'en' ? '[Myanmar Express] Email Verification Code' :
               '[Myanmar Express] အီးမေးလ်အတည်ပြုကုဒ်',
      html: createEmailTemplate(code, language)
    };

    console.log(`📧 正在发送验证码到: ${email}`);

    // 验证Gmail连接
    try {
      await transporter.verify();
      console.log('✅ Gmail连接验证成功');
    } catch (verifyError) {
      console.error('❌ Gmail连接验证失败:', verifyError.message);
      
      // Gmail连接失败，回退到开发模式
      const devCode = '123456';
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: language === 'zh' ? '验证码已发送（开发模式 - Gmail配置问题）' :
                   language === 'en' ? 'Code sent (Dev Mode - Gmail config issue)' :
                   'ကုဒ်ပို့ပြီးပါပြီ (Dev Mode - Gmail ပြင်ဆင်မှုပြဿနာ)',
          code: devCode,
          isDevelopmentMode: true,
          error: 'Gmail connection failed, using dev mode'
        })
      };
    }

    // 发送邮件
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ 邮件发送成功，Message ID: ${info.messageId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: language === 'zh' ? '验证码已发送，请查收邮箱' : 
                 language === 'en' ? 'Verification code sent, please check your email' : 
                 'အတည်ပြုကုဒ်ပို့ပြီးပါပြီ၊ အီးမေးလ်စစ်ဆေးပါ',
        messageId: info.messageId
      })
    };

  } catch (error) {
    console.error('❌ 发送邮件失败:', error);
    
    // 获取语言参数，如果解析失败则默认为中文
    let language = 'zh';
    try {
      const body = JSON.parse(event.body || '{}');
      language = body.language || 'zh';
    } catch (e) {
      // 解析失败，使用默认语言
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: language === 'zh' ? '发送失败，请稍后重试' : 
               language === 'en' ? 'Failed to send, please try again later' : 
               'ပို့ဆောင်မှု မအောင်မြင်ပါ',
        errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};

