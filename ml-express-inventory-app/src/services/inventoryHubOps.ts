import type { InventoryItem, PackedShipment, PackedShipmentItem, StockMovement } from '../types/inventory';
import type { OrderTrackingRecord, PkgTrackingDetail } from '../types/tracking';
import type { InventoryStoreSession } from './authService';
import { normalizePackDestination } from '../constants/destinationOptions';
import { newId, nowIso } from './database';
import {
  clearInventoryCloudCache,
  createPack,
  itemHasMovementType,
  upsertItem as cloudUpsertItem,
} from './inventoryCloudStore';
import { resolveOrderDestinationCode } from '../utils/orderDestination';
import { resolveStoreHubCode } from '../utils/storeZone';
import { shouldPersistInboundOrderAtHub } from '../utils/expressDetailsVisibility';
import { inventoryOperationId } from '../utils/inventoryReliability';

export type OriginStoreRef = { id: string; storeCode: string; storeName: string };

const importInboundPackInFlight = new Map<string, Promise<boolean>>();

function hubDeliverOperationId(packBarcode: string, orderBarcode: string): string {
  return inventoryOperationId(
    'hub-deliver',
    `${packBarcode.trim().toUpperCase()}:${orderBarcode.trim().toUpperCase()}`,
  );
}

function hubPackBundleInboundOperationId(packBarcode: string): string {
  return inventoryOperationId('hub-pack-in', packBarcode.trim().toUpperCase());
}

type StockOps = {
  upsertItem: (
    input: Partial<InventoryItem> & { barcode: string },
    options?: { ownerStoreCode?: string; actingStore?: InventoryStoreSession },
  ) => Promise<InventoryItem>;
  applyStockMovement: (params: {
    barcode: string;
    type: 'in' | 'out' | 'adjust';
    qty: number;
    operator: string;
    note?: string;
    destination?: string;
    originStore?: OriginStoreRef;
    inboundAt?: string;
    actingStore?: InventoryStoreSession;
    inputBarcode?: string;
    recipientName?: string;
    operationId?: string;
  }) => Promise<{ item: InventoryItem; movement: StockMovement }>;
  getItemByBarcode: (barcode: string) => Promise<InventoryItem | null>;
  getItemById: (id: string) => Promise<InventoryItem | null>;
  getPackedShipmentByBarcode: (code: string) => Promise<import('../types/inventory').PackedShipmentDetail | null>;
};

function persistFinalDestinationCode(raw: string): string {
  const normalized = normalizePackDestination(raw);
  if (normalized) return normalized;
  return raw.trim().toUpperCase().slice(0, 3);
}

async function patchItem(
  item: InventoryItem,
  patch: Partial<InventoryItem>,
  store?: InventoryStoreSession,
): Promise<InventoryItem> {
  return cloudUpsertItem({ ...item, ...patch, updated_at: nowIso() }, store);
}

async function hasInboundMovement(item: InventoryItem): Promise<boolean> {
  if (item.qty_on_hand >= 1) return true;
  return itemHasMovementType(item.id, 'in');
}

async function upsertInboundSnapshotFromHubOrder(
  ops: StockOps,
  params: {
    item: InventoryItem;
    order: OrderTrackingRecord;
    detail: PkgTrackingDetail;
    operator: string;
    hubArrivedAt: string;
    actingStore?: InventoryStoreSession;
  },
): Promise<void> {
  const inboundAt =
    params.order.inbound_at?.trim() ||
    params.hubArrivedAt.trim() ||
    params.detail.hub_received_at?.trim() ||
    nowIso();
  const snapshot = {
    recipientName: params.order.recipient_name?.trim() || '',
    recipientPhone: params.order.recipient_phone?.trim() || '',
    destination: params.order.destination_code?.trim() || '',
    detailAddress: params.order.detail_address?.trim() || '',
    packaging: params.order.packaging?.trim() || '',
    inputBarcode: params.order.express_barcode?.trim() || '',
    note: params.order.inbound_note?.trim() || '',
  };
  let item = params.item;
  if (snapshot.recipientName) {
    item = await patchItem(item, { recipient_name: snapshot.recipientName }, params.actingStore);
  }
  if (!(await hasInboundMovement(item))) {
    await ops.applyStockMovement({
      barcode: item.barcode,
      type: 'in',
      qty: Math.max(1, params.order.qty || 1),
      operator: params.operator,
      note: snapshot.note || `到站入库 · 包 ${params.detail.pack_barcode}`,
      destination: snapshot.destination || item.final_destination,
      inputBarcode: snapshot.inputBarcode || item.input_barcode,
      recipientName: snapshot.recipientName,
      originStore: {
        id: params.detail.origin_store_id?.trim() || '',
        storeCode: params.detail.origin_store_code?.trim() || '',
        storeName: params.order.inbound_store_name?.trim() || params.detail.origin_store_name?.trim() || '',
      },
      inboundAt,
      actingStore: params.actingStore,
      operationId: hubDeliverOperationId(params.detail.pack_barcode, params.order.order_barcode),
    });
  }
}

