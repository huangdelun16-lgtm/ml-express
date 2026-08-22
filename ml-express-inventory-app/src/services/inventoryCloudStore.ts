import type {
  InventoryItem,
  PackedShipment,
  PackedShipmentDetail,
  PackedShipmentItem,
  StockMovement,
} from '../types/inventory';
import { ensureInventoryCloudAuth, type InventoryStoreSession } from './authService';
import { svc } from '../errors/serviceError';
import { packDestinationFromBarcode } from '../utils/packageNumber';
import { resolveStoreHubCode } from '../utils/storeZone';
import {
  applyCloudStockMovementAtomic,
  createCloudPackedShipmentAtomic,
  deleteCloudPackedShipment,
  fetchCloudMovementsForItems,
  fetchCloudPackByBarcode,
  fetchCloudPackDetailByBarcode,
  fetchCloudPackedShipments,
  fetchCloudStoreItems,
  getCloudItemIdByBarcode,
  insertCloudStockMovement,
  loadCloudShipmentsAtomic,
  upsertCloudPackedShipment,
  upsertCloudStoreItem,
  type CloudPackRow,
  type CloudStoreItemRow,
} from './inventoryCloudApi';
import { isCloudReachable } from '../utils/networkReachability';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from './supabase';

export type InventoryCache = { items: InventoryItem[]; movements: StockMovement[]; packs: PackedShipmentDetail[] };

type CacheScope = { storeCode: string; hubCode: string };

type RefreshOptions = {
  force?: boolean;
  /** 列表页默认 false，详情/统计页再按需拉流水 */
  includeMovements?: boolean;
};

let cache: InventoryCache | null = null;
let cacheScope: CacheScope | null = null;
let cacheFetchedAt = 0;
let cacheHasMovements = false;
let refreshPromise: Promise<InventoryCache> | null = null;

/** 内存缓存有效期：此时间内复用数据，避免每次进页面全量拉 Supabase */
const CACHE_TTL_MS = 45_000;

const PLATFORM_WIPE_KEY = 'inventory.platform_test_data_cleared_at';
const PLATFORM_WIPE_ACK = '@inventory_ack_test_data_cleared_at';

function resolveScope(store: InventoryStoreSession, hubCode?: string): CacheScope {
  const hub = (hubCode?.trim() || resolveStoreHubCode(store)).trim().toUpperCase();
  return {
    storeCode: store.storeCode.trim().toUpperCase(),
    hubCode: hub,
  };
}

function mergeInventoryItem(prev: InventoryItem | undefined, incoming: InventoryItem): InventoryItem {
  if (!prev) return incoming;
  const prevPacked = Boolean(prev.packed_at?.trim()) || Boolean(prev.packed_bundle_barcode?.trim());
  const incomingPacked = Boolean(incoming.packed_at?.trim()) || Boolean(incoming.packed_bundle_barcode?.trim());
  if (prevPacked && !incomingPacked && incoming.qty_on_hand > 0) {
    return {
      ...incoming,
      qty_on_hand: prev.qty_on_hand,
      packed_at: prev.packed_at,
      packed_bundle_barcode: prev.packed_bundle_barcode,
      updated_at: prev.updated_at,
    };
  }
  if (incoming.updated_at >= prev.updated_at) return incoming;
  return prev;
}

function mergeInventoryCaches(existing: InventoryCache, incoming: InventoryCache): InventoryCache {
  const itemMap = new Map(existing.items.map((item) => [item.barcode.trim().toUpperCase(), item]));
  for (const item of incoming.items) {
    const key = item.barcode.trim().toUpperCase();
    itemMap.set(key, mergeInventoryItem(itemMap.get(key), item));
  }

  const packMap = new Map(existing.packs.map((pack) => [pack.bundle_barcode.trim().toUpperCase(), pack]));
  for (const pack of incoming.packs) {
    const key = pack.bundle_barcode.trim().toUpperCase();
    const prev = packMap.get(key);
    if (!prev || pack.created_at >= prev.created_at) packMap.set(key, pack);
  }

  return {
    items: Array.from(itemMap.values()),
    packs: Array.from(packMap.values()),
    movements: incoming.movements.length > 0 ? incoming.movements : existing.movements,
  };
}

