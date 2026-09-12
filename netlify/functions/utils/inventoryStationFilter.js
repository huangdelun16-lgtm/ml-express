function sanitizeStationKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

function parseStationKeys(raw) {
  return [
    ...new Set(
      String(raw || '')
        .split(',')
        .map(sanitizeStationKey)
        .filter(Boolean),
    ),
  ];
}

function rowTouchesStation(row, keys, columns) {
  const safeKeys = (keys || []).map(sanitizeStationKey).filter(Boolean);
  if (!safeKeys.length) return true;
  const set = new Set(safeKeys);
  return (columns || []).some((col) => set.has(sanitizeStationKey(String(row?.[col] || ''))));
}

function applyStationKeys(query, keys, columns) {
  const safeKeys = (keys || []).map(sanitizeStationKey).filter(Boolean);
  const cols = (columns || []).filter(Boolean);
  if (!safeKeys.length || !cols.length) return query;
  const parts = [];
  for (const col of cols) {
    for (const key of safeKeys) {
      parts.push(`${col}.eq.${key}`);
    }
  }
  return query.or(parts.join(','));
}

module.exports = {
  applyStationKeys,
  parseStationKeys,
  rowTouchesStation,
  sanitizeStationKey,
};
