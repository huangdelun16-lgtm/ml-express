import { parseSalespersonEmployeeCode } from './crossBorderSalespersons';

/** 申请日期 YYYY-MM-DD → YYMMDD（如 2026-08-12 → 260812） */
export function formatApplicationDateCompact(isoDate: string): string {
  const match = String(isoDate ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return `${match[1].slice(-2)}${match[2]}${match[3]}`;
}

/** 推销员编码序号：MDY-005 → 005 */
export function salespersonNumericSuffix(employeeCode: string): string {
  const parsed = parseSalespersonEmployeeCode(employeeCode);
  if (parsed) return String(parsed.suffix).padStart(3, '0');
  const digits = String(employeeCode ?? '').replace(/\D/g, '');
  if (!digits) return '000';
  return digits.slice(-3).padStart(3, '0');
}

/** 客户编码 = 送货区域 + 申请日期 + 推销员序号，如 MDY260812005 */
export function buildCrossBorderCustomerCode(
  deliveryAreaCode: string,
  applicationDate: string,
  salespersonEmployeeCode: string,
): string {
  const area = String(deliveryAreaCode ?? '').trim().toUpperCase();
  const datePart = formatApplicationDateCompact(applicationDate);
  const suffix = salespersonNumericSuffix(salespersonEmployeeCode);
  if (!area || !datePart || !suffix) return '';
  return `${area}${datePart}${suffix}`;
}

export function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
