export type OpsAnomalyCode =
  | 'sync_truck_pending'
  | 'sync_queue_pending'
  | 'pack_loaded_no_cloud'
  | 'transport_unpaid'
  | 'cod_pending_inflow'
  | 'agency_payable';

export type OpsAnomalySeverity = 'critical' | 'warn' | 'info';

export type OpsAnomaly = {
  code: OpsAnomalyCode;
  count: number;
  severity: OpsAnomalySeverity;
  /** 用于列表展示的示例条码 */
  sampleLabel?: string;
};

export type OrderDataIssueCode = 'missing_customer' | 'missing_phone' | 'missing_destination';

export type OrderDataIssue = {
  itemId: string;
  barcode: string;
  name: string;
  issues: OrderDataIssueCode[];
};

export type OpsHealthReport = {
  anomalies: OpsAnomaly[];
  dataIssues: OrderDataIssue[];
  anomalyCount: number;
  dataIssueCount: number;
  totalOpen: number;
};

export type OpsHealthNavTarget =
  | { screen: 'Settings' }
  | { screen: 'Pkg' }
  | { screen: 'CrossBorderFinance'; tab?: 'transport' | 'pending' | 'agency' }
  | { screen: 'Items'; incompleteOnly?: boolean }
  | { screen: 'ItemForm'; itemId: string };
