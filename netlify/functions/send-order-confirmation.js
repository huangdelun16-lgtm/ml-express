// Netlify Function: 订单确认邮件发送
// 路径: /.netlify/functions/send-order-confirmation

const nodemailer = require('nodemailer');

const DEFAULT_LANGUAGE = 'zh';

const templates = {
  zh: {
    subject: '【缅甸同城快递】订单确认 - {orderId}',
    success: '订单确认邮件已发送，请查收邮箱。',
    devModeMessage: '开发模式：系统未实际发送邮件，请手动保存二维码。',
    error: '发送订单确认邮件失败，请稍后重试。',
    headerTitle: '订单确认',
    greeting: (name) => `您好${name ? `，${name}` : ''}！`,
    lead: '感谢您选择缅甸同城快递，下方是您的订单详情：',
    orderLabel: '订单号',
    priceLabel: '费用',
    distanceLabel: '配送距离',
    senderLabel: '寄件人',
    receiverLabel: '收件人',
    deliverySpeedLabel: '配送速度',
    action: '请妥善保管以下二维码，快递员将以此核验取件：',
    qrAlt: '订单二维码',
    footer: '缅甸同城快递团队敬上',
    secondaryNote: '如未收到邮件，请联系客户服务或在网页上下载二维码备份。',
  },
  en: {
    subject: '[Myanmar Express] Order Confirmation - {orderId}',
    success: 'Order confirmation email sent. Please check your inbox.',
    devModeMessage: 'Development mode: email not actually sent. Please save the QR code manually.',
    error: 'Failed to send order confirmation email. Please try again later.',
    headerTitle: 'Order Confirmation',
    greeting: (name) => `Hello${name ? `, ${name}` : ''}!`,
    lead: 'Thank you for choosing Myanmar Express. Here are your order details:',
    orderLabel: 'Order ID',
    priceLabel: 'Total Fee',
    distanceLabel: 'Delivery Distance',
    senderLabel: 'Sender',
    receiverLabel: 'Receiver',
    deliverySpeedLabel: 'Delivery Speed',
    action: 'Please keep the QR code below. Our courier will use it to verify the pickup:',
    qrAlt: 'Order QR code',
    footer: 'Myanmar Express Team',
    secondaryNote: 'If you do not receive the email, please contact support or download the QR code on the website.',
  },
  my: {
    subject: '[Myanmar Express] အော်ဒါအတည်ပြုခြင်း - {orderId}',
    success: 'အော်ဒါအတည်ပြုအီးမေးလ်ပို့ပြီးပါပြီ။ အီးမေးလ်ကို စစ်ဆေးပါ။',
    devModeMessage: 'ဖွံ့ဖြိုးတိုးတက်မှု မုဒ် - အီးမေးလ်ကို မပို့ရသေးပါ။ QR ကုဒ် ကိုယ်တိုင် သိမ်းဆည်းပါ။',
    error: 'အော်ဒါအတည်ပြုအီးမေးလ်ပို့ရာတွင် မအောင်မြင်ပါ။ နောက်တကြိမ် ထပ်စမ်းပါ။',
    headerTitle: 'အော်ဒါအတည်ပြုခြင်း',
    greeting: (name) => `မျှော်လင့်ချက်ကောင်းပါစေ${name ? `၊ ${name}` : ''}!`,
    lead: 'Myanmar Express ကို အသုံးပြုခဲ့သဖြင့် ကျေးဇူးတင်ပါသည်။ အောက်တွင် သင့်အော်ဒါအသေးစိတ်ကို စစ်ဆေးနိုင်ပါသည်။',
    orderLabel: 'အော်ဒါနံပါတ်',
    priceLabel: 'စုစုပေါင်းကြေး',
    distanceLabel: 'ပို့ဆောင်ရေးအကွာအဝေး',
    senderLabel: 'ပို့သူ',
    receiverLabel: 'လက်ခံသူ',
    deliverySpeedLabel: 'ပို့ဆောင်မှုနှုန်း',
    action: 'အောက်ဖော်ပြပါ QR ကုဒ်ကို ထိန်းသိမ်းထားပါ။ ကူရီယာမှ ယူဆောင်ရာတွင် အသုံးပြုမည်ဖြစ်သည်။',
    qrAlt: 'အော်ဒါ QR ကုဒ်',
    footer: 'Myanmar Express အလုပ်သမားအဖွဲ့',
    secondaryNote: 'အီးမေးလ် လက်မခံရပါက ပံ့ပိုးမှုကို ဆက်သွယ်ရန် သို့မဟုတ် QR ကုဒ်ကို ဝဘ်ဆိုဒ်တွင် ရယူထားရန် မမေ့ပါနှင့်။',
  },
};

function normalizeLanguage(language) {
  if (!language) return DEFAULT_LANGUAGE;
  if (templates[language]) return language;
  return DEFAULT_LANGUAGE;
}

