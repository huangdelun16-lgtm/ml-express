import type {
  InventoryItem, InventoryItemDetail, InventoryItemListRow, MovementType, PackedShipment,
  PackedShipmentDetail, PackedShipmentItem, PackedShipmentListRow, StockMovement, TrackOrderResult,
} from '../types/inventory';
import type { InventoryStoreSession } from './authService';
import type { OrderTrackingRecord, PkgTrackingDetail } from '../types/tracking';
import { svc, isServiceError } from '../errors/serviceError';
import { newId, nowIso } from './database';
import { resolveStoreHubCode } from '../utils/storeZone';
import {
  applyMovement, clearInventoryCloudCache, createPack, createPackAtomic, deletePack,
  getItemByBarcode as cloudGetItemByBarcode,
  getItemById as cloudGetItemById, getInventorySnapshot, inventoryItemFromCloudRow,
  listMovementsForItem as cloudListMovementsForItem,
  listPacks, loadShipmentsAtomic, mergePackagingStockInIntoCache, packDetailFromCloudPackRow,
  refreshCache, upsertItem as cloudUpsertItem,
} from './inventoryCloudStore';
import {
  deleteCloudPackedShipment,
  fetchCloudTodayMovementTotals,
  packagingStockInBatchAtomic,
} from './inventoryCloudApi';
import {
  buildPackageNumberBody, formatPackageSequence, isPackageBarcode, packDestinationFromBarcode,
  parsePackageBarcode,
} from '../utils/packageNumber';
import {
  resolvePackDisplayStatus,
  canEditPackedShipment,
  canSelectPackedShipmentForTruckLoad,
} from '../utils/packDisplayStatus';
import { isVisibleInExpressDetailsList, isVisibleInPackedList } from '../utils/expressDetailsVisibility';
import { canEditItemCustomerProfileAsync } from '../utils/itemCustomerProfileEdit';
import { todayIsoDate } from '../utils/dateFormat';
import { resolveTripNumberPrefix } from '../utils/tripNumber';
import { inventoryOperationId } from '../utils/inventoryReliability';
import { parseTransportFeeFromLoadNote } from '../utils/truckRouteFee';
import { parseInboundMovementNote } from '../utils/inboundMovementNote';
import type { CustomerSignPickupType, CustomerSignReceiptInput } from '../types/customerSignReceipt';
import {
  parseSignatureStrokes,
  serializeSignatureStrokes,
  validateCustomerSignReceipt,
} from '../types/customerSignReceipt';
import {
  listPkgTrackingStatusMap,
  markHubTransitOrdersRepacked,
  pushTruckLoadTracking,
} from './trackingService';
import {
  deliverHubOrderInboundAtStation as hubDeliverOrder,
  importInboundPackToLocal as hubImportPack,
  maybeAutoReleaseTransitAfterAllInbound as hubMaybeAutoRelease,
  releaseHubTransitOrders as hubReleaseTransit,
  syncInboundHubPacksToLocal as hubSyncInbound,
  type OriginStoreRef,
} from './inventoryHubOps';

export type { OriginStoreRef };

const hubOps = {
  upsertItem,
  applyStockMovement,
  getItemByBarcode,
  getItemById,
  getPackedShipmentByBarcode,
};

const listRowLight = (item: InventoryItem, packs: PackedShipmentDetail[]): InventoryItemListRow => ({
  ...item,
  stocked_in:
    item.qty_on_hand > 0 ||
    Boolean(item.hub_arrived_at?.trim()) ||
    Boolean(item.packed_at?.trim()) ||
    Boolean(item.customer_signed_at?.trim()) ||
    Boolean(item.hub_transit_released_at?.trim()),
  packed: Boolean(item.packed_at),
  hub_arrived: Boolean(item.hub_arrived_at),
  hub_transit_released: Boolean(item.hub_transit_released_at),
  hub_transit_shipped: Boolean(item.hub_transit_shipped_at),
  hub_transit_hub_inbound: Boolean(item.hub_transit_released_at?.trim()) && !item.hub_transit_shipped_at?.trim(),
  customer_signed: Boolean(item.customer_signed_at),
  parent_pack_barcode:
    item.packed_bundle_barcode ||
    packs.find((p) => p.items.some((line) => line.item_id === item.id))?.bundle_barcode ||
    '',
});

