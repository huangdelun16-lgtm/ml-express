import { CROSS_BORDER_HUBS, type CrossBorderHub } from './crossBorderHubs';

export type SalespersonRef = { work_area_code?: string; employee_code?: string };

const EMPLOYEE_CODE_RE = /^([A-Z]+)-(\d+)$/i;

/** 推销员员工编码：{区域短写}-001、MDY-002 … */
export function nextSalespersonEmployeeCode(
  hub: CrossBorderHub,
  existing: SalespersonRef[],
): string {
  const prefix = hub.prefix.toUpperCase();
  const suffixRe = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let maxSuffix = 0;

  for (const row of existing) {
    const area = String(row.work_area_code ?? '').trim().toUpperCase();
    if (area !== prefix) continue;
    const code = String(row.employee_code ?? '').trim().toUpperCase();
    const match = code.match(suffixRe);
    if (match) {
      maxSuffix = Math.max(maxSuffix, Number.parseInt(match[1], 10));
    }
  }

  return `${prefix}-${String(maxSuffix + 1).padStart(3, '0')}`;
}

export function parseSalespersonEmployeeCode(code: string): { prefix: string; suffix: number } | null {
  const match = String(code ?? '').trim().toUpperCase().match(EMPLOYEE_CODE_RE);
  if (!match) return null;
  return { prefix: match[1], suffix: Number.parseInt(match[2], 10) };
}

export function hubForRegionId(regionId: string): CrossBorderHub {
  return (
    CROSS_BORDER_HUBS.find((h) => h.regionId === regionId) ??
    CROSS_BORDER_HUBS.find((h) => h.regionId === 'mandalay') ??
    CROSS_BORDER_HUBS[0]
  );
}

export function buildSalespersonDraft(
  regionId: string,
  existing: SalespersonRef[],
) {
  const hub = hubForRegionId(regionId);
  return {
    name: '',
    region_id: hub.regionId,
    work_area_code: hub.prefix,
    employee_code: nextSalespersonEmployeeCode(hub, existing),
    phone: '',
    address: '',
    join_date: new Date().toISOString().slice(0, 10),
    status: 'active' as const,
  };
}
