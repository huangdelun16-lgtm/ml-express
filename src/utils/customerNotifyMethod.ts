export const CUSTOMER_NOTIFY_METHODS = [
  'whatsapp',
  'telegram',
  'message',
  'phone',
  'wechat',
] as const;

export type CustomerNotifyMethod = (typeof CUSTOMER_NOTIFY_METHODS)[number];

export const DEFAULT_CUSTOMER_NOTIFY_METHOD: CustomerNotifyMethod = 'whatsapp';

export const CUSTOMER_NOTIFY_METHOD_LABELS: Record<CustomerNotifyMethod, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  message: 'Message',
  phone: 'Phone Call',
  wechat: 'WeChat',
};

export function isCustomerNotifyMethod(value: unknown): value is CustomerNotifyMethod {
  return CUSTOMER_NOTIFY_METHODS.includes(value as CustomerNotifyMethod);
}

export function normalizeCustomerNotifyMethod(raw: unknown): CustomerNotifyMethod {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (value === 'whatsapp' || value === 'wa') return 'whatsapp';
  if (value === 'telegram' || value === 'tg') return 'telegram';
  if (value === 'message' || value === 'sms' || value === 'text') return 'message';
  if (value === 'phone' || value === 'phonecall' || value === 'call' || value === 'tel') return 'phone';
  if (value === 'wechat' || value === 'weixin') return 'wechat';
  return DEFAULT_CUSTOMER_NOTIFY_METHOD;
}

export function customerNotifyAccountLabel(isEn = false): string {
  return isEn ? 'Notify account' : '通知账号';
}

export function customerNotifyAccountPlaceholder(
  method: CustomerNotifyMethod,
  isEn = false,
): string {
  if (method === 'telegram') return isEn ? '@username' : '@用户名';
  if (method === 'wechat') return isEn ? 'WeChat ID' : '微信号';
  return '09xxxxxxxxx';
}

export function formatCustomerNotifyDisplay(methodRaw: unknown, accountRaw: unknown): string {
  const label = CUSTOMER_NOTIFY_METHOD_LABELS[normalizeCustomerNotifyMethod(methodRaw)];
  const account = String(accountRaw ?? '').trim();
  return account ? `${label} · ${account}` : label;
}
