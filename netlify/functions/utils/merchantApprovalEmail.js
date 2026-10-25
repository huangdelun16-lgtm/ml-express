/**
 * 入驻通过邮件。正文由系统设置保存；未保存时用这里的默认文案。
 * 占位符在发送时替换，管理员改的是文字，不是每一封信的店铺代码和密码。
 */

const MERCHANT_WEB_URL = 'https://mlexpress-merchants.com';
const MERCHANT_APP_IOS_URL = 'https://apps.apple.com/mm/app/market-link-merchant/id6761371884';
const MERCHANT_APP_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.mlexpress.merchants';

const APPROVAL_EMAIL_SUBJECT_KEY = 'merchant.approval_email.subject';
const APPROVAL_EMAIL_BODY_KEY = 'merchant.approval_email.body';

const DEFAULT_APPROVAL_EMAIL_SUBJECT = '【ML Express】{{店铺名称}} 入驻已通过 — 登录账号';

const DEFAULT_APPROVAL_EMAIL_BODY = [
  '【ML Express】入驻已通过 / ဆိုင်အကောင့် ဖွင့်ပြီးပါပြီ',
  '店铺 / ဆိုင်：{{店铺名称}}',
  '店铺代码 / ဆိုင်ကုဒ်：{{店铺代码}}',
  '登录密码 / စကားဝှက်：{{密码}}',
  '登录 / ဝင်ရန်：{{登录地址}}',
  '商家网站 / ဆိုင်ဝက်ဘ်：{{商家网站}}',
  '商家 App（苹果）/ App Store：{{商家App苹果}}',
  '商家 App（安卓）/ Google Play：{{商家App安卓}}',
  '请尽快登录并修改密码。 စကားဝှက်ကို ဝင်ပြီးပြီးချင်း ပြောင်းပါ။',
].join('\n');

const PLACEHOLDERS = [
  ['{{店铺名称}}', 'storeName'],
  ['{{storeName}}', 'storeName'],
  ['{{店铺代码}}', 'storeCode'],
  ['{{storeCode}}', 'storeCode'],
  ['{{密码}}', 'password'],
  ['{{password}}', 'password'],
  ['{{登录地址}}', 'loginUrl'],
  ['{{loginUrl}}', 'loginUrl'],
  ['{{商家网站}}', 'merchantWebUrl'],
  ['{{merchantWebUrl}}', 'merchantWebUrl'],
  ['{{商家App苹果}}', 'merchantAppIosUrl'],
  ['{{merchantAppIosUrl}}', 'merchantAppIosUrl'],
  ['{{商家App安卓}}', 'merchantAppAndroidUrl'],
  ['{{merchantAppAndroidUrl}}', 'merchantAppAndroidUrl'],
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

function settingText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && typeof value.value === 'string') return value.value;
  return '';
}

function applyPlaceholders(template, values) {
  let out = String(template ?? '');
  for (const [token, key] of PLACEHOLDERS) {
    out = out.split(token).join(String(values[key] ?? ''));
  }
  return out;
}

function bodyKeepsCredentials(body) {
  const text = String(body || '');
  const hasCode = text.includes('{{店铺代码}}') || text.includes('{{storeCode}}');
  const hasPassword = text.includes('{{密码}}') || text.includes('{{password}}');
  return hasCode && hasPassword;
}

function ensureCredentialLines(text, values) {
  const lines = [];
  if (values.storeCode && !text.includes(values.storeCode)) {
    lines.push(`店铺代码：${values.storeCode}`);
  }
  if (values.password && !text.includes(values.password)) {
    lines.push(`登录密码：${values.password}`);
  }
  if (values.loginUrl && !text.includes(values.loginUrl)) {
    lines.push(`登录地址：${values.loginUrl}`);
  }
  if (!lines.length) return text;
  return `${String(text || '').replace(/\s*$/, '')}\n${lines.join('\n')}`;
}

function templateFromRows(rows) {
  const map = {};
  for (const row of rows || []) {
    if (row && row.settings_key) map[row.settings_key] = settingText(row.settings_value);
  }
  const subject = String(map[APPROVAL_EMAIL_SUBJECT_KEY] || '').trim();
  const body = String(map[APPROVAL_EMAIL_BODY_KEY] || '').trim();
  if (!subject && !body) return null;
  return {
    subject: subject || DEFAULT_APPROVAL_EMAIL_SUBJECT,
    body: body || DEFAULT_APPROVAL_EMAIL_BODY,
  };
}

function renderMerchantApprovalEmail(credentials, template) {
  const values = {
    storeName: String(credentials?.storeName || '').trim(),
    storeCode: String(credentials?.storeCode || '').trim(),
    password: String(credentials?.password || '').trim(),
    loginUrl: MERCHANT_WEB_URL,
    merchantWebUrl: MERCHANT_WEB_URL,
    merchantAppIosUrl: MERCHANT_APP_IOS_URL,
    merchantAppAndroidUrl: MERCHANT_APP_ANDROID_URL,
  };
  const subjectTemplate = String(template?.subject || '').trim() || DEFAULT_APPROVAL_EMAIL_SUBJECT;
  const bodyTemplate = String(template?.body || '').trim() || DEFAULT_APPROVAL_EMAIL_BODY;
  const subject = applyPlaceholders(subjectTemplate, values).replace(/[\r\n]+/g, ' ').trim().slice(0, 180);
  const text = ensureCredentialLines(applyPlaceholders(bodyTemplate, values), values);
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:24px;background:#f8fafc;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(text)}</div>
</body>
</html>`;
  return { subject, text, html };
}

async function loadApprovalEmailTemplate(supabase) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_key, settings_value')
    .in('settings_key', [APPROVAL_EMAIL_SUBJECT_KEY, APPROVAL_EMAIL_BODY_KEY]);
  if (error) {
    console.error('load approval email template failed:', error.message || error);
    return null;
  }
  return templateFromRows(data);
}

module.exports = {
  MERCHANT_WEB_URL,
  APPROVAL_EMAIL_SUBJECT_KEY,
  APPROVAL_EMAIL_BODY_KEY,
  DEFAULT_APPROVAL_EMAIL_SUBJECT,
  DEFAULT_APPROVAL_EMAIL_BODY,
  applyPlaceholders,
  bodyKeepsCredentials,
  templateFromRows,
  renderMerchantApprovalEmail,
  loadApprovalEmailTemplate,
};
