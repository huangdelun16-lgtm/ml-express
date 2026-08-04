import { CROSS_BORDER_HUBS, type CrossBorderHub } from './crossBorderHubs';

export type SalespersonRef = { work_area_code?: string; employee_code?: string };

const LEGACY_EMPLOYEE_CODE_RE = /^([A-Z]+)-(\d+)$/i;
const PLAIN_EMPLOYEE_CODE_RE = /^(\d+)$/;

/** 从 legacy「MDY-001」或新格式「001」解析序号 */
export function parseSalespersonEmployeeNumber(code: string): number | null {
  const raw = String(code ?? '').trim().toUpperCase();
  const legacy = raw.match(LEGACY_EMPLOYEE_CODE_RE);
  if (legacy) return Number.parseInt(legacy[2], 10);
  const plain = raw.match(PLAIN_EMPLOYEE_CODE_RE);
  if (plain) return Number.parseInt(plain[1], 10);
  return null;
}

/** 界面展示：仅显示 001、002（不含区域前缀） */
export function formatSalespersonEmployeeCodeDisplay(code: string): string {
  const n = parseSalespersonEmployeeNumber(code);
  if (n == null || !Number.isFinite(n)) return String(code ?? '').trim() || '—';
  return String(n).padStart(3, '0');
}

/** @deprecated 兼容旧调用；新格式无 prefix */
export function parseSalespersonEmployeeCode(code: string): { prefix: string; suffix: number } | null {
  const raw = String(code ?? '').trim().toUpperCase();
  const legacy = raw.match(LEGACY_EMPLOYEE_CODE_RE);
  if (legacy) {
    return { prefix: legacy[1], suffix: Number.parseInt(legacy[2], 10) };
  }
  const plain = raw.match(PLAIN_EMPLOYEE_CODE_RE);
  if (plain) {
    return { prefix: '', suffix: Number.parseInt(plain[1], 10) };
  }
  return null;
}

/** 全公司统一递增：001、002、003 …（不按区域重置） */
export function nextSalespersonEmployeeCode(existing: SalespersonRef[]): string {
  let maxNum = 0;
  for (const row of existing) {
    const n = parseSalespersonEmployeeNumber(String(row.employee_code ?? ''));
    if (n != null && Number.isFinite(n)) {
      maxNum = Math.max(maxNum, n);
    }
  }
  return String(maxNum + 1).padStart(3, '0');
}

export function hubForRegionId(regionId: string): CrossBorderHub {
  return (
    CROSS_BORDER_HUBS.find((h) => h.regionId === regionId) ??
    CROSS_BORDER_HUBS.find((h) => h.regionId === 'mandalay') ??
    CROSS_BORDER_HUBS[0]
  );
}

export function buildSalespersonDraft(regionId: string, existing: SalespersonRef[]) {
  const hub = hubForRegionId(regionId);
  return {
    name: '',
    region_id: hub.regionId,
    work_area_code: hub.prefix,
    employee_code: nextSalespersonEmployeeCode(existing),
    phone: '',
    address: '',
    join_date: new Date().toISOString().slice(0, 10),
    status: 'active' as const,
  };
}

export function compareSalespersonEmployeeCodes(a: string, b: string): number {
  const na = parseSalespersonEmployeeNumber(a) ?? 0;
  const nb = parseSalespersonEmployeeNumber(b) ?? 0;
  return na - nb;
}