async function all(scope?: { store: InventoryStoreSession; hubCode: string }, includeMovements = false) {
  return getInventorySnapshot(scope?.store, scope?.hubCode, { includeMovements });
}

export async function listItems(
  search?: string,
  scope?: { store: InventoryStoreSession; hubCode: string },
): Promise<InventoryItemListRow[]> {
  const { items, packs } = await all(scope, false);
  const q = search?.trim().toLowerCase();
  const rows = items
    .filter((item) => !isPackageBarcode(item.barcode))
    .map((i) => listRowLight(i, packs))
    .filter((i) => !q || [i.barcode, i.input_barcode, i.name, i.spec, i.recipient_name, i.final_destination].join(' ').toLowerCase().includes(q));
  if (!scope) return rows;
  return rows.filter((item) => isVisibleInExpressDetailsList(item, scope.store, scope.hubCode));
}

export async function getItemById(id: string): Promise<InventoryItem | null> { return cloudGetItemById(id); }

export async function getItemByBarcode(barcode: string): Promise<InventoryItem | null> {
  const code = barcode.trim().toUpperCase();
  if (!code) return null;
  const exact = await cloudGetItemByBarcode(code);
  if (exact) return exact;
  return (
    (await listItems()).find((item) => {
      const inbound = item.barcode.trim().toUpperCase();
      const express = (item.input_barcode ?? '').trim().toUpperCase();
      return inbound === code || express === code;
    }) ?? null
  );
}

export async function upsertItem(
  input: Partial<InventoryItem> & { barcode: string },
  options?: { actingStore?: InventoryStoreSession; ownerStoreCode?: string; internal?: boolean },
): Promise<InventoryItem> {
  const existing = input.id ? await getItemById(input.id) : await getItemByBarcode(input.barcode);
  const ts = nowIso();
  return cloudUpsertItem({
    ...(existing ?? {}),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    name: input.name ?? existing?.name ?? input.barcode,
    barcode: input.barcode.trim(),
    spec: input.spec ?? existing?.spec ?? '',
    unit: input.unit ?? existing?.unit ?? '件',
    weight: input.weight ?? existing?.weight ?? '',
    note: input.note ?? existing?.note ?? '',
    input_barcode: input.input_barcode?.trim() ?? existing?.input_barcode ?? '',
    qty_on_hand: input.qty_on_hand ?? existing?.qty_on_hand ?? 0,
    min_qty: input.min_qty ?? existing?.min_qty ?? 0,
    owner_store_code: options?.ownerStoreCode ?? existing?.owner_store_code ?? options?.actingStore?.storeCode ?? '',
    recipient_name: input.recipient_name ?? existing?.recipient_name ?? '',
    final_destination: input.final_destination ?? existing?.final_destination ?? '',
    created_at: existing?.created_at ?? ts,
    updated_at: ts,
  }, options?.actingStore);
}

export async function applyStockMovement(params: {
  barcode: string;
  type: MovementType;
  qty: number;
  operator: string;
  note?: string;
  destination?: string;
  originStore?: OriginStoreRef;
  inboundAt?: string;
  actingStore?: InventoryStoreSession;
  inputBarcode?: string;
  recipientName?: string;
  recipientPhone?: string;
  detailAddress?: string;
  packaging?: string;
  createIfMissing?: Partial<InventoryItem>;
}): Promise<{ item: InventoryItem; movement: StockMovement }> {
  const qty = Math.abs(Number(params.qty));
  if (!qty) throw new Error('数量必须大于 0');
  let item = await getItemByBarcode(params.barcode);
  if (!item && params.type === 'in' && params.createIfMissing) {
    const createdAt = params.inboundAt || nowIso();
    item = {
      id: newId(),
      barcode: params.barcode.trim(),
      input_barcode: params.inputBarcode ?? '',
      name: params.createIfMissing.name ?? params.barcode,
      spec: params.createIfMissing.spec ?? '',
      unit: params.createIfMissing.unit ?? '件',
      weight: params.createIfMissing.weight ?? '',
      qty_on_hand: 0,
      min_qty: 0,
      note: params.createIfMissing.note ?? '',
      owner_store_code: params.originStore?.storeCode ?? params.actingStore?.storeCode ?? '',
      recipient_name: params.recipientName ?? params.createIfMissing.recipient_name ?? '',
      final_destination: params.destination ?? params.createIfMissing.final_destination ?? '',
      created_at: createdAt,
      updated_at: createdAt,
    };
  }
  if (!item) throw new Error('未找到该商品');
  const before = item.qty_on_hand;
  const after = params.type === 'in' ? before + qty : params.type === 'out' ? before - qty : qty;
  if (after < 0) throw new Error('库存不足');
  const ts = params.inboundAt || nowIso();
  const pendingItem: InventoryItem = {
    ...item,
    qty_on_hand: after,
    input_barcode: params.inputBarcode ?? item.input_barcode,
    recipient_name: params.recipientName ?? item.recipient_name,
    final_destination: params.destination ?? item.final_destination,
    updated_at: ts,
  };
  const movement: StockMovement = {
    id: newId(), item_id: pendingItem.id, barcode: pendingItem.barcode, item_name: pendingItem.name,
    type: params.type, qty, qty_before: before, qty_after: after, operator: params.operator,
    note: params.note ?? '', recipient_name: params.recipientName ?? '', recipient_phone: params.recipientPhone ?? '',
    destination: params.destination ?? '', detail_address: params.detailAddress ?? '', packaging: params.packaging ?? '',
    input_barcode: params.inputBarcode ?? pendingItem.input_barcode,
    origin_store_id: params.originStore?.id ?? params.actingStore?.id ?? '',
    origin_store_code: params.originStore?.storeCode ?? params.actingStore?.storeCode ?? '',
    origin_store_name: params.originStore?.storeName ?? params.actingStore?.storeName ?? '',
    created_at: ts,
  };
  const saved = await applyMovement(pendingItem, movement, params.actingStore);
  movement.item_id = saved.id;
  movement.qty_after = saved.qty_on_hand;
  return { item: saved, movement };
}

