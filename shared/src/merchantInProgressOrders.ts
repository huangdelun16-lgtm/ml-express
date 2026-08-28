/**
 * 商家进行中订单 REST 轮询：用 id+状态+骑手做快照，变化时才刷新列表。
 * 纯逻辑，无 DOM / React Native / supabase 依赖。
 */

/** 骑手取件/配送过程中会出现的状态（不含待确认、已送达、已取消） */
export const MERCHANT_IN_PROGRESS_STATUSES = [
  '打包中',
  '待取件',
  '待收款',
  '已取件',
  '配送中',
  '运输中',
] as const;

export type MerchantInProgressStatus =
  (typeof MERCHANT_IN_PROGRESS_STATUSES)[number];

export type MerchantInProgressRow = {
  id: string;
  status?: string | null;
  courier?: string | null;
};

export function isMerchantInProgressStatus(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return (MERCHANT_IN_PROGRESS_STATUSES as readonly string[]).includes(status);
}

/** 顺序无关；同一批单状态/骑手不变则指纹相同 */
export function fingerprintMerchantInProgressOrders(
  rows: MerchantInProgressRow[],
): string {
  return rows
    .map((row) => {
      const id = String(row?.id || '').trim();
      if (!id) return '';
      const status = String(row.status || '');
      const courier = String(row.courier || '');
      return `${id}:${status}:${courier}`;
    })
    .filter(Boolean)
    .sort()
    .join('|');
}

export function merchantInProgressSnapshotChanged(
  previousFingerprint: string,
  rows: MerchantInProgressRow[],
): boolean {
  return fingerprintMerchantInProgressOrders(rows) !== previousFingerprint;
}
