import type { OpsAnomalyCode, OpsHealthNavTarget } from '../types/opsHealth';

export function navTargetForAnomaly(code: OpsAnomalyCode): OpsHealthNavTarget {
  switch (code) {
    case 'sync_truck_pending':
    case 'sync_queue_pending':
      return { screen: 'Settings' };
    case 'pack_loaded_no_cloud':
      return { screen: 'Pkg' };
    case 'transport_unpaid':
      return { screen: 'CrossBorderFinance', tab: 'transport' };
    case 'cod_pending_inflow':
      return { screen: 'CrossBorderFinance', tab: 'pending' };
    case 'agency_payable':
      return { screen: 'CrossBorderFinance', tab: 'agency' };
    default:
      return { screen: 'Settings' };
  }
}