export async function listPackableItems(search?: string, scope?: { store: InventoryStoreSession; hubCode: string }): Promise<InventoryItemListRow[]> {
  return (await listItems(search, scope)).filter((item) => item.qty_on_hand > 0 && !item.packed && !isPackageBarcode(item.barcode));
}

export async function createPackedShipment(params: {
  operator: string;
  originStore: OriginStoreRef;
  itemIds?: string[];
  itemLines?: { itemId: string; qty: number }[];
  bundle: { barcode: string; name: string; spec: string; unit: string; weight: string; note: string };
  actingStore?: InventoryStoreSession;
}): Promise<{ bundleItem: InventoryItem; pack: PackedShipment }> {
  const normalizedLines =
    params.itemLines ??
    (params.itemIds ?? []).map((itemId) => ({ itemId, qty: 1 }));
  if (normalizedLines.length === 0) throw new Error('选中的订单不可打包');
  const items = await Promise.all(normalizedLines.map((line) => getItemById(line.itemId)));
  if (items.some((item, i) => !item || item.qty_on_hand < normalizedLines[i].qty)) {
    throw new Error('选中的订单不可打包');
  }
  const ts = nowIso();
  const bundleItem: InventoryItem = {
    ...params.bundle,
    id: newId(),
    barcode: params.bundle.barcode.trim(),
    qty_on_hand: 1,
    min_qty: 0,
    input_barcode: '',
    owner_store_code: params.originStore.storeCode,
    created_at: ts,
    updated_at: ts,
  };
  const pack: PackedShipment = {
    id: newId(), bundle_item_id: bundleItem.id, bundle_barcode: bundleItem.barcode,
    bundle_name: bundleItem.name, operator: params.operator, note: params.bundle.note ?? '',
    owner_store_code: params.originStore.storeCode, created_at: ts,
  };
  const lines: PackedShipmentItem[] = [];
  for (let i = 0; i < normalizedLines.length; i += 1) {
    const item = items[i] as InventoryItem;
    const qty = normalizedLines[i].qty;
    lines.push({
      id: newId(), pack_id: pack.id, item_id: item.id, item_barcode: item.barcode,
      input_barcode: item.input_barcode, item_name: item.name, destination: item.final_destination ?? '',
      customer_name: item.recipient_name ?? '', owner_store_code: item.owner_store_code, qty,
    });
  }
  const savedBundle = await createPackAtomic({
    bundle: bundleItem,
    pack,
    lines,
    originStore: params.originStore,
    operationId: inventoryOperationId('pack', pack.bundle_barcode),
    store: params.actingStore,
  });
  const hubCode = params.actingStore?.hubCode || params.actingStore?.region || '';
  if (hubCode) {
    await markHubTransitOrdersRepacked(
      lines.map((line) => ({ order_barcode: line.item_barcode })),
      savedBundle.barcode,
      hubCode,
    );
  }
  return { bundleItem: savedBundle, pack: { ...pack, bundle_item_id: savedBundle.id } };
}

