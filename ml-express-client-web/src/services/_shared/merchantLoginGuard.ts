// ⚠️ AUTO-GENERATED from /shared/src — 请勿在此文件直接修改。
// 修改请编辑 /shared/src 下的源文件，并运行 "npm run sync:shared"。

/** 商家端登录限制：跨境中转站账号仅 Inventory App 可登录 */

export const TRANSIT_STATION_STORE_TYPE = 'transit_station';

export type MerchantLoginLang = 'zh' | 'en' | 'my';

export function isTransitStationStore(
  store: { store_type?: string | null } | null | undefined,
): boolean {
  return String(store?.store_type ?? '').trim() === TRANSIT_STATION_STORE_TYPE;
}

export function getTransitAccountMerchantLoginMessage(lang: MerchantLoginLang): string {
  if (lang === 'en') {
    return 'This cross-border hub account can only sign in via the Inventory App, not the Merchant App/Web.';
  }
  if (lang === 'my') {
    return 'ဤ cross-border hub အကောင့်ကို Inventory App တွင်သာ ဝင်ရောက်နိုင်ပါသည်။';
  }
  return '该账号为跨境中转站账号，请使用 Inventory App 登录，无法在商家端登录。';
}

/** 若该店铺不可在商家端登录，返回错误文案；否则返回 null */
export function getMerchantLoginBlockReason(
  store: { store_type?: string | null } | null | undefined,
  lang: MerchantLoginLang = 'zh',
): string | null {
  if (isTransitStationStore(store)) {
    return getTransitAccountMerchantLoginMessage(lang);
  }
  return null;
}
