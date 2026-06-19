/**
 * Inventory App「快递明细」客户汇总（云端 inventory_store_items + 入库流水）
 */

function parseAmount(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const n = Number(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseInboundMovementNote(note) {
  const trimmed = String(note || '').trim();
  if (!trimmed) return {};
  const parts = trimmed.split(' · ').map((p) => p.trim()).filter(Boolean);
  let totalFee;
  let paymentLabel;
  const userParts = [];
  for (const part of parts) {
    const feeMatch = part.match(/^总费用\s+([\d.]+)\s*MMK/i);
    if (feeMatch) {
      totalFee = feeMatch[1];
      continue;
    }
    if (part === '到付' || part === '预付') {
      paymentLabel = part;
      continue;
    }
    userParts.push(part);
  }
  return { totalFee, paymentLabel, userNote: userParts.join(' · ') };
}

function parseWeightKg(raw) {
  const n = parseAmount(raw);
  return n > 0 ? n : 0;
}

function movementRichness(m) {
  const note = String(m.note || '');
  if (note.includes('总费用')) return 0;
  if (String(m.recipient_name || '').trim() || String(m.recipient_phone || '').trim()) return 1;
  if (String(m.packaging || '').trim()) return 2;
  return 3;
}

function pickInboundMovement(movements) {
  if (!movements?.length) return null;
  return movements
    .slice()
    .sort((a, b) => {
      const r = movementRichness(a) - movementRichness(b);
      if (r !== 0) return r;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    })[0];
}

function customerKey(name, phone) {
  const n = normalizeCustomerName(name);
  const p = normalizeCustomerPhone(phone);
  return `${n}__${p}`;
}

function normalizeCustomerName(name) {
  return String(name || '').trim() || '未登记客户';
}

function normalizeCustomerPhone(phone) {
  const p = String(phone || '').trim();
  if (!p || p === '—' || p === '-') return '—';
  return p;
}

function normalizeOwnerKey(key) {
  const code = String(key || '').trim().toUpperCase();
  if (!code) return '';
  if (code.startsWith('ADMIN')) return 'ADMIN';
  if (code.startsWith('MUSE') || code === 'MSE' || code === 'MUS') return 'MUSE';
  const letters = code.replace(/[0-9]/g, '');
  const token = letters.length >= 3 ? letters.slice(0, 3) : code.slice(0, 3);
  if (token === 'MSE' || token === 'MUS') return 'MUSE';
  return token;
}

function isPackedItem(item) {
  return (
    Boolean(String(item.packed_at || '').trim()) ||
    Boolean(String(item.packed_bundle_barcode || '').trim())
  );
}

function isCustomerSignedItem(item) {
  return Boolean(String(item.customer_signed_at || '').trim());
}

function isHubArrivedItem(item) {
  return Boolean(String(item.hub_arrived_at || '').trim());
}

function isTransitReleasedItem(item) {
  return Boolean(String(item.hub_transit_released_at || '').trim());
}

function isTransitShippedItem(item) {
  return Boolean(String(item.hub_transit_shipped_at || '').trim());
}

function isStockedInItem(item, inbound) {
  return inbound != null || Number(item.qty_on_hand) > 0;
}

function deriveTransportStatus(item, inbound, destKey) {
  const hubKey = normalizeOwnerKey(item.owner_store_code || inbound?.origin_store_code);
  const regionCode = normalizeOwnerKey(destKey || item.final_destination);
  const transitShipped = isTransitShippedItem(item);
  const transitReleased = isTransitReleasedItem(item) && !transitShipped;
  const transitPendingAtHub =
    isPackedItem(item) &&
    !transitReleased &&
    !transitShipped &&
    !isHubArrivedItem(item) &&
    regionCode &&
    hubKey &&
    regionCode !== hubKey;

  if (isCustomerSignedItem(item)) return '已签收';
  if (transitShipped) return '已中转';
  if (transitReleased) return '待转出';
  if (transitPendingAtHub) return '待中转';
  if (isHubArrivedItem(item)) return '已到站';
  if (isStockedInItem(item, inbound)) return '已入库';
  return '未入库';
}

function derivePackageStatus(item) {
  const transitReleased = isTransitReleasedItem(item) && !isTransitShippedItem(item);
  if (isPackedItem(item) && !transitReleased) return '已打包';
  return '未打包';
}

function derivePaymentStatus(paymentLabel, customerSigned) {
  const payment = String(paymentLabel || '').trim();
  if (payment === '预付') return '已付款';
  if (payment === '到付') return customerSigned ? '已收款' : '到付待收';
  return payment || '—';
}

function buildExpressItemRow(item, inbound) {
  const parsed = parseInboundMovementNote(inbound?.note);
  const customerName =
    normalizeCustomerName(
      String(item.recipient_name || '').trim() ||
        String(inbound?.recipient_name || '').trim(),
    );
  const phone = normalizeCustomerPhone(inbound?.recipient_phone);
  const destination =
    String(item.final_destination || '').trim() ||
    String(inbound?.destination || '').trim();
  const originStoreCode =
    String(inbound?.origin_store_code || '').trim() ||
    String(item.owner_store_code || '').trim() ||
    '—';
  const qty = inbound ? Number(inbound.qty) || 1 : Number(item.qty_on_hand) || 1;
  const fee = parseAmount(parsed.totalFee);
  const customerSigned = isCustomerSignedItem(item);

  return {
    id: item.id,
    customerName,
    customerPhone: phone,
    customerKey: customerKey(customerName, phone),
    productName: String(item.name || '').trim() || '—',
    expressBarcode: String(item.input_barcode || '').trim() || '—',
    inboundBarcode: String(item.barcode || '').trim(),
    packaging: String(inbound?.packaging || '').trim() || '—',
    origin: originStoreCode,
    destination: destination || '—',
    weight: String(item.weight || '').trim() || '—',
    weightKg: parseWeightKg(item.weight),
    qty,
    fee,
    paymentStatus: derivePaymentStatus(parsed.paymentLabel, customerSigned),
    packageStatus: derivePackageStatus(item),
    transportStatus: deriveTransportStatus(item, inbound, destination),
    paymentLabel: parsed.paymentLabel || '',
    ownerStoreCode: String(item.owner_store_code || '').trim(),
    inboundAt: inbound?.created_at || '',
    updatedAt: item.updated_at || inbound?.created_at || '',
  };
}

async function loadExpressItemsDataset(supabase) {
  const warnings = [];

  const { data: items, error: itemsErr } = await supabase
    .from('inventory_store_items')
    .select(
      'id, barcode, input_barcode, name, weight, qty_on_hand, recipient_name, final_destination, owner_store_code, updated_at, packed_at, packed_bundle_barcode, hub_arrived_at, customer_signed_at, hub_transit_released_at, hub_transit_shipped_at',
    )
    .not('barcode', 'ilike', 'PKG%')
    .order('updated_at', { ascending: false })
    .limit(2500);

  if (itemsErr) {
    warnings.push(`快递明细读取失败：${itemsErr.message}`);
    return { rows: [], warnings };
  }

  const itemList = items || [];
  const itemIds = itemList.map((i) => i.id).filter(Boolean);

  let inboundByItem = {};
  if (itemIds.length > 0) {
    const { data: movRows, error: movErr } = await supabase
      .from('inventory_stock_movements')
      .select(
        'item_id, type, qty, note, recipient_name, recipient_phone, destination, packaging, origin_store_code, origin_store_name, created_at',
      )
      .eq('type', 'in')
      .in('item_id', itemIds);

    if (movErr) {
      warnings.push(`入库流水读取失败：${movErr.message}`);
    } else {
      for (const m of movRows || []) {
        const id = m.item_id;
        if (!inboundByItem[id]) inboundByItem[id] = [];
        inboundByItem[id].push(m);
      }
    }
  }

  const rows = [];
  for (const item of itemList) {
    const inbound = pickInboundMovement(inboundByItem[item.id]);
    if (!inbound && !String(item.recipient_name || '').trim()) continue;
    rows.push(buildExpressItemRow(item, inbound));
  }

  return { rows, warnings };
}

function aggregateCustomerSummaries(rows) {
  const map = {};
  for (const row of rows) {
    const name = normalizeCustomerName(row.customerName);
    const phone = normalizeCustomerPhone(row.customerPhone);
    const key = customerKey(name, phone);
    if (!map[key]) {
      map[key] = {
        customerKey: key,
        customerName: name,
        customerPhone: phone,
        totalPieces: 0,
        totalWeightKg: 0,
        totalFee: 0,
        orderCount: 0,
      };
    }
    const g = map[key];
    g.totalPieces += row.qty;
    g.totalWeightKg += row.weightKg;
    g.totalFee += row.fee;
    g.orderCount += 1;
  }

  return Object.values(map)
    .map((g) => ({
      ...g,
      totalWeightKg: Math.round(g.totalWeightKg * 100) / 100,
      totalFee: Math.round(g.totalFee),
    }))
    .sort((a, b) => b.totalFee - a.totalFee || b.orderCount - a.orderCount);
}

async function fetchCustomerSummaries(supabase) {
  const { rows, warnings } = await loadExpressItemsDataset(supabase);
  return {
    summaries: aggregateCustomerSummaries(rows),
    warnings,
  };
}

async function fetchCustomerItems(supabase, customerName, customerPhone) {
  const { rows, warnings } = await loadExpressItemsDataset(supabase);
  const targetName = normalizeCustomerName(customerName);
  const targetPhone = normalizeCustomerPhone(customerPhone);
  const items = rows
    .filter(
      (r) =>
        normalizeCustomerName(r.customerName) === targetName &&
        normalizeCustomerPhone(r.customerPhone) === targetPhone,
    )
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return {
    customerName: targetName,
    customerPhone: targetPhone,
    items,
    warnings,
  };
}

module.exports = {
  fetchCustomerSummaries,
  fetchCustomerItems,
  customerKey,
};
