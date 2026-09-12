import { normalizeCustomerNotifyMethod } from './customerNotifyMethod';

export function toWhatsAppDigits(raw: string): string {
  let digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 8) {
    return `95${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, body = ''): string {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return '';
  return body
    ? `https://wa.me/${digits}?text=${encodeURIComponent(body)}`
    : `https://wa.me/${digits}`;
}

export function buildTelUrl(phone: string): string {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

export function buildSmsUrl(phone: string, body = ''): string {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  return body ? `sms:${digits}?body=${encodeURIComponent(body)}` : `sms:${digits}`;
}

export function buildTelegramUrl(account: string): string {
  const value = String(account || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const username = value.replace(/^@/, '');
  if (!username) return '';
  return `https://t.me/${username}`;
}

export type PreferredContactKind = 'whatsapp' | 'telegram' | 'sms' | 'tel' | 'copy';

export type PreferredContact = {
  kind: PreferredContactKind;
  href: string;
  copyText: string;
};

export function resolvePreferredContact(
  methodRaw: unknown,
  accountRaw: unknown,
  phoneRaw: unknown,
): PreferredContact | null {
  const method = normalizeCustomerNotifyMethod(methodRaw);
  const account = String(accountRaw ?? '').trim();
  const phone = String(phoneRaw ?? '').trim();
  const phoneOrAccount = account || phone;

  if (method === 'whatsapp') {
    const href = buildWhatsAppUrl(phoneOrAccount);
    if (!href && !phoneOrAccount) return null;
    return { kind: 'whatsapp', href, copyText: phoneOrAccount };
  }
  if (method === 'telegram') {
    const looksLikeUser = Boolean(account) && !/^\+?\d[\d\s-]*$/.test(account);
    if (looksLikeUser) {
      return {
        kind: 'telegram',
        href: buildTelegramUrl(account),
        copyText: account,
      };
    }
    return {
      kind: 'telegram',
      href: buildTelUrl(phoneOrAccount),
      copyText: phoneOrAccount,
    };
  }
  if (method === 'message') {
    const href = buildSmsUrl(phoneOrAccount);
    if (!href && !phoneOrAccount) return null;
    return { kind: 'sms', href, copyText: phoneOrAccount };
  }
  if (method === 'wechat') {
    if (!phoneOrAccount) return null;
    return { kind: 'copy', href: '', copyText: phoneOrAccount };
  }
  const href = buildTelUrl(phone || account);
  if (!href && !phoneOrAccount) return null;
  return { kind: 'tel', href, copyText: phoneOrAccount };
}

export function preferredContactLabel(kind: PreferredContactKind, isEn: boolean): string {
  if (kind === 'whatsapp') return 'WhatsApp';
  if (kind === 'telegram') return 'Telegram';
  if (kind === 'sms') return isEn ? 'SMS' : '短信';
  if (kind === 'copy') return isEn ? 'Copy WeChat' : '复制微信';
  return isEn ? 'Call' : '打电话';
}