function scopeMatches(a: CacheScope | null, b: CacheScope | null): boolean {
  return Boolean(a && b && a.storeCode === b.storeCode && a.hubCode === b.hubCode);
}

function isCacheFresh(scope: CacheScope, force: boolean): boolean {
  if (force || !cache || !scopeMatches(cacheScope, scope)) return false;
  return Date.now() - cacheFetchedAt < CACHE_TTL_MS;
}

async function applyPlatformWipeIfPending(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { data, error } = await supabase
    .from('system_settings')
    .select('settings_value')
    .eq('settings_key', PLATFORM_WIPE_KEY)
    .maybeSingle();
  if (error || !data) return;
  const raw = data.settings_value;
  const cloudTs = typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : String(raw ?? '').trim();
  if (!cloudTs) return;
  const ack = await AsyncStorage.getItem(PLATFORM_WIPE_ACK);
  if (ack === cloudTs) return;
  cache = null;
  cacheScope = null;
  cacheFetchedAt = 0;
  cacheHasMovements = false;
  await AsyncStorage.setItem(PLATFORM_WIPE_ACK, cloudTs);
}

function rowToItem(row: CloudStoreItemRow): InventoryItem {
  return {
    id: row.id, barcode: row.barcode, input_barcode: row.input_barcode, name: row.name,
    spec: row.spec, unit: row.unit, weight: row.weight, qty_on_hand: row.qty_on_hand,
    min_qty: row.min_qty, note: row.note, owner_store_code: row.owner_store_code,
    recipient_name: row.recipient_name, customer_name: row.recipient_name,
    final_destination: row.final_destination, destination: row.final_destination,
    hub_arrived_at: row.hub_arrived_at ?? '', customer_signed_at: row.customer_signed_at ?? '',
    customer_sign_phone: row.customer_sign_phone ?? '',
    customer_sign_pickup_type: row.customer_sign_pickup_type ?? '',
    customer_sign_proxy_name: row.customer_sign_proxy_name ?? '',
    customer_signature_data: row.customer_signature_data ?? '',
    customer_signed_by_operator: row.customer_signed_by_operator ?? '',
    packed_at: row.packed_at ?? '', packed_bundle_barcode: row.packed_bundle_barcode,
    hub_transit_released_at: row.hub_transit_released_at ?? '',
    hub_transit_shipped_at: row.hub_transit_shipped_at ?? '',
    created_at: row.created_at, updated_at: row.updated_at,
  };
}

function rowToMovement(row: Awaited<ReturnType<typeof fetchCloudMovementsForItems>>[number]): StockMovement {
  return { ...row, type: row.type as StockMovement['type'], origin_store_id: row.origin_store_id ?? '' };
}

function packFromRow(row: CloudPackRow, items: InventoryItem[]): PackedShipmentDetail {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const itemByBarcode = new Map(items.map((item) => [item.barcode.trim().toUpperCase(), item]));
  const lines: PackedShipmentItem[] = (row.inventory_packed_shipment_items ?? []).map((line) => {
    const item =
      itemById.get(line.item_id ?? '') ??
      itemByBarcode.get(line.item_barcode.trim().toUpperCase());
    return {
      id: line.id, pack_id: row.id, item_id: item?.id ?? line.item_id ?? '',
      item_barcode: line.item_barcode,
      input_barcode: line.input_barcode?.trim() || item?.input_barcode?.trim() || '',
      item_name: line.item_name, destination: item?.final_destination ?? '',
      customer_name: item?.recipient_name ?? '', owner_store_code: item?.owner_store_code,
      qty: line.qty,
    };
  });
  const bundle =
    itemById.get(row.bundle_item_id ?? '') ??
    itemByBarcode.get(row.bundle_barcode.trim().toUpperCase());
  return {
    id: row.id, bundle_item_id: bundle?.id ?? row.bundle_item_id ?? '', bundle_barcode: row.bundle_barcode,
    bundle_name: row.bundle_name, operator: row.operator, note: row.note,
    owner_store_code: row.owner_store_code, transport_fee: row.transport_fee,
    truck_leg_destination: row.truck_leg_destination, created_at: row.created_at,
    spec: bundle?.spec ?? '', unit: bundle?.unit ?? '1 Pcs', weight: bundle?.weight ?? '',
    items: lines, bundle_qty_on_hand: bundle?.qty_on_hand ?? (row.loaded_at ? 0 : 1),
    loaded: Boolean(row.loaded_at) || (bundle?.qty_on_hand ?? 1) <= 0,
  };
}

