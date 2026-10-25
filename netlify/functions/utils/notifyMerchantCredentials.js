/**
 * 入驻审核通过后，把店铺代码 / 密码发给商家（短信 + 可选邮件）。
 * 发送失败不影响审核结果；由调用方把结果展示给运营。
 */

const twilio = require('twilio');
const nodemailer = require('nodemailer');
const { MERCHANT_WEB_URL, renderMerchantApprovalEmail } = require('./merchantApprovalEmail');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function buildCredentialsEmail(credentials, template) {
  return renderMerchantApprovalEmail(credentials, template);
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
    if (item.channel === 'email' && !item.sent && item.error) {
      result.errors.push(
        item.error === 'gmail_not_configured'
          ? '管理后台未配置 Gmail，邮件没有发出。请在 Netlify 设置 GMAIL_USER 和 GMAIL_APP_PASSWORD。'
          : item.error,
      );
    } else if (!item.sent && !item.skipped && item.error) {
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

async function sendOneEmail(to, credentials, template) {
  const cfg = gmailReady();
  if (!cfg) {
    return { channel: 'email', to, sent: false, skipped: true, error: 'gmail_not_configured' };
  }
  const mail = buildCredentialsEmail(credentials, template);
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

async function notifyMerchantCredentials(application, credentials, emailTemplate) {
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
      attempts.push(await sendOneEmail(email, payload, emailTemplate));
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