/** 多个入库：原子创建已打包订单（库存 0）与快递包（整包重量）。 */
export async function submitPackagingStockIn(params: {
  operator: string;
  store: InventoryStoreSession;
  destination: string;
  recipientName: string;
  recipientPhone: string;
  inboundAt: string;
  lineNote: string;
  bundle: {
    barcode: string;
    name: string;
    spec: string;
    unit: string;
    weight: string;
    note: string;
  };
  lines: { barcode: string; inputBarcode: string; name: string; qty: number }[];
}): Promise<{ bundleItem: InventoryItem }> {
  if (params.lines.length === 0) throw new Error('选中的订单不可打包');
  const dest = params.destination.trim().toUpperCase();
  if (!dest) throw new Error('请选择最终目的地');

  const storeCode = params.store.storeCode.trim().toUpperCase();
  const hub = resolveStoreHubCode(params.store);

  const rpcResult = await packagingStockInBatchAtomic({
    store: params.store,
    operationId: inventoryOperationId('packaging-stock-in', params.bundle.barcode),
    payload: {
      store_code: storeCode,
      store_name: params.store.storeName,
      operator: params.operator,
      destination: dest,
      recipient_name: params.recipientName.trim(),
      recipient_phone: params.recipientPhone.trim(),
      inbound_at: params.inboundAt,
      line_note: params.lineNote,
      bundle: {
        barcode: params.bundle.barcode.trim(),
        name: params.bundle.name,
        spec: params.bundle.spec,
        unit: params.bundle.unit,
        weight: params.bundle.weight,
        note: params.bundle.note,
      },
      lines: params.lines.map((line) => ({
        barcode: line.barcode.trim(),
        input_barcode: line.inputBarcode.trim(),
        name: line.name.trim() || line.inputBarcode.trim(),
        qty: line.qty,
      })),
    },
  });

  const bundleItem = inventoryItemFromCloudRow(rpcResult.bundleItem);
  const lineItems = rpcResult.lineItems.map(inventoryItemFromCloudRow);
  const allItems = [bundleItem, ...lineItems];
  const pack = packDetailFromCloudPackRow(rpcResult.pack, allItems);

  mergePackagingStockInIntoCache(params.store, hub, {
    bundleItem,
    pack,
    lineItems,
  });

  void refreshCache(params.store, hub, { force: true }).catch(() => {});

  return { bundleItem };
}

export async function listPackedShipments(
  search?: string,
  scope?: { store: InventoryStoreSession; hubCode: string },
): Promise<PackedShipmentDetail[]> {
  const packs = await listPacks(scope?.store, scope?.hubCode);
  const q = search?.trim().toLowerCase();
  return packs
    .filter((pack) => !q || [pack.bundle_barcode, pack.bundle_name, pack.operator, pack.note].join(' ').toLowerCase().includes(q))
    .filter((pack) => !scope || isVisibleInPackedList(pack, scope.store, scope.hubCode));
}

export async function listPackedShipmentRows(search?: string, scope?: { store: InventoryStoreSession; hubCode: string }): Promise<PackedShipmentListRow[]> {
  const packs = await listPackedShipments(search, scope);
  const statuses: Record<string, import('../types/tracking').PkgTrackingStatus | null> =
    await listPkgTrackingStatusMap(packs.map((p) => p.bundle_barcode)).catch(() => ({}));
  return packs.map((pack) => ({
    ...pack,
    cloud_status: statuses[pack.bundle_barcode.toUpperCase()] ?? null,
    display_status: resolvePackDisplayStatus(pack, statuses[pack.bundle_barcode.toUpperCase()] ?? null),
  }));
}

export async function getPackedShipmentById(id: string): Promise<PackedShipmentDetail | null> {
  return (await listPacks()).find((p) => p.id === id) ?? null;
}

export async function getPackedShipmentByBarcode(code: string): Promise<PackedShipmentDetail | null> {
  return (await listPacks()).find((p) => p.bundle_barcode.toUpperCase() === code.trim().toUpperCase()) ?? null;
}

export async function getPackedShipmentByBundleItemId(id: string): Promise<PackedShipmentDetail | null> {
  return (await listPacks()).find((p) => p.bundle_item_id === id) ?? null;
}

