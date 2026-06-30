import type { OpsAnomaly, OpsAnomalyCode, OpsAnomalySeverity } from '../types/opsHealth';

function severityFor(code: OpsAnomalyCode): OpsAnomalySeverity {
  if (code === 'sync_truck_pending' || code === 'pack_loaded_no_cloud') return 'critical';
  if (code === 'sync_queue_pending' || code === 'transport_unpaid' || code === 'cod_pending_inflow') {
    return 'warn';
  }
  return 'info';
}

export function buildOpsAnomalies(input: {
  pendingTruckLoad: number;
  pendingOther: number;
  loadedNoCloudCount: number;
  loadedNoCloudSample?: string;
  transportUnpaidTotal: number;
  transportUnpaidCount: number;
  pendingInflowTotal: number;
  pendingInflowCount: number;
  agencyPayableTotal: number;
  agencyPayableCount: number;
}): OpsAnomaly[] {
  const anomalies: OpsAnomaly[] = [];

  if (input.pendingTruckLoad > 0) {
    anomalies.push({
      code: 'sync_truck_pending',
      count: input.pendingTruckLoad,
      severity: severityFor('sync_truck_pending'),
    });
  }
  if (input.pendingOther > 0) {
    anomalies.push({
      code: 'sync_queue_pending',
      count: input.pendingOther,
      severity: severityFor('sync_queue_pending'),
    });
  }
  if (input.loadedNoCloudCount > 0) {
    anomalies.push({
      code: 'pack_loaded_no_cloud',
      count: input.loadedNoCloudCount,
      severity: severityFor('pack_loaded_no_cloud'),
      sampleLabel: input.loadedNoCloudSample,
    });
  }
  if (input.transportUnpaidCount > 0 && input.transportUnpaidTotal > 0) {
    anomalies.push({
      code: 'transport_unpaid',
      count: input.transportUnpaidCount,
      severity: severityFor('transport_unpaid'),
    });
  }
  if (input.pendingInflowCount > 0 && input.pendingInflowTotal > 0) {
    anomalies.push({
      code: 'cod_pending_inflow',
      count: input.pendingInflowCount,
      severity: severityFor('cod_pending_inflow'),
    });
  }
  if (input.agencyPayableCount > 0 && input.agencyPayableTotal > 0) {
    anomalies.push({
      code: 'agency_payable',
      count: input.agencyPayableCount,
      severity: severityFor('agency_payable'),
    });
  }

  return anomalies;
}