export async function hasHubTransitInboundAtStation(item: InventoryItem): Promise<boolean> {
  return itemHasMovementType(item.id, 'in', /中转站到站|中转站释放/);
}

export async function deliverLocalHubOrderToInventory(
  ops: StockOps,
  params: {
    order: OrderTrackingRecord;
    pkg: PkgTrackingDetail;
    store: InventoryStoreSession;
    hubCode: string;
    operator: string;
  },
): Promise<void> {
  const hub = params.hubCode.trim().toUpperCase();
  const orderDest = resolveOrderDestinationCode(params.order);
  if (orderDest !== hub) throw new Error(`订单目的地 ${orderDest || '?'} 不是本站 ${hub}`);

  let item = await ops.getItemByBarcode(params.order.order_barcode);
  if (item?.customer_signed_at?.trim()) return;

  const hubArrivedAt =
    params.order.hub_received_at?.trim() ||
    params.pkg.hub_received_at?.trim() ||
    nowIso();
  const originStore: OriginStoreRef = {
    id: params.pkg.origin_store_id?.trim() || '',
    storeCode: params.pkg.origin_store_code?.trim() || '',
    storeName: params.pkg.origin_store_name?.trim() || '',
  };

  if (!item) {
    item = await ops.upsertItem(
      {
        barcode: params.order.order_barcode,
        name: params.order.order_name?.trim() || params.order.order_barcode,
        spec: params.order.spec?.trim() || '',
        unit: `${params.order.qty || 1} Pcs`,
        weight: params.order.weight?.trim() || '',
        min_qty: 0,
        note: `到站交付 · 包 ${params.pkg.pack_barcode}`,
        input_barcode: params.order.express_barcode?.trim() || '',
        qty_on_hand: 0,
      },
      { ownerStoreCode: params.pkg.origin_store_code?.trim() || params.store.storeCode, actingStore: params.store },
    );
  }

  const childDest = persistFinalDestinationCode(params.order.destination_code || orderDest);
  item = await patchItem(
    item,
    {
      hub_arrived_at: hubArrivedAt,
      ...(params.order.recipient_name?.trim() ? { recipient_name: params.order.recipient_name.trim() } : {}),
      ...(childDest ? { final_destination: childDest, destination: childDest } : {}),
    },
    params.store,
  );

  await upsertInboundSnapshotFromHubOrder(ops, {
    item,
    order: params.order,
    detail: params.pkg,
    operator: params.operator,
    hubArrivedAt,
    actingStore: params.store,
  });

  const refreshed = await ops.getItemById(item.id);
  if (refreshed && refreshed.qty_on_hand < 1) {
    await ops.applyStockMovement({
      barcode: refreshed.barcode,
      type: 'in',
      qty: Math.max(1, params.order.qty || 1),
      operator: params.operator,
      note: `到站交付确认 · 包 ${params.pkg.pack_barcode}`,
      destination: orderDest,
      originStore,
      inboundAt: hubArrivedAt,
      actingStore: params.store,
      operationId: hubDeliverOperationId(params.pkg.pack_barcode, params.order.order_barcode),
    });
  }
}

