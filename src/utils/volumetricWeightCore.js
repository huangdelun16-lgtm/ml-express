/** 体积重量只在这一份里计算。后台、库存 App、入库接口都调用这里。 */
const VOLUMETRIC_DIVISOR = 6000;

function positiveDim(raw) {
  const n = Number(String(raw ?? '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function roundKg(kg) {
  return Math.round(kg * 100) / 100;
}

/** 只保留数字和一个小数点。`1.2.3` 收成 `1.23`。 */
function sanitizeDecimalInput(raw) {
  return String(raw ?? '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function volumetricWeightKg(l, w, h) {
  const a = positiveDim(l);
  const b = positiveDim(w);
  const c = positiveDim(h);
  if (a == null || b == null || c == null) return null;
  const kg = roundKg((a * b * c) / VOLUMETRIC_DIVISOR);
  return kg > 0 ? kg : null;
}

function preferredChargeBasis(volumetricKg, actualKg) {
  if (!(actualKg > 0) || volumetricKg == null || !(volumetricKg > 0)) return null;
  return volumetricKg > actualKg ? 'volume' : 'weight';
}

function volumetricFormula(l, w, h) {
  const a = positiveDim(l);
  const b = positiveDim(w);
  const c = positiveDim(h);
  if (a == null || b == null || c == null) return '';
  const product = a * b * c;
  const shown = Number.isInteger(product) ? String(product) : String(roundKg(product));
  const dim = (n) => (Number.isInteger(n) ? String(n) : String(n));
  return `${dim(a)}×${dim(b)}×${dim(c)}=${shown}÷${VOLUMETRIC_DIVISOR}`;
}

function volumetricDetailFromSpec(spec) {
  const match = String(spec || '').match(
    /(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)/,
  );
  if (!match) return null;
  const kg = volumetricWeightKg(match[1], match[2], match[3]);
  if (kg == null) return null;
  return { kg, formula: volumetricFormula(match[1], match[2], match[3]) };
}

function parseActualKg(raw) {
  const match = String(raw || '').match(/(\d+(?:\.\d+)?)/);
  const n = match ? Number(match[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function heavierVolumetricFromSpec(spec, actualRaw) {
  const volumetric = volumetricDetailFromSpec(spec);
  const actual = parseActualKg(actualRaw);
  if (!volumetric || actual == null || !(volumetric.kg > actual)) return null;
  return volumetric;
}

function normalizeSpec(spec) {
  const match = String(spec || '').trim().match(/(\S+)\s*[xX×*]\s*(\S+)\s*[xX×*]\s*(\S+)/);
  if (!match) return '';
  const dims = match.slice(1, 4).map((part) => sanitizeDecimalInput(part.replace(/cm$/i, '')));
  if (!dims.some((part) => Number(part) > 0)) return '';
  return `${dims[0] || '0'} x ${dims[1] || '0'} x ${dims[2] || '0'} cm`;
}

function volumetricKgFromSpec(spec) {
  const detail = volumetricDetailFromSpec(spec);
  return detail ? detail.kg : 0;
}

module.exports = {
  VOLUMETRIC_DIVISOR,
  sanitizeDecimalInput,
  volumetricWeightKg,
  preferredChargeBasis,
  volumetricFormula,
  volumetricDetailFromSpec,
  parseActualKg,
  heavierVolumetricFromSpec,
  normalizeSpec,
  volumetricKgFromSpec,
};
