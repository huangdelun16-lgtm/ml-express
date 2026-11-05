const { randomUUID } = require('crypto');

function fail(error) {
  if (error) throw new Error(error.message || '入库失败');
}

/**
 * 写入和 Inventory App 同一批表，不依赖额外的数据库函数。
 * 调用方须使用 service role。
 */
async function writeAdminStockIn(supabase, payload) {
  const { data: store, error: storeError } = await supabase
    .from('delivery_stores')
    .select('id, store_code, store_name')
    .eq('id', payload.store_id)
    .maybeSingle();
  fail(storeError);
  if (!store) throw new Error('发出站点不存在');

  const storeCode = String(store.store_code || '').trim().toUpperCase();
  const now = payload.inbound_at;
  const customerCode = payload.customer_code || '';

  if (payload.mode === 'single') {
    const line = payload.single;
    const itemId = randomUUID();
    const item = {
      id: itemId,
      barcode: line.barcode,
      input_barcode: line.input_barcode || '',
      name: line.name,
      spec: line.spec || '',
      unit: line.unit,
      weight: line.weight,
      qty_on_hand: line.qty,
      min_qty: 0,
      note: '',
      owner_store_id: store.id,
      owner_store_code: storeCode,
      recipient_name: payload.recipient_name,
      final_destination: payload.destination,
      created_at: now,
      updated_at: now,
    };
    const inserted = await supabase.from('inventory_store_items').insert(item).select('id').single();
    fail(inserted.error);
    const movement = await supabase.from('inventory_stock_movements').insert({
      id: randomUUID(),
      item_id: itemId,
      barcode: line.barcode,
      item_name: line.name,
      type: 'in',
      qty: line.qty,
      qty_before: 0,
      qty_after: line.qty,
      operator: payload.operator,
      note: payload.note,
      recipient_name: payload.recipient_name,
      recipient_phone: payload.recipient_phone,
      destination: payload.destination,
      detail_address: payload.detail_address || '',
      packaging: '',
      input_barcode: line.input_barcode || '',
      origin_store_id: store.id,
      origin_store_code: storeCode,
      origin_store_name: store.store_name || '',
      customer_code: customerCode,
      created_at: now,
    });
    if (movement.error) {
      await supabase.from('inventory_store_items').delete().eq('id', itemId);
      throw new Error(movement.error.message);
    }
    return { mode: 'single', barcode: line.barcode, line_barcodes: [line.barcode] };
  }

  const bundle = payload.bundle;
  const lines = payload.lines || [];
  const bundleId = randomUUID();
  const packId = randomUUID();
  const bundleRow = await supabase.from('inventory_store_items').insert({
    id: bundleId,
    barcode: bundle.barcode,
    input_barcode: '',
    name: bundle.name,
    spec: bundle.spec || '',
    unit: bundle.unit,
    weight: bundle.weight,
    qty_on_hand: 1,
    min_qty: 0,
    note: bundle.note || '',
    owner_store_id: store.id,
    owner_store_code: storeCode,
    recipient_name: payload.recipient_name,
    final_destination: payload.destination,
    created_at: now,
    updated_at: now,
  }).select('id').single();
  fail(bundleRow.error);

  const packRow = await supabase.from('inventory_packed_shipments').insert({
    id: packId,
    bundle_item_id: bundleId,
    bundle_barcode: bundle.barcode,
    bundle_name: bundle.name,
    operator: payload.operator,
    note: bundle.note || '',
    owner_store_id: store.id,
    owner_store_code: storeCode,
    created_at: now,
    updated_at: now,
  }).select('id').single();
  if (packRow.error) {
    await supabase.from('inventory_store_items').delete().eq('id', bundleId);
    throw new Error(packRow.error.message);
  }

  const lineIds = [];
  try {
    for (const line of lines) {
      const itemId = randomUUID();
      const itemRow = await supabase.from('inventory_store_items').insert({
        id: itemId,
        barcode: line.barcode,
        input_barcode: line.input_barcode || '',
        name: line.name,
        spec: '',
        unit: `${line.qty} Pcs`,
        weight: '',
        qty_on_hand: 0,
        min_qty: 0,
        note: payload.note,
        owner_store_id: store.id,
        owner_store_code: storeCode,
        recipient_name: payload.recipient_name,
        final_destination: payload.destination,
        packed_at: now,
        packed_bundle_barcode: bundle.barcode,
        created_at: now,
        updated_at: now,
      }).select('id').single();
      fail(itemRow.error);
      lineIds.push(itemId);

      const movement = await supabase.from('inventory_stock_movements').insert({
        id: randomUUID(),
        item_id: itemId,
        barcode: line.barcode,
        item_name: line.name,
        type: 'in',
        qty: line.qty,
        qty_before: 0,
        qty_after: 0,
        operator: payload.operator,
        note: `${payload.note} · 打包入 ${bundle.barcode}`,
        recipient_name: payload.recipient_name,
        recipient_phone: payload.recipient_phone,
        destination: payload.destination,
        input_barcode: line.input_barcode || '',
        origin_store_id: store.id,
        origin_store_code: storeCode,
        origin_store_name: store.store_name || '',
        customer_code: customerCode,
        created_at: now,
      });
      fail(movement.error);

      const packed = await supabase.from('inventory_packed_shipment_items').insert({
        id: randomUUID(),
        pack_id: packId,
        item_id: itemId,
        item_barcode: line.barcode,
        item_name: line.name,
        qty: line.qty,
        input_barcode: line.input_barcode || '',
      });
      fail(packed.error);
    }
  } catch (error) {
    if (lineIds.length) {
      await supabase.from('inventory_packed_shipment_items').delete().in('item_id', lineIds);
      await supabase.from('inventory_stock_movements').delete().in('item_id', lineIds);
      await supabase.from('inventory_store_items').delete().in('id', lineIds);
    }
    await supabase.from('inventory_packed_shipments').delete().eq('id', packId);
    await supabase.from('inventory_store_items').delete().eq('id', bundleId);
    throw error;
  }

  return {
    mode: 'batch',
    barcode: bundle.barcode,
    line_barcodes: lines.map((line) => line.barcode),
  };
}

module.exports = { writeAdminStockIn };
