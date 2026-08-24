function normalizeApplicationDate(raw) {
  const match = String(raw ?? '')
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function formatApplicationDateCompact(isoDate) {
  const date = normalizeApplicationDate(isoDate);
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return `${match[1].slice(-2)}${match[2]}${match[3]}`;
}

function salespersonNumericSuffix(employeeCode) {
  const code = String(employeeCode ?? '').trim().toUpperCase();
  const plain = code.match(/^(\d+)$/);
  if (plain) return String(Number.parseInt(plain[1], 10)).padStart(3, '0');
  const legacy = code.match(/^[A-Z]+-(\d+)$/);
  if (legacy) return String(Number.parseInt(legacy[1], 10)).padStart(3, '0');
  return '000';
}

/** 客户编码 = 区域 + 申请日期 + 单日客量 + 推销员序号，如 MDY2608241001 */
function buildCustomerCode(deliveryAreaCode, applicationDate, salespersonEmployeeCode, dailySeq) {
  const area = String(deliveryAreaCode ?? '').trim().toUpperCase();
  const datePart = formatApplicationDateCompact(applicationDate);
  const suffix = salespersonNumericSuffix(salespersonEmployeeCode);
  const seq = Math.floor(Number(dailySeq));
  if (!area || !datePart || !suffix || !Number.isFinite(seq) || seq < 1) return '';
  return `${area}${datePart}${seq}${suffix}`;
}

module.exports = {
  normalizeApplicationDate,
  formatApplicationDateCompact,
  salespersonNumericSuffix,
  buildCustomerCode,
};
