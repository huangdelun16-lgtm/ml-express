const {
  normalizeCustomerName,
  resolveRegisteredCustomer,
} = require('./crossBorderCustomerRegistry');
const { planExportCostClear, planSignedInvoiceClear } = require('./clearInventoryTrip');

const UNREGISTERED_NAME = '未登记客户';
const STALE_MS = 24 * 60 * 60 * 1000;

function chunk(list, size = 80) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

/** 客户姓名显示成「未登记客户」，且对不上总部已建档客户。 */
function isUnregisteredCustomerRow(row, registry) {
  if (!row) return false;
  if (resolveRegisteredCustomer(row, registry)) return false;
  return normalizeCustomerName(row.customerName) === UNREGISTERED_NAME;
}

function rowAgeMs(row, now) {
  const stamp = Date.parse(row?.inboundAt || row?.updatedAt || '');
  if (!Number.isFinite(stamp)) return null;
  return now - stamp;
}

/** 满 24 小时仍是未登记客户的订单。没有入库时间的不删。 */
function selectStaleUnregisteredOrders(rows, registry, now = Date.now()) {
  return (rows || []).filter((row) => {
    if (!row?.id || !isUnregisteredCustomerRow(row, registry)) return false;
    const age = rowAgeMs(row, now);
    return age != null && age >= STALE_MS;
  });
}

async function deleteIn(supabase, table, column, values) {
  const list = unique(values);
  for (const part of chunk(list)) {
    const { error } = await supabase.from(table).delete().in(column, part);
    if (error) throw error;
  }
}

async function deleteUnregisteredOrderGraph(supabase, rows) {
  const ids = unique(rows.map((row) => row.id));
  const barcodes = unique(rows.map((row) => row.inboundBarcode));
  const packCodes = unique(rows.map((row) => row.packedBundleBarcode));
  if (!ids.length) return { removed: 0 };

  const { data: exceptions, error: exceptionError } = await supabase
    .from('inventory_exceptions')
    .select('id')
    .in('item_id', ids);
  if (exceptionError) throw exceptionError;
  const exceptionIds = unique((exceptions || []).map((row) => row.id));
  if (exceptionIds.length) {
    await deleteIn(supabase, 'inventory_exception_photos', 'exception_id', exceptionIds);
    await deleteIn(supabase, 'inventory_exceptions', 'id', exceptionIds);
  }
  if (barcodes.length) {
    const { data: byBarcode, error: barcodeError } = await supabase
      .from('inventory_exceptions')
      .select('id')
      .in('item_barcode', barcodes);
    if (barcodeError) throw barcodeError;
    const extraIds = unique((byBarcode || []).map((row) => row.id));
    if (extraIds.length) {
      await deleteIn(supabase, 'inventory_exception_photos', 'exception_id', extraIds);
      await deleteIn(supabase, 'inventory_exceptions', 'id', extraIds);
    }
  }

  await deleteIn(supabase, 'inventory_stock_movements', 'item_id', ids);
  await deleteIn(supabase, 'inventory_packed_shipment_items', 'item_id', ids);
  if (barcodes.length) {
    await deleteIn(supabase, 'inventory_packed_shipment_items', 'item_barcode', barcodes);
    await deleteIn(supabase, 'inventory_order_tracking', 'order_barcode', barcodes);
  }

  const { data: costs, error: costError } = await supabase
    .from('inventory_export_costs')
    .select('id, subject_key, display_barcode, trip_number');
  if (costError) throw costError;
  const costPlan = planExportCostClear(costs || [], {
    barcodes,
    itemIds: ids,
    tripNumber: '',
  });
  if (costPlan.deleteIds.length) {
    await deleteIn(supabase, 'inventory_export_costs', 'id', costPlan.deleteIds);
  }

  const { data: invoices, error: invoiceError } = await supabase
    .from('inventory_signed_invoices')
    .select('id, document, trip_label, item_ids')
    .overlaps('item_ids', ids);
  if (invoiceError) throw invoiceError;
  const invoicePlan = planSignedInvoiceClear(invoices || [], {
    barcodes,
    itemIds: ids,
    keptBarcodes: [],
    tripNumber: '',
  });
  if (invoicePlan.deleteIds.length) {
    await deleteIn(supabase, 'inventory_signed_invoices', 'id', invoicePlan.deleteIds);
  }
  for (const update of invoicePlan.updates || []) {
    const { error } = await supabase
      .from('inventory_signed_invoices')
      .update({
        document: update.document,
        item_ids: update.item_ids,
        trip_label: update.trip_label,
        piece_count: update.piece_count,
      })
      .eq('id', update.id);
    if (error) throw error;
  }

  await deleteIn(supabase, 'inventory_store_items', 'id', ids);

  if (packCodes.length) {
    const { data: packs, error: packError } = await supabase
      .from('inventory_packed_shipments')
      .select('id, bundle_barcode')
      .in('bundle_barcode', packCodes);
    if (packError) throw packError;
    const packIds = unique((packs || []).map((row) => row.id));
    const { data: lines, error: lineError } = packIds.length
      ? await supabase.from('inventory_packed_shipment_items').select('pack_id').in('pack_id', packIds)
      : { data: [], error: null };
    if (lineError) throw lineError;
    const { data: still, error: stillError } = await supabase
      .from('inventory_store_items')
      .select('packed_bundle_barcode')
      .in('packed_bundle_barcode', packCodes);
    if (stillError) throw stillError;
    const usedPacks = new Set(unique((lines || []).map((row) => row.pack_id)));
    const usedCodes = new Set(
      unique((still || []).map((row) => String(row.packed_bundle_barcode || '').trim().toUpperCase())),
    );
    const emptyIds = [];
    const emptyCodes = [];
    for (const pack of packs || []) {
      const code = String(pack.bundle_barcode || '').trim().toUpperCase();
      if (usedPacks.has(pack.id) || usedCodes.has(code)) continue;
      emptyIds.push(pack.id);
      emptyCodes.push(code);
    }
    if (emptyIds.length) await deleteIn(supabase, 'inventory_packed_shipments', 'id', emptyIds);
    if (emptyCodes.length) await deleteIn(supabase, 'inventory_pkg_tracking', 'pack_barcode', emptyCodes);
  }

  return { removed: ids.length };
}

module.exports = {
  UNREGISTERED_NAME,
  STALE_MS,
  isUnregisteredCustomerRow,
  selectStaleUnregisteredOrders,
  deleteUnregisteredOrderGraph,
};
