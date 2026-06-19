export type PackDisplayStatus = 'pending_load' | 'loaded' | 'arrived' | 'completed';

export const PACK_DISPLAY_STATUS_LABELS: Record<PackDisplayStatus, { zh: string; en: string }> = {
  pending_load: { zh: '未装车', en: 'Not loaded' },
  loaded: { zh: '已装车', en: 'Loaded' },
  arrived: { zh: '已到站', en: 'At hub' },
  completed: { zh: '已完成', en: 'Completed' },
};

export function packDisplayStatusBadgeClass(status: PackDisplayStatus): string {
  switch (status) {
    case 'completed':
      return 'cbl-badge cbl-badge--green';
    case 'arrived':
      return 'cbl-badge cbl-badge--blue';
    case 'loaded':
      return 'cbl-badge cbl-badge--red';
    default:
      return 'cbl-badge cbl-badge--amber';
  }
}
