// ⚠️ AUTO-GENERATED from /shared/src — 请勿在此文件直接修改。
// 修改请编辑 /shared/src 下的源文件，并运行 "npm run sync:shared"。

/**
 * 会员订单匹配辅助。
 *
 * PostgREST `.or()` 是原始过滤字符串：`.` `,` `()` `[]` 空格和 `+` 都是保留字符。
 * 把 `customer_email`（一定含 `.`）或 `description.ilike.%[客户ID: …]%`
 * 拼进同一段 `.or()` 会让整次请求失败，界面就显示 0 单。
 */

export function quotePostgrestOrValue(value: string): string {
  const s = String(value ?? '');
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Myanmar 09xxxxxxxx ↔ +959xxxxxxxx, plus digits-only. */
export function uniquePhoneVariants(phone?: string | null): string[] {
  const raw = String(phone || '').trim();
  if (!raw) return [];
  const out = new Set<string>();
  out.add(raw);
  const digits = raw.replace(/\D/g, '');
  if (digits) out.add(digits);
  if (digits.startsWith('09') && digits.length >= 8) {
    out.add('+95' + digits.slice(1));
    out.add('95' + digits.slice(1));
  }
  if (digits.startsWith('959') && digits.length >= 10) {
    out.add('0' + digits.slice(2));
    out.add('+' + digits);
  }
  return Array.from(out);
}

/** sender_phone OR receiver_phone for every stored/local variant. */
export function buildCustomerPhoneOrFilter(phone?: string | null): string | null {
  const variants = uniquePhoneVariants(phone);
  if (!variants.length) return null;
  const parts: string[] = [];
  for (const v of variants) {
    const q = quotePostgrestOrValue(v);
    parts.push(`sender_phone.eq.${q}`, `receiver_phone.eq.${q}`);
  }
  return parts.join(',');
}

export function mergePackageRows<T extends { id?: string; created_at?: string }>(
  batches: Array<T[] | null | undefined>,
): T[] {
  const map = new Map<string, T>();
  for (const batch of batches) {
    for (const row of batch || []) {
      if (row?.id) map.set(String(row.id), row);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
}
