/**
 * Inventory 中转站账号：Auth JWT 同步（create / update 共用）
 */

const { getAdminTokenFromEvent } = require('./adminToken');

const TRANSIT_STATION_STORE_TYPE = 'transit_station';
const PACK_HUB_CODES = ['MSE', 'LSO', 'POL', 'MDY', 'YGN', 'TGI'];

function inventoryAuthEmail(storeCode) {
  return `inventory+${storeCode.trim().toLowerCase()}@inventory.mlexpress.internal`;
}

function resolveHubCode(region, storeCode) {
  const reg = (region ?? '').trim().toUpperCase();
  if (reg && PACK_HUB_CODES.includes(reg)) return reg;

  const letters = String(storeCode).replace(/[0-9]/g, '').toUpperCase();
  if (letters.startsWith('MUSE') || letters === 'MSE' || letters === 'MUS') return 'MSE';

  const prefix = letters.slice(0, 3);
  if (PACK_HUB_CODES.includes(prefix)) return prefix;
  if (reg && PACK_HUB_CODES.includes(reg.slice(0, 3))) return reg.slice(0, 3);
  if (reg) return reg.slice(0, 3);
  return prefix;
}

async function findUserByEmail(supabaseAdmin, email) {
  let page = 1;
  const perPage = 1000;
  const target = email.toLowerCase();
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data?.users?.find((user) => (user.email ?? '').toLowerCase() === target);
    if (match) return { id: match.id };
    if (!data?.users || data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function syncInventoryAuthUser(supabaseAdmin, store, options = {}) {
  const password = options.password ? String(options.password).trim() : '';
  const hubCode = resolveHubCode(store.region, store.store_code);
  const email = inventoryAuthEmail(store.store_code);
  const appMetadata = {
    inventory_store_id: store.id,
    inventory_store_code: String(store.store_code).trim().toUpperCase(),
    inventory_hub_code: hubCode,
    inventory_store_type: TRANSIT_STATION_STORE_TYPE,
    inventory_store_name: store.store_name,
    inventory_region: (store.region ?? '').trim(),
    inventory_address: (store.address ?? '').trim(),
  };
  const sessionId = String(store.current_session_id ?? '').trim();
  if (sessionId) appMetadata.inventory_session_id = sessionId;

  const existing = await findUserByEmail(supabaseAdmin, email);
  if (existing) {
    const payload = {
      email_confirm: true,
      app_metadata: appMetadata,
    };
    if (password) payload.password = password;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, payload);
    if (error) throw new Error(error.message);
  } else if (password) {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: appMetadata,
    });
    if (error) throw new Error(error.message);
  }

  return { email, hubCode };
}

async function deleteInventoryAuthUser(supabaseAdmin, storeCode) {
  const email = inventoryAuthEmail(storeCode);
  const existing = await findUserByEmail(supabaseAdmin, email);
  if (!existing) return { deleted: false, email };
  const { error } = await supabaseAdmin.auth.admin.deleteUser(existing.id);
  if (error) throw new Error(error.message);
  return { deleted: true, email };
}

module.exports = {
  TRANSIT_STATION_STORE_TYPE,
  getAdminTokenFromEvent,
  inventoryAuthEmail,
  resolveHubCode,
  syncInventoryAuthUser,
  deleteInventoryAuthUser,
};
