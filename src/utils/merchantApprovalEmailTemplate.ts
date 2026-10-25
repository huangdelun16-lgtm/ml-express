/** 与 netlify/functions/utils/merchantApprovalEmail.js 的默认文案保持一致。 */

export const MERCHANT_LOGIN_URL = 'https://mlexpress-merchants.com';
export const MERCHANT_APP_IOS_URL = 'https://apps.apple.com/mm/app/market-link-merchant/id6761371884';
export const MERCHANT_APP_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.mlexpress.merchants';

export const APPROVAL_EMAIL_SUBJECT_KEY = 'merchant.approval_email.subject';
export const APPROVAL_EMAIL_BODY_KEY = 'merchant.approval_email.body';

export const DEFAULT_APPROVAL_EMAIL_SUBJECT = '【ML Express】{{店铺名称}} 入驻已通过 — 登录账号';

export const DEFAULT_APPROVAL_EMAIL_BODY = [
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

const PLACEHOLDERS: Array<[string, 'storeName' | 'storeCode' | 'password' | 'loginUrl' | 'merchantWebUrl' | 'merchantAppIosUrl' | 'merchantAppAndroidUrl']> = [
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

export function approvalEmailBodyKeepsCredentials(body: string) {
  const text = String(body || '');
  const hasCode = text.includes('{{店铺代码}}') || text.includes('{{storeCode}}');
  const hasPassword = text.includes('{{密码}}') || text.includes('{{password}}');
  return hasCode && hasPassword;
}

export function previewApprovalEmail(subject: string, body: string) {
  const values = {
    storeName: '示例店铺',
    storeCode: 'MDY005',
    password: 'Abc12345',
    loginUrl: MERCHANT_LOGIN_URL,
    merchantWebUrl: MERCHANT_LOGIN_URL,
    merchantAppIosUrl: MERCHANT_APP_IOS_URL,
    merchantAppAndroidUrl: MERCHANT_APP_ANDROID_URL,
  };
  const apply = (template: string) => {
    let out = template;
    for (const [token, key] of PLACEHOLDERS) {
      out = out.split(token).join(values[key]);
    }
    return out;
  };
  return {
    subject: apply(subject || DEFAULT_APPROVAL_EMAIL_SUBJECT).replace(/[\r\n]+/g, ' ').trim(),
    body: apply(body || DEFAULT_APPROVAL_EMAIL_BODY),
  };
}