export async function getPackedShipmentContainingItem(id: string): Promise<PackedShipmentDetail | null> {
  return (await listPacks()).find((p) => p.items.some((line) => line.item_id === id)) ?? null;
}

export async function updatePackedShipment(packId: string, params: { bundle_name: string; spec: string; unit: string; weight: string }, actingStore?: InventoryStoreSession): Promise<void> {
  const pack = await getPackedShipmentById(packId);
  if (!pack) throw new Error('未找到快递包');
  const bundle = await getItemById(pack.bundle_item_id);
  if (!bundle) throw new Error('未找到快递包商品');
  const saved = await cloudUpsertItem({ ...bundle, name: params.bundle_name, spec: params.spec, unit: params.unit, weight: params.weight, updated_at: nowIso() }, actingStore);
  await createPack({ ...pack, bundle_name: saved.name }, pack.items, pack.loaded ? nowIso() : null, actingStore);
}

export async function applyTruckLoadOutbound(params: {
  packs: PackedShipmentDetail[];
  operator: string;
  destination: string;
  outboundDate: string;
  transportFee?: string;
  totalWeightKg?: string;
  note?: string;
  originStore?: OriginStoreRef;
  actingStore?: InventoryStoreSession;
}): Promise<{ count: number; cloudSynced: boolean; cloudError?: string; tripNumber?: string }> {
  const ts = nowIso();
  if (!params.originStore) throw svc('pkgSyncFailed');
  const tripPrefix = params.actingStore ? resolveTripNumberPrefix(params.actingStore) : 'PKG';
  const note = `装车出库\n日期 ${params.outboundDate}\n目的地 ${params.destination}${params.transportFee ? `\n车费 ${params.transportFee} MMK` : ''}`;
  const loadResult = await loadShipmentsAtomic({
    operationId: inventoryOperationId(
      'load',
      `${params.outboundDate}:${params.destination}:${params.packs
        .map((pack) => pack.bundle_barcode)
        .sort()
        .join(',')}`,
    ),
    payload: {
      loaded_at: ts,
      operator: params.operator,
      note,
      destination_code: params.destination.trim().toUpperCase(),
      outbound_date: params.outboundDate,
      trip_prefix: tripPrefix,
      origin_store_id: params.originStore.id,
      origin_store_code: params.originStore.storeCode,
      origin_store_name: params.originStore.storeName,
      packs: params.packs.map((pack) => ({
        bundle_barcode: pack.bundle_barcode,
        bundle_name: pack.bundle_name,
        destination_code: packDestinationFromBarcode(pack.bundle_barcode) || params.destination,
        weight: pack.weight ?? params.totalWeightKg ?? '',
        transport_fee: params.transportFee ?? '',
        lines: pack.items,
      })),
    },
  });
  return { count: loadResult.count, cloudSynced: true, tripNumber: loadResult.tripNumber };
}

export async function listOutboundPackages(scope?: { store: InventoryStoreSession; hubCode: string }): Promise<PackedShipmentDetail[]> {
  const packs = await listPacks(scope?.store, scope?.hubCode);
  const statuses = await listPkgTrackingStatusMap(packs.map((p) => p.bundle_barcode));
  return packs.filter((pack) =>
    canSelectPackedShipmentForTruckLoad({
      loaded: pack.loaded,
      cloud_status: statuses[pack.bundle_barcode.trim().toUpperCase()] ?? null,
    }),
  );
}

