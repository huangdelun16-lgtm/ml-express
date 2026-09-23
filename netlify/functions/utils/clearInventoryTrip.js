function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function parseTripNumber(value) {
  const tripNumber = normalizeCode(value);
  if (!/^[A-Z]{3}[0-9]{4}$/.test(tripNumber)) return '';
  return tripNumber;
}

function chunk(list, size = 80) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function planTripClear({ packs, shipments, shipmentItems, orderRows, storeItems }) {
  const packBarcodeSet = new Set();
  const packBarcodes = [];
  const packSummaries = [];

  function rememberPack(rawBarcode, summary) {
    const code = normalizeCode(rawBarcode);
    if (!code || packBarcodeSet.has(code)) return;
    packBarcodeSet.add(code);
    packBarcodes.push(String(rawBarcode || '').trim());
    packSummaries.push(summary);
  }

  for (const pack of packs || []) {
    const code = normalizeCode(pack.pack_barcode);
    if (!code || packBarcodeSet.has(code)) continue;
    rememberPack(pack.pack_barcode, {
      packBarcode: code,
      name: String(pack.pack_name || '').trim(),
      route: [pack.origin_store_code, pack.leg_destination_code || pack.destination_code]
        .map((part) => normalizeCode(part))
        .filter(Boolean)
        .join(' → '),
      itemCount: Number(pack.item_count) || 0,
      loadedAt: pack.truck_loaded_at || null,
    });
  }

  for (const shipment of shipments || []) {
    const code = normalizeCode(shipment.bundle_barcode);
    if (!code || packBarcodeSet.has(code)) continue;
    rememberPack(shipment.bundle_barcode, {
      packBarcode: code,
      name: String(shipment.bundle_name || '').trim(),
      route: [shipment.owner_store_code, shipment.truck_leg_destination]
        .map((part) => normalizeCode(part))
        .filter(Boolean)
        .join(' → '),
      itemCount: 0,
      loadedAt: null,
    });
  }

  const orderIds = [];
  const orderBarcodes = [];
  const orderSamples = [];
  const orderBarcodeSet = new Set();
  for (const order of orderRows || []) {
    const pack = normalizeCode(order.pack_barcode);
    if (!packBarcodeSet.has(pack)) continue;
    if (order.id) orderIds.push(order.id);
    const orderCode = normalizeCode(order.order_barcode);
    const express = normalizeCode(order.express_barcode);
    if (orderCode && !orderSamples.includes(orderCode)) orderSamples.push(orderCode);
    if (orderCode && !orderBarcodeSet.has(orderCode)) {
      orderBarcodeSet.add(orderCode);
      orderBarcodes.push(orderCode);
    }
    if (express && !orderBarcodeSet.has(express)) {
      orderBarcodeSet.add(express);
      orderBarcodes.push(express);
    }
  }

  const shipmentItemBarcodes = new Set();
  for (const line of shipmentItems || []) {
    const pack = normalizeCode(line.bundle_barcode);
    if (pack && !packBarcodeSet.has(pack)) continue;
    const code = normalizeCode(line.item_barcode);
    if (code) shipmentItemBarcodes.add(code);
  }

  const deleteItemIds = [];
  const deleteItemBarcodes = [];
  const seenItems = new Set();
  const keptOnOtherTrip = [];

  for (const item of storeItems || []) {
    const barcode = normalizeCode(item.barcode);
    const input = normalizeCode(item.input_barcode);
    const currentPack = normalizeCode(item.packed_bundle_barcode);
    if (!barcode || seenItems.has(barcode)) continue;
    const onThisPack = Boolean(currentPack && packBarcodeSet.has(currentPack));
    const onOtherPack = Boolean(currentPack && !packBarcodeSet.has(currentPack));
    const isBundle = packBarcodeSet.has(barcode);
    const inLines = shipmentItemBarcodes.has(barcode);
    const inOrders = orderBarcodeSet.has(barcode) || (input && orderBarcodeSet.has(input));
    if (onOtherPack && !isBundle) {
      keptOnOtherTrip.push(barcode);
      seenItems.add(barcode);
      continue;
    }
    if (!(onThisPack || isBundle || inLines || inOrders)) continue;
    seenItems.add(barcode);
    if (item.id) deleteItemIds.push(item.id);
    deleteItemBarcodes.push(String(item.barcode || '').trim());
  }

  return {
    packBarcodes,
    packSummaries,
    orderIds,
    orderBarcodes,
    orderSamples,
    orderCount:
      deleteItemBarcodes.filter((code) => !packBarcodeSet.has(normalizeCode(code))).length ||
      orderIds.length,
    deleteItemIds,
    deleteItemBarcodes,
    keptOnOtherTrip,
  };
}

module.exports = {
  chunk,
  normalizeCode,
  parseTripNumber,
  planTripClear,
};
