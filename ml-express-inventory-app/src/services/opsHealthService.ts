import type { InventoryStoreSession } from './authService';
import { getDatabase } from './database';
import { listCrossBorderFinance } from './financeLedgerService';
import { listPackedShipmentRows, syncMissingCustomerNamesFromCloud } from './inventoryService';
import { getCloudSyncQueueSnapshot } from './inventoryCloudQueue';
import type { FinanceLedgerEntry } from '../types/financeLedger';
import type { OpsHealthReport } from '../types/opsHealth';
import { buildOpsAnomalies } from '../utils/inventoryAnomalies';
import { buildOrderDataIssues } from '../utils/orderDataQuality';
import { isVisibleInExpressDetailsList } from '../utils/expressDetailsVisibility';
import { isExpressPackItem } from '../utils/packItem';
import { ownershipKeyFromStoreCode } from '../utils/storeOwnership';
import { destinationCodesMatch } from '../utils/destinationCode';

const INBOUND_PHONE_SUBQUERY = `(
  SELECT m.recipient_phone FROM stock_movements m
  WHERE m.item_id = i.id AND m.type = 'in' AND TRIM(m.recipient_phone) != ''
  ORDER BY m.created_at DESC LIMIT 1
)`;

async function scanOrderDataQualityRows(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<
  Array<{
    id: string;
    barcode: string;
    name: string;
    customer_name: string;
    recipient_name: string;
    recipient_phone: string;
    destination: string;
    final_destination: string;
    customer_signed_at: string;
    stocked_in: boolean;
  }>
> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT i.id, i.barcode, i.name, i.recipient_name, i.final_destination,
            i.customer_signed_at,
            COALESCE(NULLIF(TRIM(i.recipient_name), ''), '') AS customer_name,
            COALESCE(NULLIF(TRIM(i.final_destination), ''), '') AS destination,
            COALESCE(NULLIF(TRIM(${INBOUND_PHONE_SUBQUERY}), ''), '') AS recipient_phone,
            CASE WHEN EXISTS (
              SELECT 1 FROM stock_movements m WHERE m.item_id = i.id AND m.type = 'in'
            ) THEN 1 ELSE 0 END AS stocked_in
     FROM inventory_items i
     WHERE UPPER(i.barcode) NOT LIKE 'PKG%'
     ORDER BY i.updated_at DESC
     LIMIT 500`,
  );

  return rows
    .map((row) => ({
      id: String(row.id),
      barcode: String(row.barcode),
      name: String(row.name),
      customer_name: String(row.customer_name ?? ''),
      recipient_name: String(row.recipient_name ?? ''),
      recipient_phone: String(row.recipient_phone ?? ''),
      destination: String(row.destination ?? ''),
      final_destination: String(row.final_destination ?? ''),
      customer_signed_at: String(row.customer_signed_at ?? ''),
      stocked_in: Boolean(Number(row.stocked_in)),
    }))
    .filter((row) =>
      isVisibleInExpressDetailsList(
        {
          ...row,
          input_barcode: '',
          spec: '',
          unit: '',
          weight: '',
          qty_on_hand: 0,
          min_qty: 0,
          note: '',
          created_at: '',
          updated_at: '',
          stocked_in: row.stocked_in,
          packed: false,
          hub_arrived: false,
          hub_transit_released: false,
          hub_transit_shipped: false,
          customer_signed: Boolean(row.customer_signed_at),
        },
        store,
        hubCode,
      ),
    )
    .filter((row) => !isExpressPackItem({ barcode: row.barcode }));
}

/** 扫描对账异常与订单资料问题（本地优先，不阻塞 UI） */
export async function scanOpsHealth(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<OpsHealthReport> {
  const scope = { store, hubCode };
  const storeCode = store.storeCode.trim().toUpperCase();
  const currentKey = ownershipKeyFromStoreCode(store.storeCode);

  const [queueSnap, finance, packs, qualityRows] = await Promise.all([
    getCloudSyncQueueSnapshot(storeCode),
    listCrossBorderFinance(store, hubCode).catch(() => null),
    listPackedShipmentRows(undefined, scope).catch(() => []),
    scanOrderDataQualityRows(store, hubCode),
  ]);

  const loadedNoCloud = packs.filter((p) => p.loaded && !p.cloud_status);
  const pendingOther = Math.max(0, queueSnap.pending - queueSnap.pendingTruckLoad);

  const entries = finance?.entries ?? [];
  const summary = finance?.summary;

  const transportUnpaidEntries = entries.filter(
    (e) =>
      e.category === 'transport_cost' &&
      !e.paid &&
      e.transportDirection !== 'outbound' &&
      destinationCodesMatch(String(e.destination ?? ''), hubCode),
  );
  const pendingCodEntries = entries.filter((e) => {
    if (e.category !== 'order_income_cod') return false;
    const originKey = String(e.originKey || '').trim();
    return Boolean(
      originKey &&
        originKey !== currentKey &&
        destinationCodesMatch(String(e.destination ?? ''), hubCode),
    );
  });
  const agencyEntries = entries.filter((e) => {
    const originKey = String(e.originKey || '').trim();
    if (!originKey || originKey === currentKey) return false;
    return e.category === 'order_collected' || e.category === 'order_prepaid';
  });

  const anomalies = buildOpsAnomalies({
    pendingTruckLoad: queueSnap.pendingTruckLoad,
    pendingOther,
    loadedNoCloudCount: loadedNoCloud.length,
    loadedNoCloudSample: loadedNoCloud[0]?.bundle_barcode,
    transportUnpaidTotal: summary?.transportUnpaidTotal ?? 0,
    transportUnpaidCount: transportUnpaidEntries.length,
    pendingInflowTotal: summary?.pendingInflowTotal ?? 0,
    pendingInflowCount: pendingCodEntries.length,
    agencyPayableTotal: summary?.agencyPayableTotal ?? 0,
    agencyPayableCount: agencyEntries.length,
  });

  const dataIssues = buildOrderDataIssues(qualityRows);
  const anomalyCount = anomalies.reduce((sum, a) => sum + a.count, 0);
  const dataIssueCount = dataIssues.length;

  return {
    anomalies,
    dataIssues,
    anomalyCount,
    dataIssueCount,
    totalOpen: anomalyCount + dataIssueCount,
  };
}

/** 从云端补全缺失客户姓名（治理动作） */
export async function repairCustomerNamesFromCloud(operator: string): Promise<number> {
  return syncMissingCustomerNamesFromCloud(operator);
}
