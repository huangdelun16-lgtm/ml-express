/**
 * 跨境登记客户：编码 ↔ 姓名/电话 映射，供快递明细汇总去重
 */

function normalizeCustomerName(name) {
  return String(name || '').trim() || '未登记客户';
}

function normalizeCustomerPhone(phone) {
  const p = String(phone || '').trim();
  if (!p || p === '—' || p === '-') return '—';
  return p;
}

/** 客户编码：区域 2–6 字母 + YYMMDD + 3 位序号 */
function looksLikeCustomerCode(value) {
  return /^[A-Z]{2,6}\d{9}$/.test(String(value || '').trim().toUpperCase());
}

function buildCrossBorderCustomerRegistry(customers) {
  const byCode = {};
  const byName = {};
  for (const row of customers || []) {
    const code = String(row.customer_code || '').trim().toUpperCase();
    if (!code) continue;
    const entry = {
      customer_code: code,
      customer_name: normalizeCustomerName(row.customer_name),
      phone: normalizeCustomerPhone(row.phone),
      delivery_area_code: String(row.delivery_area_code || '').trim().toUpperCase(),
    };
    byCode[code] = entry;
    const nameKey = entry.customer_name;
    if (nameKey && nameKey !== '未登记客户') {
      byName[nameKey] = entry;
    }
  }
  return { byCode, byName };
}

function resolveRegisteredCustomer(row, registry) {
  if (!registry) return null;

  const codeFromMovement = String(row.customerCode || '').trim().toUpperCase();
  if (codeFromMovement && registry.byCode[codeFromMovement]) {
    return registry.byCode[codeFromMovement];
  }

  const nameUpper = String(row.customerName || '').trim().toUpperCase();
  if (nameUpper && registry.byCode[nameUpper]) {
    return registry.byCode[nameUpper];
  }

  const nameNorm = normalizeCustomerName(row.customerName);
  if (nameNorm && registry.byName[nameNorm]) {
    return registry.byName[nameNorm];
  }

  return null;
}

module.exports = {
  looksLikeCustomerCode,
  buildCrossBorderCustomerRegistry,
  resolveRegisteredCustomer,
  normalizeCustomerName,
  normalizeCustomerPhone,
};