export async function cancelPackedShipment(
  packId: string,
  operator: string,
  actingStore?: InventoryStoreSession,
): Promise<{ restoredCount: number }> {
  const pack = await getPackedShipmentById(packId);
  if (!pack) throw svc('packNotFoundGeneric');
  if (pack.loaded || pack.bundle_qty_on_hand <= 0) throw svc('loadedPackCannotUnpack');

  let cloudStatus: import('../types/tracking').PkgTrackingStatus | null = null;
  try {
    const statusMap = await listPkgTrackingStatusMap([pack.bundle_barcode]);
    cloudStatus = statusMap[pack.bundle_barcode.trim().toUpperCase()] ?? null;
  } catch {
    throw svc('cannotVerifyUnpackCloud');
  }
  if (cloudStatus === 'in_transit' || cloudStatus === 'hub_received' || cloudStatus === 'completed' || cloudStatus === 'split_at_hub') {
    throw svc('packInTransitCannotUnpack');
  }
  if (!canEditPackedShipment({ loaded: pack.loaded, cloud_status: cloudStatus })) {
    throw svc('packNotEditableLoaded');
  }

  const originStore: OriginStoreRef = {
    id: actingStore?.id?.trim() || '',
    storeCode: pack.owner_store_code?.trim() || actingStore?.storeCode?.trim() || '',
    storeName: actingStore?.storeName?.trim() || '',
  };

  let restoredCount = 0;
  for (const line of pack.items) {
    const inner = await getItemById(line.item_id);
    if (!inner) continue;
    const qty = Math.max(1, line.qty || 1);
    const wasPacked =
      Boolean(inner.packed_at?.trim()) ||
      Boolean(inner.packed_bundle_barcode?.trim()) ||
      inner.qty_on_hand < qty;

    if (wasPacked) {
      await applyStockMovement({
        barcode: inner.barcode, type: 'in', qty, operator,
        note: `拆包退回 ${pack.bundle_barcode}`, originStore, actingStore,
      });
      restoredCount += 1;
    }
    await cloudUpsertItem({
      ...inner, packed_at: '', packed_bundle_barcode: '', hub_transit_shipped_at: '', updated_at: nowIso(),
    }, actingStore);
  }

  try {
    await deleteCloudPackedShipment(pack.bundle_barcode);
  } catch (e: unknown) {
    const msg = isServiceError(e) ? e.code : e instanceof Error ? e.message : 'cloudUnpackFailed';
    if (msg.includes('cloudPack') || msg.includes('无法拆包') || msg.includes('unpack')) throw e;
  }
  clearInventoryCloudCache();
  return { restoredCount };
}

function parseTruckLoadFromMovement(m: StockMovement): { outboundDate: string; destination: string } | null {
  if (!m.note.includes('装车出库')) return null;
  const dateMatch = m.note.match(/日期\s+(\d{4}-\d{2}-\d{2})/);
  const destMatch = m.note.match(/目的地\s+(\S+)/);
  return { outboundDate: dateMatch?.[1] ?? '', destination: m.destination || destMatch?.[1] || '' };
}

export async function resyncLoadedPackToCloud(packBarcode: string, actingStore: InventoryStoreSession): Promise<void> {
  const pack = await getPackedShipmentByBarcode(packBarcode);
  if (!pack) throw svc('packNotFoundResync');
  if (!pack.loaded) throw svc('packNotLoadedYet');

  const movement = await getLatestTruckLoadMovement(pack.bundle_item_id);
  if (!movement) throw svc('truckLoadRecordNotFound');

  const truckLoad = parseTruckLoadFromMovement(movement);
  if (!truckLoad?.destination?.trim()) throw svc('cannotParseTruckDest');

  const fee = pack.transport_fee?.trim() || parseTransportFeeFromLoadNote(movement.note) || '';
  const statusMap = await listPkgTrackingStatusMap([pack.bundle_barcode]);
  const cloudStatus = statusMap[pack.bundle_barcode.trim().toUpperCase()];
  if (cloudStatus && cloudStatus !== 'in_transit') {
    throw svc('cloudPkgAlreadyStatus', { statusKey: cloudStatus });
  }

  await pushTruckLoadTracking({
    originStore: actingStore,
    destinationCode: truckLoad.destination.trim(),
    outboundDate: truckLoad.outboundDate?.trim() || todayIsoDate(),
    packs: [pack],
    totalWeightKg: pack.weight ?? '',
    transportFees: { [pack.bundle_barcode]: fee },
  });
}

export async function getLatestTruckLoadMovement(id: string): Promise<StockMovement | null> {
  return (await cloudListMovementsForItem(id)).find((m) => m.type === 'out' && m.note.includes('装车出库')) ?? null;
}

export async function listMovementsForItem(id: string, limit = 10): Promise<StockMovement[]> {
  return (await cloudListMovementsForItem(id)).slice(0, limit);
}

