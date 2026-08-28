// ⚠️ AUTO-GENERATED from /shared/src — 请勿在此文件直接修改。
// 修改请编辑 /shared/src 下的源文件，并运行 "npm run sync:shared"。

/**
 * 拨号号码清洗：去掉空格、括号、短横，保留数字与前导 +。
 * 纯逻辑，无 DOM / React Native 依赖。
 */

const UNASSIGNED_COURIER = new Set(['', '待分配', 'unassigned', 'Unassigned', '-']);

export function sanitizeDialNumber(phone?: string | null): string {
  return String(phone || '')
    .trim()
    .replace(/[^\d+]/g, '');
}

export function isCourierUnassigned(nameOrId?: string | null): boolean {
  const raw = String(nameOrId || '').trim();
  return UNASSIGNED_COURIER.has(raw);
}
