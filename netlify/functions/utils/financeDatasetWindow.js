/**
 * 财务读取窗口：本期发生的记录，加上更早仍可能未结清的到付和车费。
 * 已签收的预付、已付车费、库存流水不带进本期。
 */

const NOTE_MARKERS = ['到付', 'COD', '总费用', 'Total fee', 'ပို့ဆောင်ခ', '打包入'];

function hasFinanceRange(range) {
  return Boolean(range && range.fromIso && range.toExclusiveIso && range.periodStart && range.periodEnd);
}

function quoteFilterValue(value) {
  return `"${String(value).replace(/"/g, '')}"`;
}

function noteMarkerOr(column) {
  return NOTE_MARKERS.map((marker) => `${column}.ilike.${quoteFilterValue(`*${marker}*`)}`).join(',');
}

function mergeRowsByKey(groups, keyFn) {
  const map = new Map();
  let error = null;
  let truncated = false;
  for (const group of groups || []) {
    if (!group) continue;
    if (group.error) error = group.error;
    if (group.truncated) truncated = true;
    for (const row of group.data || []) {
      const key = keyFn(row);
      if (!key || map.has(key)) continue;
      map.set(key, row);
    }
  }
  return { data: [...map.values()], error, truncated };
}

function safePaidCodes(codes) {
  const list = [];
  for (const code of codes || []) {
    const normalized = String(code || '').trim().toUpperCase();
    if (/^[A-Z0-9]+$/.test(normalized) && !list.includes(normalized)) list.push(normalized);
  }
  return list;
}

module.exports = {
  NOTE_MARKERS,
  hasFinanceRange,
  quoteFilterValue,
  noteMarkerOr,
  mergeRowsByKey,
  safePaidCodes,
};