export function inventoryItemFromCloudRow(row: CloudStoreItemRow): InventoryItem {
  return rowToItem(row);
}

export function packDetailFromCloudPackRow(row: CloudPackRow, items: InventoryItem[]): PackedShipmentDetail {
  return packFromRow(row, items);
}

/** 缓存未命中时按条码补拉快递包（写入内存缓存供列表/详情复用） */
export async function ensurePackInCacheByBarcode(
  barcode: string,
  items: InventoryItem[],
): Promise<PackedShipmentDetail | null> {
  const code = barcode.trim().toUpperCase();
  if (!code) return null;
  const cached = cache?.packs.find((p) => p.bundle_barcode.trim().toUpperCase() === code);
  if (cached) return cached;

  const row = await fetchCloudPackDetailByBarcode(code);
  if (!row) return null;
  const pack = packFromRow(row, items);
  if (cache) {
    const map = new Map(cache.packs.map((p) => [p.bundle_barcode.trim().toUpperCase(), p]));
    map.set(code, pack);
    cache = { ...cache, packs: Array.from(map.values()) };
  }
  return pack;
}

async function loadMovements(items: InventoryItem[]): Promise<StockMovement[]> {
  if (items.length === 0) return [];
  return (await fetchCloudMovementsForItems(items.map((item) => item.id))).map(rowToMovement);
}

async function fetchSnapshot(
  session: InventoryStoreSession,
  hub: string,
  includeMovements: boolean,
): Promise<InventoryCache> {
  const [rows, packRows] = await Promise.all([
    fetchCloudStoreItems(session, hub),
    fetchCloudPackedShipments(session, hub),
  ]);
  const items = rows.map(rowToItem);
  const packs = packRows.map((row) => packFromRow(row, items));
  const movements = includeMovements ? await loadMovements(items) : (cache?.movements ?? []);
  return { items, movements, packs };
}

