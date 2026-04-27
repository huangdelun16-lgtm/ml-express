/**
 * 从 description 中的 [下单身份: …] 等标签解析下单身份，并与 Member / VIP / Merchant 对齐展示。
 * 无标签但存在 delivery_store_id 时推断为商家单（商城/店铺单）。
 */
export const ORDERER_IDENTITY_TAG_REGEX =
  /\[(?:下单身份|Orderer Identity|Orderer|အော်ဒါတင်သူ အမျိုးအစား|အော်ဒါတင်သူ): (.*?)\]/;

export type OrdererKind = 'Member' | 'VIP' | 'Merchant' | 'Unknown';

export function extractOrdererTagRaw(description?: string | null): string | null {
  const m = String(description || '').match(ORDERER_IDENTITY_TAG_REGEX);
  const t = m?.[1]?.trim();
  return t || null;
}

function classifyFromRaw(
  raw: string | null,
  deliveryStoreId?: string | null,
): OrdererKind {
  if (raw) {
    const s = raw.trim();
    const lower = s.toLowerCase();
    if (s === '商家' || s === 'MERCHANTS' || lower === 'merchant' || s.includes('MERCHANT')) {
      return 'Merchant';
    }
    if (
      s === 'VIP' ||
      s === 'VIP MEMBER' ||
      s === 'VIP အဖွဲ့ဝင်' ||
      lower === 'vip' ||
      s.startsWith('VIP')
    ) {
      return 'VIP';
    }
    if (s === '会员' || s === 'Member' || s === 'အဖွဲ့ဝင်' || lower === 'member') {
      return 'Member';
    }
  }
  if (deliveryStoreId) {
    return 'Merchant';
  }
  return 'Unknown';
}

function lang3(language: string): 'zh' | 'en' | 'my' {
  if (language === 'en') {
    return 'en';
  }
  if (language === 'my') {
    return 'my';
  }
  return 'zh';
}

function shortEn(kind: OrdererKind): string {
  switch (kind) {
    case 'Member':
      return 'Member';
    case 'VIP':
      return 'VIP';
    case 'Merchant':
      return 'Merchant';
    default:
      return '—';
  }
}

/**
 * 用于骑手端展示：主文案含英文标准名；中文下附带（会员/商家）说明。
 */
export function getOrdererIdentityDisplay(input: {
  description?: string | null;
  delivery_store_id?: string | null;
  language: string;
}): {
  kind: OrdererKind;
  /** Member / VIP / Merchant / — */
  shortLabel: string;
  /** 根据语言展示的主标题 */
  displayLabel: string;
  badgeColor: string;
} {
  const raw = extractOrdererTagRaw(input.description);
  const kind = classifyFromRaw(raw, input.delivery_store_id);
  const lang = lang3(input.language);
  const shortLabel = shortEn(kind);
  let displayLabel: string;
  if (lang === 'zh') {
    switch (kind) {
      case 'Member':
        displayLabel = 'Member（会员）';
        break;
      case 'VIP':
        displayLabel = 'VIP';
        break;
      case 'Merchant':
        displayLabel = 'Merchant（商家）';
        break;
      default:
        displayLabel = '未标注';
    }
  } else if (lang === 'en') {
    displayLabel = kind === 'Unknown' ? 'Not set' : shortLabel;
  } else {
    displayLabel = kind === 'Unknown' ? '—' : shortLabel;
  }
  const badgeColor =
    kind === 'Merchant'
      ? '#3b82f6'
      : kind === 'VIP'
        ? '#a855f7'
        : kind === 'Member'
          ? '#f59e0b'
          : '#94a3b8';
  return { kind, shortLabel, displayLabel, badgeColor };
}

export function isMerchantOrderer(
  description?: string | null,
  delivery_store_id?: string | null,
): boolean {
  const raw = extractOrdererTagRaw(description);
  return classifyFromRaw(raw, delivery_store_id) === 'Merchant';
}