export async function deliverTransitOrderAtHubStation(
  ops: StockOps,
  params: {
    order: OrderTrackingRecord;
    pkg: PkgTrackingDetail;
    store: InventoryStoreSession;
    hubCode: string;
    operator: string;
  },
): Promise<void> {
  const hub = params.hubCode.trim().toUpperCase();
  const orderDest = resolveOrderDestinationCode(params.order);
  if (!orderDest || orderDest === hub) return;
  if (params.order.status === 'released_at_hub') return;

  let item = await ops.getItemByBarcode(params.order.order_barcode);
  if (item && (await hasHubTransitInboundAtStation(item)) && item.qty_on_hand >= 1) return;

  const hubStationAt =
    params.pkg.hub_received_at?.trim() ||
    params.order.hub_received_at?.trim() ||
    nowIso();
  const originStore: OriginStoreRef = {
    id: params.pkg.origin_store_id?.trim() || params.store.id,
    storeCode: params.pkg.origin_store_code?.trim() || params.store.storeCode,
    storeName: params.pkg.origin_store_name?.trim() || params.store.storeName,
  };

  if (!item) {
    item = await ops.upsertItem(
      {
        barcode: params.order.order_barcode,
        name: params.order.order_name?.trim() || params.order.order_barcode,
        spec: params.order.spec?.trim() || '',
        unit: `${params.order.qty || 1} Pcs`,
        weight: params.order.weight?.trim() || '',
        min_qty: 0,
        note: `中转站到站 · 包 ${params.pkg.pack_barcode}`,
        input_barcode: params.order.express_barcode?.trim() || '',
        qty_on_hand: 0,
      },
      { ownerStoreCode: params.pkg.origin_store_code?.trim() || params.store.storeCode, actingStore: params.store },
    );
  }

  const childDest = persistFinalDestinationCode(params.order.destination_code || orderDest);
  item = await patchItem(
    item,
    {
      ...(params.order.recipient_name?.trim() ? { recipient_name: params.order.recipient_name.trim() } : {}),
      ...(childDest ? { final_destination: childDest, destination: childDest } : {}),
    },
    params.store,
  );

  if (item.qty_on_hand < 1) {
    await ops.applyStockMovement({
      barcode: item.barcode,
      type: 'in',
      qty: Math.max(1, params.order.qty || 1),
      operator: params.operator,
      note: `中转站到站收货 · 包 ${params.pkg.pack_barcode}`,
      destination: orderDest,
      originStore,
      inboundAt: hubStationAt,
      actingStore: params.store,
      operationId: hubDeliverOperationId(params.pkg.pack_barcode, params.order.order_barcode),
    });
  }
}

type TransitRepackRestoreInput = {
  orderBarcode: string;
  expressBarcode?: string;
  orderName?: string;
  orderDest: string;
  qty: number;
  spec?: string;
  weight?: string;
  recipientName?: string;
  packBarcode: string;
  operator: string;
  originStore: OriginStoreRef;
  ownerStoreCode: string;
  actingStore: InventoryStoreSession;
};

async function restoreTransitOrderForRepack(
  ops: StockOps,
  input: TransitRepackRestoreInput,
): Promise<boolean> {
  const ts = nowIso();
  const orderBarcode = input.orderBarcode.trim();
  if (!orderBarcode) return false;

  let item = await ops.getItemByBarcode(orderBarcode);
  if (item?.hub_transit_released_at?.trim() && item.qty_on_hand >= 1) return false;

  if (!item) {
    item = await ops.upsertItem(
      {
        barcode: orderBarcode,
        name: input.orderName?.trim() || orderBarcode,
        spec: input.spec?.trim() || '',
        unit: `${Math.max(1, input.qty || 1)} Pcs`,
        weight: input.weight?.trim() || '',
        min_qty: 0,
        note: `中转释放 · 原包 ${input.packBarcode}`,
        input_barcode: input.expressBarcode?.trim() || '',
        qty_on_hand: 0,
      },
      { ownerStoreCode: input.ownerStoreCode, actingStore: input.actingStore },
    );
  }

  const patch: Partial<InventoryItem> = {
    packed_at: '',
    packed_bundle_barcode: '',
    hub_transit_released_at: ts,
    updated_at: ts,
  };
  if (input.orderDest) {
    const code = persistFinalDestinationCode(input.orderDest);
    patch.final_destination = code;
    patch.destination = code;
  }
  if (input.recipientName?.trim()) patch.recipient_name = input.recipientName.trim();
  item = await patchItem(item, patch, input.actingStore);

  if (item.qty_on_hand < 1) {
    await ops.applyStockMovement({
      barcode: orderBarcode,
      type: 'in',
      qty: Math.max(1, input.qty || 1),
      operator: input.operator,
      note: `中转站释放待转出 · 原包 ${input.packBarcode}`,
      destination: input.orderDest,
      originStore: input.originStore,
      actingStore: input.actingStore,
    });
  }
  return true;
}

