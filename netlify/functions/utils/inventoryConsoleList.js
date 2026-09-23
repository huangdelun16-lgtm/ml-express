const { escapePostgrestIlike } = require('./inventoryOrderPickup');

const LIST_PAGE_SIZE_MAX = 50;
const LIST_PAGE_SIZE_DEFAULT = 20;

const PACK_SEARCH_COLUMNS = [
  'pack_barcode',
  'pack_name',
  'trip_number',
  'origin_store_code',
  'destination_code',
  'leg_destination_code',
];

const ORDER_SEARCH_COLUMNS = [
  'order_barcode',
  'express_barcode',
  'pack_barcode',
  'order_name',
  'recipient_name',
  'recipient_phone',
  'destination_code',
];

function parseConsoleListQuery(query) {
  const page = parseInt(query?.listPage || '1', 10);
  const pageSize = parseInt(query?.listPageSize || String(LIST_PAGE_SIZE_DEFAULT), 10);
  const q = String(query?.q || '')
    .trim()
    .replace(/,/g, ' ')
    .slice(0, 80);
  return {
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 200) : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0
        ? Math.min(LIST_PAGE_SIZE_MAX, pageSize)
        : LIST_PAGE_SIZE_DEFAULT,
    q,
  };
}

function listRange(page, pageSize) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

function searchOrFilter(q, columns) {
  const raw = String(q || '').trim();
  if (!raw || !columns?.length) return '';
  const escaped = escapePostgrestIlike(raw);
  return columns.map((col) => `${col}.ilike.%${escaped}%`).join(',');
}

function packListIsSimple(packStatus) {
  return !packStatus || packStatus === 'all' || packStatus === 'in_transit' || packStatus === 'hub_received';
}

function orderListIsSimple(orderStatus) {
  return (
    !orderStatus ||
    orderStatus === 'all' ||
    orderStatus === 'in_transit' ||
    orderStatus === 'hub_received' ||
    orderStatus === 'released_at_hub' ||
    orderStatus === 'active'
  );
}

module.exports = {
  LIST_PAGE_SIZE_DEFAULT,
  LIST_PAGE_SIZE_MAX,
  ORDER_SEARCH_COLUMNS,
  PACK_SEARCH_COLUMNS,
  listRange,
  orderListIsSimple,
  packListIsSimple,
  parseConsoleListQuery,
  searchOrFilter,
};
