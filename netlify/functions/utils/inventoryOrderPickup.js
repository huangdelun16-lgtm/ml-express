function uniqueCodes(values) {
  return [
    ...new Set(
      (values || [])
        .map((value) => String(value || '').trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

function emptyPickup() {
  return {
    customer_signed_at: null,
    arrival_notified_at: null,
    hub_arrived_at: null,
  };
}

function hasTimestamp(value) {
  return Boolean(String(value || '').trim());
}

function buildPickupMap(items) {
  const map = new Map();
  for (const item of items || []) {
    const pickup = {
      customer_signed_at: item.customer_signed_at || null,
      arrival_notified_at: item.arrival_notified_at || null,
      hub_arrived_at: item.hub_arrived_at || null,
    };
    const barcode = String(item.barcode || '').trim().toUpperCase();
    const express = String(item.input_barcode || '').trim().toUpperCase();
    if (barcode) map.set(`b:${barcode}`, pickup);
    if (express) map.set(`e:${express}`, pickup);
  }
  return map;
}

function pickupForOrder(order, map) {
  const barcode = String(order.order_barcode || '').trim().toUpperCase();
  const express = String(order.express_barcode || '').trim().toUpperCase();
  if (barcode && map.has(`b:${barcode}`)) return map.get(`b:${barcode}`);
  if (express && map.has(`e:${express}`)) return map.get(`e:${express}`);
  return emptyPickup();
}

function attachPickupToOrders(orders, items) {
  const map = buildPickupMap(items);
  return (orders || []).map((order) => ({
    ...order,
    ...pickupForOrder(order, map),
  }));
}

function isOrderSigned(order) {
  return hasTimestamp(order?.customer_signed_at);
}

function filterAwaitingPickupOrders(orders) {
  return (orders || []).filter(
    (order) => order.status === 'hub_received' && !isOrderSigned(order),
  );
}

function filterSignedOrders(orders) {
  return (orders || [])
    .filter(isOrderSigned)
    .slice()
    .sort((a, b) =>
      String(b.customer_signed_at || '').localeCompare(String(a.customer_signed_at || '')),
    );
}

function escapePostgrestIlike(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function collectItemLookupCodes(items) {
  return {
    barcodes: uniqueCodes((items || []).map((item) => item.barcode)),
    expresses: uniqueCodes((items || []).map((item) => item.input_barcode)),
  };
}

module.exports = {
  attachPickupToOrders,
  collectItemLookupCodes,
  emptyPickup,
  escapePostgrestIlike,
  filterAwaitingPickupOrders,
  filterSignedOrders,
  hasTimestamp,
  isOrderSigned,
  uniqueCodes,
};
