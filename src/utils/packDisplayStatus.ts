export type PackDisplayStatus = 'pending_load' | 'loaded' | 'arrived' | 'completed';

export type PackTransportFilter =
  | 'active'
  | 'in_transit'
  | 'hub_received'
  | 'completed'
  | 'all';

export function isPackDisplayFinished(pack: {
  status?: string | null;
  display_status?: PackDisplayStatus | null;
}): boolean {
  return pack.display_status === 'completed' || pack.status === 'completed';
}

/** 运输「进行中」跟展示状态走，已完成包归入「已完成」。 */
export function matchesPackTransportFilter(
  pack: {
    status?: string | null;
    display_status?: PackDisplayStatus | null;
  },
  packStatus: PackTransportFilter,
): boolean {
  if (!packStatus || packStatus === 'all') return true;
  if (pack.status === 'cancelled') return false;
  const finished = isPackDisplayFinished(pack);
  if (packStatus === 'active') return !finished;
  if (packStatus === 'completed') return finished;
  if (packStatus === 'in_transit' || packStatus === 'hub_received') {
    return !finished && pack.status === packStatus;
  }
  return pack.status === packStatus;
}

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