export async function releaseHubTransitOrders(
  ops: StockOps,
  params: {
    packBarcode: string;
    store: InventoryStoreSession;
    hubCode: string;
    operator: string;
    allowCompleted?: boolean;
  },
): Promise<{ releasedCount: number }> {
  const { releaseTransitOrdersAtHub } = await import('./trackingService');
  const pkg = await releaseTransitOrdersAtHub(
    params.packBarcode,
    params.store,
    params.hubCode,
    { allowCompleted: params.allowCompleted },
  );

  const hub = params.hubCode.trim().toUpperCase();
  const released = pkg.orders.filter(
    (o) => o.status === 'released_at_hub' && resolveOrderDestinationCode(o) !== hub,
  );
  if (released.length === 0) return { releasedCount: 0 };

  const originStore: OriginStoreRef = {
    id: pkg.origin_store_id?.trim() || params.store.id,
    storeCode: pkg.origin_store_code?.trim() || params.store.storeCode,
    storeName: pkg.origin_store_name?.trim() || params.store.storeName,
  };
  const ownerStoreCode = pkg.origin_store_code?.trim() || params.store.storeCode;

  let restoredCount = 0;
  for (const order of released) {
    const ok = await restoreTransitOrderForRepack(ops, {
      orderBarcode: order.order_barcode,
      expressBarcode: order.express_barcode,
      orderName: order.order_name,
      orderDest: resolveOrderDestinationCode(order),
      qty: order.qty,
      spec: order.spec,
      weight: order.weight,
      recipientName: order.recipient_name,
      packBarcode: params.packBarcode,
      operator: params.operator,
      originStore,
      ownerStoreCode,
      actingStore: params.store,
    });
    if (ok) restoredCount += 1;
  }
  return { releasedCount: restoredCount };
}

export async function maybeAutoReleaseTransitAfterAllInbound(
  ops: StockOps,
  params: {
    packBarcode: string;
    store: InventoryStoreSession;
    hubCode: string;
    operator: string;
  },
): Promise<{ releasedCount: number }> {
  const { getPkgTrackingDetail } = await import('./trackingService');
  const detail = await getPkgTrackingDetail(params.packBarcode);
  if (!detail) return { releasedCount: 0 };

  const hub = params.hubCode.trim().toUpperCase();
  const hasTransit = detail.orders.some((o) => resolveOrderDestinationCode(o) !== hub);
  if (!hasTransit) return { releasedCount: 0 };
  if (!detail.orders.every((o) => o.status === 'hub_received')) return { releasedCount: 0 };
  if (detail.orders.some((o) => o.status === 'released_at_hub')) return { releasedCount: 0 };

  return releaseHubTransitOrders(ops, { ...params, allowCompleted: true });
}

export async function deliverHubOrderInboundAtStation(
  ops: StockOps,
  params: {
    order: OrderTrackingRecord;
    pkg: PkgTrackingDetail;
    store: InventoryStoreSession;
    hubCode: string;
    operator: string;
  },
): Promise<void> {
  const hub = params.hubCode.trim().toUpperCase();
  const orderDest = resolveOrderDestinationCode(params.order);
  if (orderDest === hub) {
    await deliverLocalHubOrderToInventory(ops, params);
    return;
  }
  if (orderDest && orderDest !== hub) {
    await deliverTransitOrderAtHubStation(ops, params);
    return;
  }
  throw new Error(`无法解析订单 ${params.order.order_barcode} 的目的地`);
}

/** 确认到站后：本站目的地订单自动交付至「快递明细」，无需弹窗逐单点「入库」 */
export async function autoDeliverLocalHubOrdersOnPackReceived(
  ops: StockOps,
  params: {
    packBarcode: string;
    store: InventoryStoreSession;
    hubCode: string;
    operator: string;
    knownPkg?: PkgTrackingDetail;
  },
): Promise<PkgTrackingDetail> {
  const { confirmOrderInPackById, getPkgTrackingDetail } = await import('./trackingService');
  let pkg = params.knownPkg ?? (await getPkgTrackingDetail(params.packBarcode));
  if (!pkg) throw new Error(`未找到快递包 ${params.packBarcode}`);

  const hub = params.hubCode.trim().toUpperCase();
  for (const order of pkg.orders) {
    const orderDest = resolveOrderDestinationCode(order);
    if (orderDest !== hub || order.status !== 'in_transit') continue;
    const result = await confirmOrderInPackById(order.id, params.store, hub, { pkg, order });
    await deliverHubOrderInboundAtStation(ops, {
      order: result.order,
      pkg: result.pkg,
      store: params.store,
      hubCode: hub,
      operator: params.operator,
    });
    pkg = result.pkg;
  }

  return (await getPkgTrackingDetail(params.packBarcode)) ?? pkg;
}

