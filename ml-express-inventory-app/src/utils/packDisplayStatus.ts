import type { PackedShipmentDetail } from '../types/inventory';
import type { PkgTrackingStatus } from '../types/tracking';

export type PackDisplayStatus = 'pending_load' | 'loaded' | 'arrived' | 'completed';

export const PACK_DISPLAY_LABEL: Record<PackDisplayStatus, string> = {
  pending_load: '未装车',
  loaded: '已装车',
  arrived: '已到站',
  completed: '已完成',
};

export function resolvePackDisplayStatus(
  pack: PackedShipmentDetail,
  cloudStatus: PkgTrackingStatus | null | undefined,
): PackDisplayStatus {
  if (cloudStatus === 'completed' && pack.loaded) return 'completed';
  if (cloudStatus === 'completed' && !pack.loaded) return 'arrived';
  if (cloudStatus === 'split_at_hub') return 'arrived';
  if (cloudStatus === 'hub_received') return 'arrived';
  if (pack.loaded) return 'loaded';
  return 'pending_load';
}

export function packStatusStyle(status: PackDisplayStatus): {
  badgeBg: string;
  badgeText: string;
  border: string;
} {
  switch (status) {
    case 'completed':
      return {
        badgeBg: 'rgba(34,197,94,0.18)',
        badgeText: '#4ade80',
        border: '#22c55e',
      };
    case 'arrived':
      return {
        badgeBg: 'rgba(14,165,233,0.18)',
        badgeText: '#38bdf8',
        border: '#0ea5e9',
      };
    case 'loaded':
      return {
        badgeBg: 'rgba(239,68,68,0.15)',
        badgeText: '#f87171',
        border: '#ef4444',
      };
    default:
      return {
        badgeBg: 'rgba(251,146,60,0.15)',
        badgeText: '#fb923c',
        border: '#f97316',
      };
  }
}