function buildHtml(template, data, inlineCid) {
  const {
    orderId,
    price,
    distance,
    senderName,
    receiverName,
    deliverySpeed,
    orderTime,
  } = data;

  const priceText = price ? `${price} MMK` : '—';
  const distanceText = distance ? `${distance} km` : '—';
  const deliverySpeedText = deliverySpeed || '—';

  const rows = [
    { label: template.orderLabel, value: orderId || '—' },
    { label: template.priceLabel, value: priceText },
    { label: template.distanceLabel, value: distanceText },
    { label: template.senderLabel, value: senderName || '—' },
    { label: template.receiverLabel, value: receiverName || '—' },
    { label: template.deliverySpeedLabel, value: deliverySpeedText },
  ];

  const formattedTime = orderTime
    ? new Date(orderTime).toLocaleString('en-GB', { hour12: false })
    : new Date().toLocaleString('en-GB', { hour12: false });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; color: #1a202c; }
    .container { max-width: 640px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 48px rgba(15, 23, 42, 0.12); }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); padding: 40px 30px; text-align: center; color: #f8fafc; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px; }
    .header .icon { font-size: 64px; margin-bottom: 16px; }
    .content { padding: 40px 30px 30px; }
    .greeting { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #2b6cb0; }
    .lead { font-size: 16px; line-height: 1.7; margin-bottom: 24px; color: #4a5568; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
    .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #2d3748; }
    .info-value { color: #1a202c; text-align: right; }
    .order-time { font-size: 13px; color: #718096; margin-top: 12px; text-align: right; }
    .action { background: #ebf8ff; border-left: 4px solid #3182ce; padding: 16px 20px; border-radius: 10px; color: #2a4365; line-height: 1.6; margin-bottom: 24px; font-size: 15px; }
    .qr-wrapper { text-align: center; margin-bottom: 30px; }
    .qr-image { width: 220px; height: 220px; border-radius: 12px; box-shadow: 0 10px 30px rgba(44, 82, 130, 0.25); border: 4px solid #ebf8ff; object-fit: contain; }
    .qr-caption { margin-top: 12px; font-size: 14px; color: #4a5568; }
    .footer { background: #edf2f7; padding: 24px 30px; text-align: center; color: #4a5568; font-size: 14px; }
    .footer strong { display: block; margin-bottom: 4px; color: #2d3748; }
    @media (max-width: 600px) {
      .container { margin: 20px; }
      .content { padding: 24px 20px 20px; }
      .info-row { flex-direction: column; align-items: flex-start; }
      .info-value { margin-top: 6px; }
      .qr-image { width: 200px; height: 200px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🚚</div>
      <h1>${template.headerTitle}</h1>
    </div>
    <div class="content">
      <div class="greeting">${template.greeting(data.customerName)}</div>
      <div class="lead">${template.lead}</div>
      <div class="info-card">
        ${rows
          .map(
            (row) => `
          <div class="info-row">
            <span class="info-label">${row.label}</span>
            <span class="info-value">${row.value || '—'}</span>
          </div>
        `
          )
          .join('')}
        <div class="order-time">📅 ${formattedTime}</div>
      </div>
      <div class="action">${template.action}</div>
      ${inlineCid ? `
        <div class="qr-wrapper">
          <img src="cid:${inlineCid}" alt="${template.qrAlt}" class="qr-image" />
          <div class="qr-caption">${template.qrAlt}</div>
        </div>
      ` : ''}
      <div class="action" style="background: #fff4e6; border-left-color: #dd6b20; color: #c05621;">
        ⚠️ ${template.secondaryNote}
      </div>
    </div>
    <div class="footer">
      <strong>${template.footer}</strong>
      © ${new Date().getFullYear()} Myanmar Express
    </div>
  </div>
</body>
</html>
`;
}

exports.handler = async (event) => {
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
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      email,
      language,
      orderId,
      qrCodeDataUrl,
      customerName,
      price,
      distance,
      senderName,
      receiverName,
      deliverySpeed,
      orderTime,
    } = body;

    if (!email || !orderId || !qrCodeDataUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required fields: email, orderId and qrCodeDataUrl are required.',
        }),
      };
    }

    const normalizedLanguage = normalizeLanguage(language);
    const template = templates[normalizedLanguage] || templates[DEFAULT_LANGUAGE];

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    const attachments = [];
    let inlineCid = null;

    if (qrCodeDataUrl && typeof qrCodeDataUrl === 'string' && qrCodeDataUrl.startsWith('data:image')) {
      const base64Data = qrCodeDataUrl.split(',')[1];
      if (base64Data) {
        inlineCid = `order-qrcode-${Date.now()}`;
        attachments.push({
          filename: `${orderId}-qrcode.png`,
          content: base64Data,
          encoding: 'base64',
          cid: inlineCid,
        });
      }
    }

    const htmlContent = buildHtml(template, {
      orderId,
      price,
      distance,
      senderName,
      receiverName,
      deliverySpeed,
      customerName,
      orderTime,
    }, inlineCid);

    const mailOptions = {
      from: `"Myanmar Express" <${gmailUser || 'no-reply@market-link-express.com'}>`,
      to: email,
      subject: template.subject.replace('{orderId}', orderId),
      html: htmlContent,
      attachments,
    };

    if (!gmailUser || !gmailPass) {
      console.log('⚠️ Gmail 凭证未配置，返回开发模式成功响应');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: template.devModeMessage,
          isDevelopmentMode: true,
        }),
      };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    try {
      await transporter.verify();
      console.log('✅ Gmail 连接验证成功');
    } catch (verifyError) {
      console.error('❌ Gmail 连接验证失败:', verifyError.message);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: template.devModeMessage,
          isDevelopmentMode: true,
          error: 'Gmail connection failed',
        }),
      };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ 订单确认邮件已发送: ${info.messageId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: template.success,
        messageId: info.messageId,
      }),
    };
  } catch (error) {
    console.error('❌ 发送订单确认邮件失败:', error);
    let language = DEFAULT_LANGUAGE;
    try {
      const parsed = JSON.parse(event.body || '{}');
      language = normalizeLanguage(parsed.language);
    } catch (parseError) {
      // ignore
    }
    const template = templates[language] || templates[DEFAULT_LANGUAGE];

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: template.error,
        errorDetails: process.env.NODE_ENV === 'development' ? String(error.message || error) : undefined,
      }),
    };
  }
};


