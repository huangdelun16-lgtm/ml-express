/**
 * 入驻审核通过后，把店铺代码 / 密码发给商家（短信 + 可选邮件）。
 * 发送失败不影响审核结果；由调用方把结果展示给运营。
 */

const twilio = require('twilio');
const nodemailer = require('nodemailer');

const MERCHANT_WEB_URL = 'https://mlexpress-merchants.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

function toE164Myanmar(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const local = digits.replace(/^0+/, '');
  if (!local) return null;
  if (local.startsWith('95')) return `+${local}`;
  return `+95${local}`;
}

function uniqueRecipientPhones(application) {
  const seen = new Set();
  const out = [];
  for (const raw of [application?.phone, application?.manager_phone]) {
    const e164 = toE164Myanmar(raw);
    if (!e164 || seen.has(e164)) continue;
    seen.add(e164);
    out.push(e164);
  }
  return out;
}

function buildCredentialsSms({ storeName, storeCode, password }) {
  return [
    '【ML Express】入驻已通过',
    `店铺：${storeName}`,
    `代码：${storeCode}`,
    `密码：${password}`,
    `登录 ${MERCHANT_WEB_URL}`,
    '请尽快登录并修改密码',
  ].join('\n');
}

function buildCredentialsEmail({ storeName, storeCode, password }) {
  const name = escapeHtml(storeName);
  const code = escapeHtml(storeCode);
  const pwd = escapeHtml(password);
  const loginUrl = escapeHtml(MERCHANT_WEB_URL);
  return {
    subject: `【ML Express】${storeName} 入驻已通过 — 登录账号`,
    text: buildCredentialsSms({ storeName, storeCode, password }),
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="padding:28px 24px;background:linear-gradient(135deg,#166534,#15803d);color:#fff;">
      <div style="font-size:13px;opacity:.85;">MARKET LINK EXPRESS</div>
      <h1 style="margin:8px 0 0;font-size:22px;">商家入驻已通过</h1>
    </div>
    <div style="padding:28px 24px;color:#0f172a;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        「${name}」已开通合伙店铺账号。请用下面的店铺代码和密码登录商家后台，并尽快修改密码。
      </p>
      <div style="display:block;padding:16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;margin-bottom:12px;">
        <div style="font-size:12px;color:#15803d;">店铺代码</div>
        <div style="font-size:22px;font-weight:700;letter-spacing:.04em;margin-top:4px;">${code}</div>
      </div>
      <div style="display:block;padding:16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
        <div style="font-size:12px;color:#15803d;">登录密码</div>
        <div style="font-size:22px;font-weight:700;letter-spacing:.08em;margin-top:4px;">${pwd}</div>
      </div>
      <p style="margin:20px 0 0;font-size:14px;">
        登录地址：<a href="${loginUrl}" style="color:#166534;">${loginUrl}</a>
      </p>
      <p style="margin:12px 0 0;font-size:13px;color:#64748b;">请勿将密码转发给无关人员。</p>
    </div>
  </div>
</body>
</html>`,
  };
}

function emptyNotifyResult() {
  return {
    smsSent: false,
    smsTo: [],
    emailSent: false,
    emailTo: null,
    errors: [],
  };
}

function summarizeNotifyAttempts(attempts) {
  const result = emptyNotifyResult();
  for (const item of attempts) {
    if (item.channel === 'sms' && item.sent && item.to) {
      result.smsSent = true;
      result.smsTo.push(item.to);
    }
    if (item.channel === 'email' && item.sent && item.to) {
      result.emailSent = true;
      result.emailTo = item.to;
    }
    if (!item.sent && !item.skipped && item.error) {
      result.errors.push(item.error);
    }
  }
  return result;
}

function twilioReady() {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const from = String(process.env.TWILIO_PHONE_NUMBER || '').trim();
  const messagingServiceSid = String(process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
  if (!accountSid || !authToken || (!from && !messagingServiceSid)) return null;
  return { accountSid, authToken, from, messagingServiceSid };
}

function gmailReady() {
  const user = String(process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').trim();
  if (!user || !pass) return null;
  return { user, pass };
}

async function sendOneSms(to, body) {
  const cfg = twilioReady();
  if (!cfg) {
    return { channel: 'sms', to, sent: false, skipped: true, error: 'twilio_not_configured' };
  }
  const client = twilio(cfg.accountSid, cfg.authToken);
  await client.messages.create({
    body,
    to,
    ...(cfg.messagingServiceSid ? { messagingServiceSid: cfg.messagingServiceSid } : { from: cfg.from }),
  });
  return { channel: 'sms', to, sent: true };
}

async function sendOneEmail(to, credentials) {
  const cfg = gmailReady();
  if (!cfg) {
    return { channel: 'email', to, sent: false, skipped: true, error: 'gmail_not_configured' };
  }
  const mail = buildCredentialsEmail(credentials);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: cfg.user, pass: cfg.pass },
  });
  await transporter.sendMail({
    from: `"MARKET LINK EXPRESS" <${cfg.user}>`,
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
  return { channel: 'email', to, sent: true };
}

async function notifyMerchantCredentials(application, credentials) {
  const attempts = [];
  const storeName = String(credentials?.storeName || application?.store_name || '').trim();
  const storeCode = String(credentials?.storeCode || '').trim();
  const password = String(credentials?.password || '').trim();

  if (!storeCode || !password) {
    return summarizeNotifyAttempts([
      { channel: 'sms', sent: false, error: '缺少店铺代码或密码' },
    ]);
  }

  const payload = { storeName, storeCode, password };
  const smsBody = buildCredentialsSms(payload);

  for (const to of uniqueRecipientPhones(application)) {
    try {
      attempts.push(await sendOneSms(to, smsBody));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('merchant credentials SMS failed:', to, message);
      attempts.push({ channel: 'sms', to, sent: false, error: `短信发送失败: ${message}` });
    }
  }

  const email = String(application?.email || '').trim();
  if (email && EMAIL_RE.test(email)) {
    try {
      attempts.push(await sendOneEmail(email, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('merchant credentials email failed:', email, message);
      attempts.push({ channel: 'email', to: email, sent: false, error: `邮件发送失败: ${message}` });
    }
  }

  if (attempts.length === 0) {
    attempts.push({ channel: 'sms', sent: false, skipped: true, error: 'no_recipient' });
  }

  return summarizeNotifyAttempts(attempts);
}

module.exports = {
  MERCHANT_WEB_URL,
  toE164Myanmar,
  uniqueRecipientPhones,
  buildCredentialsSms,
  buildCredentialsEmail,
  summarizeNotifyAttempts,
  notifyMerchantCredentials,
};