async function ensureCache(
  store?: InventoryStoreSession,
  hubCode?: string,
  options: RefreshOptions = {},
): Promise<InventoryCache> {
  const session = store ?? await ensureInventoryCloudReady();
  const scope = resolveScope(session, hubCode);
  const force = options.force ?? false;
  const includeMovements = options.includeMovements ?? false;

  if (isCacheFresh(scope, force)) {
    if (!includeMovements || cacheHasMovements) return cache!;
    const movements = await loadMovements(cache!.items);
    cache = { ...cache!, movements };
    cacheHasMovements = true;
    return cache;
  }

  if (refreshPromise && !force) return refreshPromise;

  refreshPromise = (async () => {
    await applyPlatformWipeIfPending();
    const hub = scope.hubCode;
    const snapshot = await fetchSnapshot(session, hub, includeMovements);
    if (cache && scopeMatches(cacheScope, scope) && !force) {
      cache = mergeInventoryCaches(cache, snapshot);
    } else {
      cache = snapshot;
    }
    cacheScope = scope;
    cacheFetchedAt = Date.now();
    cacheHasMovements = includeMovements || cacheHasMovements;
    return cache;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function ensureInventoryCloudReady(): Promise<InventoryStoreSession> {
  if (!(await isCloudReachable())) throw svc('syncNetworkFailed');
  return await ensureInventoryCloudAuth();
}

/** 强制全量刷新（下拉刷新、写操作后） */
export async function refreshCache(
  store?: InventoryStoreSession,
  hubCode?: string,
  options: RefreshOptions = {},
): Promise<InventoryCache> {
  return ensureCache(store, hubCode, { ...options, force: true });
}

/** 登录后后台预热，进首页时列表可秒开 */
export async function prefetchInventoryCache(
  store: InventoryStoreSession,
  hubCode: string,
): Promise<void> {
  try {
    await ensureCache(store, hubCode, { includeMovements: false });
  } catch {
    // 预热失败不阻断登录
  }
}

export async function getItemById(id: string): Promise<InventoryItem | null> {
  return (await ensureCache(undefined, undefined, { includeMovements: false })).items.find((item) => item.id === id) ?? null;
}

export async function getItemByBarcode(barcode: string): Promise<InventoryItem | null> {
  const code = barcode.trim().toUpperCase();
  return (await ensureCache(undefined, undefined, { includeMovements: false })).items.find(
    (item) => item.barcode.trim().toUpperCase() === code,
  ) ?? null;
}

export async function listItemsForScope(
  store?: InventoryStoreSession,
  hubCode?: string,
  options?: RefreshOptions,
): Promise<InventoryItem[]> {
  return (await ensureCache(store, hubCode, { includeMovements: false, ...options })).items;
}

export async function listMovementsForItem(itemId: string): Promise<StockMovement[]> {
  const snapshot = await ensureCache(undefined, undefined, { includeMovements: true });
  return snapshot.movements.filter((movement) => movement.item_id === itemId);
}

/** 只查单个商品的流水类型，避免为判断「是否已入库」拉全站流水 */
export async function itemHasMovementType(
  itemId: string,
  type: StockMovement['type'],
  notePattern?: RegExp,
): Promise<boolean> {
  if (!itemId) return false;
  const cached = cache?.movements.some(
    (movement) =>
      movement.item_id === itemId &&
      movement.type === type &&
      (!notePattern || notePattern.test(movement.note)),
  );
  if (cached) return true;

  const rows = await fetchCloudMovementsForItems([itemId]);
  const matched = rows.some(
    (row) =>
      row.type === type &&
      (!notePattern || notePattern.test(String(row.note ?? ''))),
  );
  if (matched && cache) {
    const extra = rows.map(rowToMovement).filter((movement) => !cache!.movements.some((m) => m.id === movement.id));
    if (extra.length > 0) {
      cache = { ...cache, movements: [...cache.movements, ...extra] };
      cacheHasMovements = true;
    }
  }
  return matched;
}

export async function listPacks(
  store?: InventoryStoreSession,
  hubCode?: string,
  options?: RefreshOptions,
): Promise<PackedShipmentDetail[]> {
  return (await ensureCache(store, hubCode, { includeMovements: false, ...options })).packs;
}

/** 单次读取 items + packs +（可选）movements，避免重复请求 */
export async function getInventorySnapshot(
  store?: InventoryStoreSession,
  hubCode?: string,
  options?: RefreshOptions,
): Promise<InventoryCache> {
  return ensureCache(store, hubCode, options);
}

export async function upsertItem(item: InventoryItem, store?: InventoryStoreSession): Promise<InventoryItem> {
  const session = store ?? await ensureInventoryCloudReady();
  const id = await upsertCloudStoreItem(session, item);
  const saved = { ...item, id };
  if (cache) {
    cache.items = [...cache.items.filter((existing) => existing.barcode !== item.barcode), saved];
    cacheFetchedAt = Date.now();
  }
  return saved;
}

export async function applyMovement(
  item: InventoryItem,
  movement: StockMovement,
  store?: InventoryStoreSession,
  operationId?: string,
): Promise<InventoryItem> {
  const session = store ?? await ensureInventoryCloudReady();
  const opId = operationId?.trim() || movement.id;
  const saved = rowToItem(await applyCloudStockMovementAtomic(session, item, movement, opId));
  const savedMovement: StockMovement = {
    ...movement,
    item_id: saved.id,
    qty_after: saved.qty_on_hand,
  };
  if (cache) {
    const hasItem = cache.items.some((existing) => existing.id === saved.id || existing.barcode === saved.barcode);
    cache = {
      ...cache,
      items: hasItem
        ? cache.items.map((existing) =>
            existing.id === saved.id || existing.barcode === saved.barcode ? saved : existing,
          )
        : [...cache.items, saved],
      movements: [
        ...cache.movements.filter((existing) => existing.id !== savedMovement.id),
        savedMovement,
      ],
    };
    cacheFetchedAt = Date.now();
    cacheHasMovements = true;
  }
  return saved;
}

export async function createPackAtomic(params: {
  bundle: InventoryItem;
  pack: PackedShipment;
  lines: PackedShipmentItem[];
  originStore: { id: string; storeCode: string; storeName: string };
  operationId: string;
  store?: InventoryStoreSession;
  hubCode?: string;
}): Promise<InventoryItem> {
  const session = params.store ?? await ensureInventoryCloudReady();
  const scope = resolveScope(session, params.hubCode);
  const sourceItems = await Promise.all(params.lines.map((line) => getItemById(line.item_id)));
  const result = await createCloudPackedShipmentAtomic({
    store: session,
    bundle: params.bundle,
    pack: params.pack,
    lines: params.lines.map((line) => ({
      item_id: line.item_id,
      item_barcode: line.item_barcode,
      qty: line.qty,
    })),
    originStore: params.originStore,
    operationId: params.operationId,
  });
  const bundleItem = inventoryItemFromCloudRow(result.bundleItem);
  const packedAt = bundleItem.updated_at || params.pack.created_at;
  const updatedLineItems: InventoryItem[] = params.lines.map((line, index) => {
    const item = sourceItems[index];
    if (!item) throw svc('packLineNotInCache');
    return {
      ...item,
      qty_on_hand: Math.max(0, item.qty_on_hand - line.qty),
      packed_at: packedAt,
      packed_bundle_barcode: bundleItem.barcode,
      updated_at: packedAt,
    };
  });
  const packDetail: PackedShipmentDetail = {
    id: result.packId,
    bundle_item_id: bundleItem.id,
    bundle_barcode: bundleItem.barcode,
    bundle_name: bundleItem.name,
    operator: params.pack.operator,
    note: params.pack.note ?? '',
    owner_store_code: bundleItem.owner_store_code || params.pack.owner_store_code,
    transport_fee: params.pack.transport_fee ?? '',
    truck_leg_destination: params.pack.truck_leg_destination ?? '',
    created_at: params.pack.created_at || bundleItem.created_at,
    spec: bundleItem.spec,
    unit: bundleItem.unit,
    weight: bundleItem.weight,
    items: params.lines.map((line) => ({ ...line, pack_id: result.packId })),
    bundle_qty_on_hand: bundleItem.qty_on_hand > 0 ? bundleItem.qty_on_hand : 1,
    loaded: false,
  };
  mergePackagingStockInIntoCache(session, scope.hubCode, {
    bundleItem,
    pack: packDetail,
    lineItems: updatedLineItems,
  });
  const cloudPack = await fetchCloudPackByBarcode(bundleItem.barcode);
  if (!cloudPack) {
    throw svc('cloudPackNotRegistered', {
      barcode: bundleItem.barcode.trim().toUpperCase(),
    });
  }
  return bundleItem;
}

export async function loadShipmentsAtomic(params: {
  operationId: string;
  payload: Record<string, unknown>;
}): Promise<{ count: number; tripNumber?: string }> {
  await ensureInventoryCloudReady();
  const result = await loadCloudShipmentsAtomic(params);
  clearInventoryCloudCache();
  return {
    count: result.count ?? 0,
    tripNumber: result.trip_number,
  };
}

export async function createPack(
  pack: PackedShipment,
  lines: PackedShipmentItem[],
  loadedAt: string | null = null,
  store?: InventoryStoreSession,
): Promise<void> {
  const session = store ?? await ensureInventoryCloudReady();
  const bundleId = await getCloudItemIdByBarcode(pack.bundle_barcode);
  await upsertCloudPackedShipment(session, pack, bundleId, lines.map((line) => ({
    item_barcode: line.item_barcode, item_name: line.item_name, qty: line.qty,
    cloud_item_id: line.item_id || null,
  })), loadedAt);
  clearInventoryCloudCache();
}

export async function deletePack(barcode: string): Promise<void> {
  await ensureInventoryCloudReady();
  await deleteCloudPackedShipment(barcode);
  clearInventoryCloudCache();
}

/**
 * 装车提交前补同步：本地缓存有快递包但 Supabase 缺行时，依次补写 bundle、明细订单与打包记录。
 */
export async function ensureCloudPackRegistered(
  pack: PackedShipmentDetail,
  store: InventoryStoreSession,
): Promise<boolean> {
  if (await fetchCloudPackByBarcode(pack.bundle_barcode)) return true;

  const ownerCode = pack.owner_store_code?.trim() || store.storeCode;
  const packDest = packDestinationFromBarcode(pack.bundle_barcode);

  let bundleId = await getCloudItemIdByBarcode(pack.bundle_barcode);
  if (!bundleId) {
    const bundle =
      (await getItemByBarcode(pack.bundle_barcode)) ??
      (pack.bundle_item_id ? await getItemById(pack.bundle_item_id) : null);
    if (bundle) {
      bundleId = await upsertCloudStoreItem(store, {
        ...bundle,
        owner_store_code: bundle.owner_store_code?.trim() || ownerCode,
        final_destination: bundle.final_destination?.trim() || packDest || bundle.final_destination,
        destination: bundle.destination?.trim() || packDest || bundle.destination,
        qty_on_hand: Math.max(bundle.qty_on_hand, 1),
      });
    }
  }
  if (!bundleId) return false;

  const syncedLines: {
    item_barcode: string;
    item_name: string;
    qty: number;
    cloud_item_id: string | null;
  }[] = [];
  for (const line of pack.items) {
    let cloudItemId = await getCloudItemIdByBarcode(line.item_barcode);
    if (!cloudItemId) {
      const inner =
        (line.item_id ? await getItemById(line.item_id) : null) ??
        (await getItemByBarcode(line.item_barcode));
      if (inner) {
        cloudItemId = await upsertCloudStoreItem(store, {
          ...inner,
          owner_store_code: inner.owner_store_code?.trim() || ownerCode,
          final_destination: inner.final_destination?.trim() || packDest || inner.final_destination,
          destination: inner.destination?.trim() || packDest || inner.destination,
          packed_at: inner.packed_at?.trim() || pack.created_at,
          packed_bundle_barcode: inner.packed_bundle_barcode?.trim() || pack.bundle_barcode,
          qty_on_hand: 0,
        });
      }
    }
    syncedLines.push({
      item_barcode: line.item_barcode,
      item_name: line.item_name,
      qty: line.qty,
      cloud_item_id: cloudItemId,
    });
  }

  await upsertCloudPackedShipment(
    store,
    {
      id: pack.id,
      bundle_item_id: pack.bundle_item_id,
      bundle_barcode: pack.bundle_barcode,
      bundle_name: pack.bundle_name,
      operator: pack.operator,
      note: pack.note ?? '',
      owner_store_code: ownerCode,
      transport_fee: pack.transport_fee ?? '',
      truck_leg_destination: pack.truck_leg_destination ?? '',
      created_at: pack.created_at,
    },
    bundleId,
    syncedLines,
    null,
  );
  return Boolean(await fetchCloudPackByBarcode(pack.bundle_barcode));
}

export function clearInventoryCloudCache(): void {
  cache = null;
  cacheScope = null;
  cacheFetchedAt = 0;
  cacheHasMovements = false;
  refreshPromise = null;
}

/** 多个入库 RPC 成功后，用服务端返回的真实行写入内存缓存 */
export function mergePackagingStockInIntoCache(
  store: InventoryStoreSession,
  hubCode: string,
  input: {
    bundleItem: InventoryItem;
    pack: PackedShipmentDetail;
    lineItems: InventoryItem[];
  },
): void {
  const scope = resolveScope(store, hubCode);
  const mergeItems = (existing: InventoryItem[]) => {
    const map = new Map(existing.map((item) => [item.barcode.trim().toUpperCase(), item]));
    map.set(input.bundleItem.barcode.trim().toUpperCase(), input.bundleItem);
    for (const item of input.lineItems) map.set(item.barcode.trim().toUpperCase(), item);
    return Array.from(map.values());
  };
  const mergePacks = (existing: PackedShipmentDetail[]) => {
    const map = new Map(existing.map((p) => [p.bundle_barcode.trim().toUpperCase(), p]));
    map.set(input.pack.bundle_barcode.trim().toUpperCase(), input.pack);
    return Array.from(map.values());
  };

  if (!cache || !scopeMatches(cacheScope, scope)) {
    cache = { items: mergeItems([]), movements: [], packs: mergePacks([]) };
    cacheScope = scope;
  } else {
    cache = {
      ...cache,
      items: mergeItems(cache.items),
      packs: mergePacks(cache.packs),
    };
  }
  cacheFetchedAt = Date.now();
}
