// Netlify Function: 发送对账单到邮箱
// 路径: /.netlify/functions/send-statement

const nodemailer = require('nodemailer');
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
    const { email, storeName, startDate, endDate, fileData, fileName, format, language = 'zh' } = JSON.parse(event.body || '{}');

    if (!email || !fileData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing required parameters' })
      };
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Email service not configured' })
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    const subjects = {
      zh: `【缅甸同城快递】商家结算对账单 - ${storeName}`,
      en: `[Myanmar Express] Merchant Statement - ${storeName}`,
      my: `[Myanmar Express] ဆိုင်၏ အခြေအနေ အစီရင်ခံစာ - ${storeName}`
    };

    const messages = {
      zh: `<p>您好！附件是您的对账单。</p><p>商家：${storeName}</p><p>日期范围：${startDate} 至 ${endDate}</p>`,
      en: `<p>Hello! Attached is your business statement.</p><p>Merchant: ${storeName}</p><p>Date Range: ${startDate} to ${endDate}</p>`,
      my: `<p>မင်္ဂလာပါ! လူကြီးမင်း၏ ဆိုင်အစီရင်ခံစာကို ပူးတွဲတင်ပြထားပါသည်။</p><p>ဆိုင်အမည်: ${storeName}</p><p>ရက်စွဲ: ${startDate} မှ ${endDate}</p>`
    };

    const mailOptions = {
      from: `"Myanmar Express" <${gmailUser}>`,
      to: email,
      subject: subjects[language] || subjects.zh,
      html: messages[language] || messages.zh,
      attachments: [
        {
          filename: fileName,
          content: fileData.split('base64,')[1],
          encoding: 'base64'
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Email sent successfully' })
    };

  } catch (error) {
    console.error('❌ 发送对账单失败:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
