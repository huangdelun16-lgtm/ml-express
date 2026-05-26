import type { Package } from '../services/supabase';

const ORDERER_IDENTITY_RE =
  /\[(?:下单身份|Orderer Identity|Orderer|အော်ဒါတင်သူ အမျိုးအစား|အော်ဒါတင်သူ): (.*?)\]/;

/** 描述中的「付给商家 / 骑手代付」等代收款标签 */
const PAY_TO_MERCHANT_RE =
  /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း): (.*?) MMK\]/;

function parseMmkFromTag(match: RegExpMatchArray | null): number {
  if (!match?.[1]) return 0;
  const n = parseFloat(String(match[1]).replace(/,/g, '').replace(/[^\d.]/g, '') || '0');
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 是否商家/商城相关订单（易产生 COD 代收款） */
export function isMerchantOrderPackage(
  pkg: Pick<Package, 'description' | 'delivery_store_id'>,
): boolean {
  const identity = pkg.description?.match(ORDERER_IDENTITY_RE)?.[1]?.trim() || '';
  if (identity === '商家' || identity === 'MERCHANTS') return true;
  return Boolean(pkg.delivery_store_id);
}

/**
 * 解析包裹 COD 代收款：优先 cod_amount，其次描述中的付给商家等标签。
 */
export function resolvePackageCodAmount(
  pkg: Pick<Package, 'cod_amount' | 'description'>,
): number {
  const direct = Number(pkg.cod_amount || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return parseMmkFromTag((pkg.description || '').match(PAY_TO_MERCHANT_RE));
}

export function packageHasCod(pkg: Pick<Package, 'cod_amount' | 'description'>): boolean {
  return resolvePackageCodAmount(pkg) > 0;
}
