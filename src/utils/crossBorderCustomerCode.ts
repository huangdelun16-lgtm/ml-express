import { parseSalespersonEmployeeNumber } from './crossBorderSalespersons';

/** 申请日期 → YYYY-MM-DD（兼容 timestamptz） */
export function normalizeApplicationDate(raw: string): string {
  const match = String(raw ?? '')
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/** 申请日期 YYYY-MM-DD → YYMMDD（如 2026-08-24 → 260824） */
export function formatApplicationDateCompact(isoDate: string): string {
  const date = normalizeApplicationDate(isoDate);
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return `${match[1].slice(-2)}${match[2]}${match[3]}`;
}

/** 推销员编码序号：001 或 legacy MDY-005 → 005 */
export function salespersonNumericSuffix(employeeCode: string): string {
  const n = parseSalespersonEmployeeNumber(employeeCode);
  if (n != null && Number.isFinite(n)) return String(n).padStart(3, '0');
  return '000';
}

/** 从已有编码解析单日客量；旧码（日期后仅 3 位推销员序号）返回 null */
export function dailySeqFromCustomerCode(
  customerCode: string,
  deliveryAreaCode: string,
  applicationDate: string,
): number | null {
  const area = String(deliveryAreaCode ?? '').trim().toUpperCase();
  const datePart = formatApplicationDateCompact(applicationDate);
  const code = String(customerCode ?? '').trim().toUpperCase();
  if (!area || !datePart || !code.startsWith(`${area}${datePart}`)) return null;
  const rest = code.slice(area.length + datePart.length);
  if (rest.length <= 3) return null;
  const n = Number.parseInt(rest.slice(0, -3), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 同区域、同申请日期下一位单日客量（行数与已有编码取较大值 + 1，不补零） */
export function nextDailyCustomerSeq(
  existing: Array<{
    delivery_area_code?: string | null;
    application_date?: string | null;
    customer_code?: string | null;
  }>,
  deliveryAreaCode: string,
  applicationDate: string,
): number {
  const area = String(deliveryAreaCode ?? '').trim().toUpperCase();
  const date = normalizeApplicationDate(applicationDate);
  if (!area || !date) return 0;
  let count = 0;
  let maxParsed = 0;
  for (const row of existing) {
    if (String(row.delivery_area_code ?? '').trim().toUpperCase() !== area) continue;
    if (normalizeApplicationDate(String(row.application_date ?? '')) !== date) continue;
    count += 1;
    const parsed = dailySeqFromCustomerCode(String(row.customer_code ?? ''), area, date);
    if (parsed != null) maxParsed = Math.max(maxParsed, parsed);
  }
  return Math.max(count, maxParsed) + 1;
}

/**
 * 客户编码 = 送货区域 + 申请日期 + 单日客量 + 推销员序号
 * 如 MDY2608241001 = MDY + 260824 + 1（当日第 1 位）+ 001
 */
export function buildCrossBorderCustomerCode(
  deliveryAreaCode: string,
  applicationDate: string,
  salespersonEmployeeCode: string,
  dailySeq: number,
): string {
  const area = String(deliveryAreaCode ?? '').trim().toUpperCase();
  const datePart = formatApplicationDateCompact(applicationDate);
  const suffix = salespersonNumericSuffix(salespersonEmployeeCode);
  const seq = Math.floor(Number(dailySeq));
  if (!area || !datePart || !suffix || !Number.isFinite(seq) || seq < 1) return '';
  return `${area}${datePart}${seq}${suffix}`;
}

export function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
