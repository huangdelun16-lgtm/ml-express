import type { TranslationDict } from '../i18n/translations';
import { fmt } from '../i18n/format';
import { isInventoryRlsPolicyError } from '../utils/cloudAuthErrors';

export type CloudSyncOpType = 'truck_load' | 'packed_shipment' | 'item_and_movement';

/** 业务优先级：装车 > 打包 > 入库流水 */
export function queueOpPriority(type: string): number {
  if (type === 'truck_load') return 0;
  if (type === 'packed_shipment') return 1;
  return 2;
}

export function highestPriorityOpType(counts: {
  truck_load: number;
  packed_shipment: number;
  item_and_movement: number;
}): CloudSyncOpType | null {
  if (counts.truck_load > 0) return 'truck_load';
  if (counts.packed_shipment > 0) return 'packed_shipment';
  if (counts.item_and_movement > 0) return 'item_and_movement';
  return null;
}

export function syncImpactMessage(
  t: TranslationDict,
  priorityType: CloudSyncOpType | null,
  pending: number,
): string | null {
  if (!pending || !priorityType) return null;
  if (priorityType === 'truck_load') {
    return fmt(t.settings.cloudSync.impactTruckLoad, { count: pending });
  }
  if (priorityType === 'packed_shipment') {
    return fmt(t.settings.cloudSync.impactPack, { count: pending });
  }
  return fmt(t.settings.cloudSync.impactItem, { count: pending });
}

/** 将技术错误转为一线可理解的同步失败说明 */
export function resolveSyncErrorMessage(t: TranslationDict, error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'syncFailed';

  if (/supabaseNotConfigured|not configured/i.test(raw)) {
    return t.serviceErrors.supabaseNotConfigured;
  }
  if (/authSessionExpired|authJwtMissingHubCode|jwt|re-login|重新登录/i.test(raw)) {
    return t.serviceErrors.authSessionExpired;
  }
  if (isInventoryRlsPolicyError(error) || isInventoryRlsPolicyError(raw)) {
    return t.serviceErrors.syncRlsBlocked;
  }
  if (/network|fetch|timeout|failed to fetch|offline|ENETUNREACH/i.test(raw)) {
    return t.serviceErrors.syncNetworkFailed;
  }
  if (raw in t.serviceErrors) {
    return t.serviceErrors[raw as keyof typeof t.serviceErrors];
  }
  return raw;
}