export async function importInboundPackToLocal(
  ops: StockOps,
  detail: PkgTrackingDetail,
  store: InventoryStoreSession,
  operator: string,
): Promise<boolean> {
  const packCode = detail.pack_barcode.trim().toUpperCase();
  if (!packCode) return false;

  const inflight = importInboundPackInFlight.get(packCode);
  if (inflight) return inflight;

  const promise = importInboundPackToLocalOnce(ops, detail, store, operator).finally(() => {
    importInboundPackInFlight.delete(packCode);
  });
  importInboundPackInFlight.set(packCode, promise);
  return promise;
}

async function importInboundPackToLocalOnce(
  ops: StockOps,
  detail: PkgTrackingDetail,
  store: InventoryStoreSession,
  operator: string,
): Promise<boolean> {
  const inboundStatuses: PkgTrackingDetail['status'][] = ['hub_received', 'split_at_hub', 'completed'];
  if (!inboundStatuses.includes(detail.status)) return false;

  const hub = resolveStoreHubCode(store);
  const legDest =
    detail.leg_destination_code?.trim().toUpperCase() ||
    detail.destination_code?.trim().toUpperCase() ||
    '';
  if (legDest && legDest !== hub) return false;

  const packBarcode = detail.pack_barcode.trim().toUpperCase();
  const packNote = `到站收货 · ${detail.origin_store_code} → ${detail.destination_code}`;
  const hubOrigin: OriginStoreRef = {
    id: store.id,
    storeCode: store.storeCode,
    storeName: store.storeName,
  };
  const ts = detail.hub_received_at?.trim() || nowIso();
  const transportFee = detail.transport_fee?.trim() || '';
  const legDestPersist = legDest || detail.destination_code?.trim().toUpperCase() || '';

  let packId = '';
  let created = false;
  const existing = await ops.getPackedShipmentByBarcode(packBarcode);

  if (existing) {
    packId = existing.id;
    if (transportFee || legDestPersist) {
      await createPack(
        { ...existing, transport_fee: transportFee, truck_leg_destination: legDestPersist },
        existing.items,
        existing.loaded ? ts : null,
        store,
      );
    }
  } else {
    let bundleItem = await ops.getItemByBarcode(packBarcode);
    if (!bundleItem) {
      bundleItem = await ops.upsertItem(
        {
          barcode: packBarcode,
          name: detail.pack_name?.trim() || packBarcode,
          spec: '',
          unit: `${detail.item_count} Pcs`,
          weight: detail.total_weight?.trim() || '',
          min_qty: 0,
          note: packNote,
          qty_on_hand: 0,
        },
        { ownerStoreCode: store.storeCode, actingStore: store },
      );
    }

    if (bundleItem.qty_on_hand < 1) {
      await ops.applyStockMovement({
        barcode: packBarcode,
        type: 'in',
        qty: 1,
        operator,
        note: `到站收货入库 · 内含 ${detail.item_count} 件`,
        destination: detail.destination_code,
        originStore: hubOrigin,
        inboundAt: detail.hub_received_at ?? undefined,
        actingStore: store,
        operationId: hubPackBundleInboundOperationId(packBarcode),
      });
      bundleItem = (await ops.getItemByBarcode(packBarcode))!;
    }

    packId = newId();
    const pack: PackedShipment = {
      id: packId,
      bundle_item_id: bundleItem.id,
      bundle_barcode: packBarcode,
      bundle_name: detail.pack_name?.trim() || packBarcode,
      operator,
      note: packNote,
      owner_store_code: store.storeCode,
      created_at: ts,
    };
    await createPack(pack, [], null, store);
    created = true;
  }

  if (!packId) return false;

  const originOwnerCode = detail.origin_store_code?.trim() || store.storeCode;
  const originStore: OriginStoreRef = {
    id: detail.origin_store_id?.trim() || store.id,
    storeCode: originOwnerCode,
    storeName: detail.origin_store_name?.trim() || store.storeName,
  };

  const packLines: PackedShipmentItem[] = [];
  const existingPack = await ops.getPackedShipmentByBarcode(packBarcode);

  for (const order of detail.orders) {
    const orderName = order.order_name?.trim() || order.order_barcode;
    const orderDest = resolveOrderDestinationCode(order);
    if (!shouldPersistInboundOrderAtHub(order.destination_code || orderDest || '', store, hub, originOwnerCode)) {
      continue;
    }

    const isLocal = orderDest === hub;
    let childItem = await ops.getItemByBarcode(order.order_barcode);
    if (!childItem) {
      childItem = await ops.upsertItem(
        {
          barcode: order.order_barcode,
          name: orderName,
          spec: order.spec?.trim() || '',
          unit: `${order.qty || 1} Pcs`,
          weight: order.weight?.trim() || '',
          min_qty: 0,
          note: packNote,
          input_barcode: order.express_barcode?.trim() || '',
          qty_on_hand: 0,
        },
        { ownerStoreCode: originOwnerCode, actingStore: store },
      );
    }

    const childDest = persistFinalDestinationCode(order.destination_code || orderDest || '');
    const hubArrivedAt = order.status === 'hub_received' && isLocal ? order.hub_received_at?.trim() || ts : '';
    childItem = await patchItem(
      childItem,
      {
        name: orderName,
        spec: order.spec?.trim() || childItem.spec,
        unit: `${order.qty || 1} Pcs`,
        weight: order.weight?.trim() || childItem.weight,
        input_barcode: order.express_barcode?.trim() || childItem.input_barcode,
        ...(hubArrivedAt ? { hub_arrived_at: hubArrivedAt } : {}),
        ...(order.recipient_name?.trim() ? { recipient_name: order.recipient_name.trim() } : {}),
        ...(childDest ? { final_destination: childDest, destination: childDest } : {}),
      },
      store,
    );

    const shouldLink = !isLocal && order.status === 'in_transit';
    if (shouldLink) {
      packLines.push({
        id: newId(),
        pack_id: packId,
        item_id: childItem.id,
        item_barcode: order.order_barcode,
        input_barcode: childItem.input_barcode,
        item_name: orderName,
        destination: childDest,
        customer_name: order.recipient_name ?? '',
        owner_store_code: originOwnerCode,
        qty: order.qty || 1,
      });
    }

    if (order.status === 'hub_received' && isLocal) {
      const existing = await ops.getItemByBarcode(order.order_barcode);
      if (!existing?.customer_signed_at?.trim()) {
        await deliverLocalHubOrderToInventory(ops, { order, pkg: detail, store, hubCode: hub, operator });
      }
    } else if (!isLocal && order.status === 'hub_received') {
      await deliverTransitOrderAtHubStation(ops, { order, pkg: detail, store, hubCode: hub, operator });
    } else if (order.status === 'released_at_hub' && !isLocal) {
      await restoreTransitOrderForRepack(ops, {
        orderBarcode: order.order_barcode,
        expressBarcode: order.express_barcode,
        orderName: order.order_name,
        orderDest,
        qty: order.qty,
        spec: order.spec,
        weight: order.weight,
        recipientName: order.recipient_name,
        packBarcode: detail.pack_barcode,
        operator,
        originStore,
        ownerStoreCode: originOwnerCode,
        actingStore: store,
      });
    }
  }

  const mergedLines = packLines;
  const packRow = existingPack ?? (await ops.getPackedShipmentByBarcode(packBarcode));
  if (packRow) {
    await createPack(
      { ...packRow, transport_fee: transportFee || packRow.transport_fee, truck_leg_destination: legDestPersist || packRow.truck_leg_destination },
      mergedLines,
      packRow.loaded ? ts : null,
      store,
    );
  }

  await maybeAutoReleaseTransitAfterAllInbound(ops, {
    packBarcode,
    store,
    hubCode: hub,
    operator,
  });

  return created;
}

export async function syncInboundHubPacksToLocal(
  ops: StockOps,
  store: InventoryStoreSession,
  hubCode: string,
  operator: string,
): Promise<number> {
  const { listInboundPackages } = await import('./trackingService');
  const inbound = await listInboundPackages(hubCode, ['hub_received', 'completed', 'split_at_hub']);
  let imported = 0;
  for (const pkg of inbound) {
    if (await importInboundPackToLocal(ops, pkg, store, operator)) imported += 1;
  }
  clearInventoryCloudCache();
  return imported;
}