export async function listMovements(limit = 100): Promise<StockMovement[]> {
  const { movements } = await all(undefined, true);
  return movements.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

export async function getItemDetail(id: string): Promise<InventoryItemDetail | null> {
  const item = await getItemById(id);
  if (!item) return null;
  const moves = await cloudListMovementsForItem(id);
  const inbound = moves.find((m) => m.type === 'in');
  const parsedNote = parseInboundMovementNote(inbound?.note ?? '');
  const signReceipt = item.customer_signed_at?.trim()
    ? {
        signPhone: item.customer_sign_phone?.trim() ?? '',
        pickupType: (item.customer_sign_pickup_type === 'proxy' ? 'proxy' : 'self') as CustomerSignPickupType,
        proxyName: item.customer_sign_proxy_name?.trim() || undefined,
        signatureStrokes: parseSignatureStrokes(item.customer_signature_data),
        signedByOperator: item.customer_signed_by_operator?.trim() || undefined,
        signedAt: item.customer_signed_at,
      }
    : undefined;
  return {
    ...item,
    recipient_phone: inbound?.recipient_phone ?? '',
    detail_address: inbound?.detail_address ?? '',
    packaging: inbound?.packaging ?? '',
    inbound_qty: inbound?.qty ?? 0,
    inbound_date_label: inbound?.created_at ?? '',
    inbound_store_name: inbound?.origin_store_name ?? '',
    inbound_note: parsedNote.userNote ?? inbound?.note ?? '',
    total_fee: parsedNote.totalFee,
    payment_label: parsedNote.paymentLabel,
    sign_receipt: signReceipt,
    pack: await getPackedShipmentByBundleItemId(id),
  };
}

export async function trackOrderByCode(code: string): Promise<TrackOrderResult | null> {
  const item = await getItemByBarcode(code);
  if (!item) return null;
  const detail = await getItemDetail(item.id);
  if (!detail) return null;
  const parentPack = await getPackedShipmentContainingItem(item.id);
  return {
    query: code,
    matchType: isPackageBarcode(item.barcode) ? 'package' : item.input_barcode === code ? 'express' : 'inbound',
    detail, parentPack, truckLoad: null,
    recentMovements: await listMovementsForItem(item.id, 8),
  };
}

export async function getStockInPrefillByCode(code: string) {
  const item = await getItemByBarcode(code);
  if (!item) return null;
  const detail = await getItemDetail(item.id);
  const movement = (await listMovementsForItem(item.id)).find((m) => m.type === 'in');
  return {
    item, productName: item.name, spec: item.spec, weight: item.weight,
    packaging: detail?.packaging ?? '', recipientName: item.recipient_name ?? '',
    recipientPhone: detail?.recipient_phone ?? '', destination: item.final_destination ?? '',
    detailAddress: detail?.detail_address ?? '', qty: movement?.qty ?? 1,
    note: item.note, matchLabel: item.input_barcode === code ? 'express' : 'inbound',
  };
}

export async function getItemFirstInboundDate(id: string): Promise<Date | null> {
  const m = (await cloudListMovementsForItem(id)).filter((x) => x.type === 'in').sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  return m ? new Date(m.created_at) : null;
}

export async function markCustomerSigned(
  id: string,
  operator: string,
  actingStore?: InventoryStoreSession,
  receipt?: CustomerSignReceiptInput,
): Promise<void> {
  const item = await getItemById(id);
  if (!item) throw new Error('未找到订单');
  if (!receipt) throw new Error('请填写签收人信息');
  const validationError = validateCustomerSignReceipt(receipt);
  if (validationError) throw new Error(validationError);

  await cloudUpsertItem({
    ...item,
    customer_signed_at: nowIso(),
    qty_on_hand: 0,
    packed_at: '',
    packed_bundle_barcode: '',
    customer_sign_phone: receipt.signPhone.trim(),
    customer_sign_pickup_type: receipt.pickupType,
    customer_sign_proxy_name: receipt.pickupType === 'proxy' ? receipt.proxyName?.trim() ?? '' : '',
    customer_signature_data: serializeSignatureStrokes(receipt.signatureStrokes),
    customer_signed_by_operator: operator.trim(),
    updated_at: nowIso(),
  }, actingStore);
}

export async function updateItemInboundProfile(
  id: string,
  params: {
    name: string;
    spec: string;
    unit: string;
    weight: string;
    note: string;
    packaging: string;
    recipientName: string;
    recipientPhone: string;
    destination: string;
  },
  actingStore: InventoryStoreSession,
  hubCode?: string,
): Promise<void> {
  const allowed = await canEditItemCustomerProfileForStore(actingStore, id, hubCode);
  if (!allowed) throw svc('editDeniedHubReceived');
  const item = await getItemById(id);
  if (!item) throw svc('orderNotFoundOrDeleted');
  await cloudUpsertItem({
    ...item,
    name: params.name,
    spec: params.spec,
    unit: params.unit,
    weight: params.weight,
    note: params.note,
    recipient_name: params.recipientName,
    final_destination: params.destination,
    updated_at: nowIso(),
  }, actingStore);
}

export async function cancelInventoryItem(
  id: string,
  operator: string,
  actingStore?: InventoryStoreSession,
): Promise<void> {
  const item = await getItemById(id);
  if (!item) throw svc('orderNotFoundOrDeleted');
  const pack = await getPackedShipmentByBundleItemId(id);
  if (pack) {
    await cancelPackedShipment(pack.id, operator, actingStore);
    return;
  }
  await deleteCloudPackedShipment(item.barcode);
  clearInventoryCloudCache();
}

export async function getStats(scope?: { store: InventoryStoreSession; hubCode: string }) {
  const [{ items, packs }, { todayIn, todayOut }] = await Promise.all([
    all(scope, false),
    fetchCloudTodayMovementTotals(),
  ]);
  return {
    itemCount: items.length,
    totalQty: items.reduce((n, i) => n + i.qty_on_hand, 0),
    lowStockCount: items.filter((i) => i.min_qty > 0 && i.qty_on_hand <= i.min_qty).length,
    todayIn,
    todayOut,
    packCount: packs.length,
  };
}

export async function resolveItemOwnerStoreCode(id: string): Promise<string> {
  return (await getItemById(id))?.owner_store_code ?? '';
}

export async function resolvePackOwnerStoreCode(id: string): Promise<string> {
  return (await getPackedShipmentById(id))?.owner_store_code ?? '';
}

export async function canEditItemCustomerProfileForStore(
  actingStore: InventoryStoreSession,
  itemId: string,
  hubCode?: string,
): Promise<boolean> {
  const item = await getItemById(itemId);
  if (!item) return false;
  return canEditItemCustomerProfileAsync(actingStore, item, hubCode);
}

export async function generatePackageNumber(
  destination: string,
  itemCount: number,
  originPrefix = 'PKG',
): Promise<string> {
  const dest = destination.trim();
  if (!dest) throw svc('selectDestination');
  if (itemCount <= 0) throw svc('selectAtLeastOneItem');
  const body = buildPackageNumberBody(dest, itemCount, originPrefix);
  const packs = await listPacks();
  let maxSeq = 0;
  for (const pack of packs) {
    const parsed = parsePackageBarcode(pack.bundle_barcode);
    if (parsed && pack.bundle_barcode.toUpperCase().startsWith(body.toUpperCase())) {
      maxSeq = Math.max(maxSeq, Number(parsed.sequence) || 0);
    }
  }
  let seq = maxSeq + 1;
  for (let i = 0; i < 50; i += 1) {
    const candidate = `${body}${formatPackageSequence(seq)}`;
    const taken = packs.some((p) => p.bundle_barcode.toUpperCase() === candidate.toUpperCase());
    const itemTaken = await getItemByBarcode(candidate);
    if (!taken && !itemTaken) return candidate;
    seq += 1;
  }
  throw svc('cannotGeneratePackNo');
}

export async function syncInboundHubPacksToLocal(
  store: InventoryStoreSession,
  hubCode: string,
  operator: string,
): Promise<number> {
  return hubSyncInbound(hubOps, store, hubCode, operator);
}

export async function importInboundPackToLocal(
  detail: PkgTrackingDetail,
  store: InventoryStoreSession,
  operator: string,
): Promise<boolean> {
  return hubImportPack(hubOps, detail, store, operator);
}

export async function deliverHubOrderInboundAtStation(params: {
  order: OrderTrackingRecord;
  pkg: PkgTrackingDetail;
  store: InventoryStoreSession;
  hubCode: string;
  operator: string;
}): Promise<void> {
  return hubDeliverOrder(hubOps, params);
}

export async function maybeAutoReleaseTransitAfterAllInbound(params: {
  packBarcode: string;
  store: InventoryStoreSession;
  hubCode: string;
  operator: string;
}): Promise<{ releasedCount: number }> {
  return hubMaybeAutoRelease(hubOps, params);
}

export async function releaseHubTransitOrders(params: {
  packBarcode: string;
  store: InventoryStoreSession;
  hubCode: string;
  operator: string;
  allowCompleted?: boolean;
}): Promise<{ releasedCount: number }> {
  return hubReleaseTransit(hubOps, params);
}
