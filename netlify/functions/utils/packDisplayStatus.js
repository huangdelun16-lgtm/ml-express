/**
 * 与 Inventory App src/utils/packDisplayStatus.ts 同源
 */

const PACK_DISPLAY_LABEL = {
  pending_load: '未装车',
  loaded: '已装车',
  arrived: '已到站',
  completed: '已完成',
};

function resolvePackDisplayStatus(pack, cloudStatus) {
  const legDoneAtHub =
    cloudStatus === 'hub_received' ||
    cloudStatus === 'split_at_hub' ||
    cloudStatus === 'completed';

  if (legDoneAtHub && pack.loaded) return 'completed';
  if (cloudStatus === 'completed' && !pack.loaded) return 'arrived';
  if (cloudStatus === 'split_at_hub') return 'arrived';
  if (cloudStatus === 'hub_received') return 'arrived';
  if (pack.loaded) return 'loaded';
  return 'pending_load';
}

/** 从云端追踪 + 本地打包库存推断 loaded（与 App listPackedShipments 一致） */
function inferPackLoadedFromTracking(packRow, qtyOnHand) {
  if (typeof qtyOnHand === 'number' && Number.isFinite(qtyOnHand) && qtyOnHand <= 0) {
    return true;
  }
  if (packRow.truck_loaded_at) return true;
  if (packRow.status === 'in_transit') return true;
  return false;
}

function resolvePackDisplayStatusFromTracking(packRow, qtyOnHand) {
  if (packRow.status === 'cancelled') return null;
  const loaded = inferPackLoadedFromTracking(packRow, qtyOnHand);
  return resolvePackDisplayStatus({ loaded }, packRow.status);
}

module.exports = {
  PACK_DISPLAY_LABEL,
  resolvePackDisplayStatus,
  inferPackLoadedFromTracking,
  resolvePackDisplayStatusFromTracking,
};
