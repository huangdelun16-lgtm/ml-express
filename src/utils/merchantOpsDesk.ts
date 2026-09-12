import { localDateKey, stockOnlyIssue, type MerchantOpsWatchRow } from './merchantOpsWatch';

export const MERCHANT_OPS_DESK_LS = 'admin-merchant-ops-desk';
export const MERCHANT_OPS_DESK_SETTING_KEY = 'merchant_ops.desk';

export type DeskContact = {
  at: string;
  by: string;
  note: string;
};

export type MerchantOpsDeskState = {
  contacted: Record<string, DeskContact>;
  ignoreDay: string;
  ignoredStoreIds: string[];
};

export function emptyDeskState(): MerchantOpsDeskState {
  return { contacted: {}, ignoreDay: '', ignoredStoreIds: [] };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function parseDeskState(raw: unknown): MerchantOpsDeskState {
  const obj = asRecord(raw);
  const contacted: Record<string, DeskContact> = {};
  const rawContacted = asRecord(obj.contacted);
  for (const [storeId, value] of Object.entries(rawContacted)) {
    const row = asRecord(value);
    const at = String(row.at || '').trim();
    if (!storeId || !at) continue;
    contacted[storeId] = {
      at,
      by: String(row.by || '').trim(),
      note: String(row.note || '').trim(),
    };
  }
  const ignored = Array.isArray(obj.ignoredStoreIds)
    ? obj.ignoredStoreIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];
  return {
    contacted,
    ignoreDay: String(obj.ignoreDay || '').trim(),
    ignoredStoreIds: Array.from(new Set(ignored)),
  };
}

export function normalizeDeskForDay(
  state: MerchantOpsDeskState,
  day = localDateKey(),
): MerchantOpsDeskState {
  if (state.ignoreDay === day) return { ...state, ignoreDay: day };
  return { ...state, ignoreDay: day, ignoredStoreIds: [] };
}

export function mergeDeskStates(
  remote: MerchantOpsDeskState,
  local: MerchantOpsDeskState,
  day = localDateKey(),
): MerchantOpsDeskState {
  const a = normalizeDeskForDay(remote, day);
  const b = normalizeDeskForDay(local, day);
  return {
    contacted: { ...a.contacted, ...b.contacted },
    ignoreDay: day,
    ignoredStoreIds: Array.from(new Set([...a.ignoredStoreIds, ...b.ignoredStoreIds])),
  };
}

export function isStoreIgnoredToday(
  state: MerchantOpsDeskState,
  storeId: string,
  day = localDateKey(),
): boolean {
  const normalized = normalizeDeskForDay(state, day);
  return normalized.ignoredStoreIds.includes(storeId);
}

export function shouldHideStockOnlyIgnored(
  row: MerchantOpsWatchRow,
  state: MerchantOpsDeskState,
  day = localDateKey(),
): boolean {
  return stockOnlyIssue(row) && isStoreIgnoredToday(state, row.storeId, day);
}

export function markStoreContacted(
  state: MerchantOpsDeskState,
  storeId: string,
  actor: string,
  note: string,
  at = new Date().toISOString(),
): MerchantOpsDeskState {
  return {
    ...state,
    contacted: {
      ...state.contacted,
      [storeId]: {
        at,
        by: actor.trim() || '调度',
        note: note.trim(),
      },
    },
  };
}

export function setStoreIgnoredToday(
  state: MerchantOpsDeskState,
  storeId: string,
  ignored: boolean,
  day = localDateKey(),
): MerchantOpsDeskState {
  const normalized = normalizeDeskForDay(state, day);
  const nextIds = ignored
    ? Array.from(new Set([...normalized.ignoredStoreIds, storeId]))
    : normalized.ignoredStoreIds.filter((id) => id !== storeId);
  return { ...normalized, ignoredStoreIds: nextIds };
}

export function readLocalDesk(): MerchantOpsDeskState {
  if (typeof localStorage === 'undefined') return emptyDeskState();
  try {
    const raw = localStorage.getItem(MERCHANT_OPS_DESK_LS);
    if (!raw) return emptyDeskState();
    return parseDeskState(JSON.parse(raw));
  } catch {
    return emptyDeskState();
  }
}

export function writeLocalDesk(state: MerchantOpsDeskState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MERCHANT_OPS_DESK_LS, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function toWhatsAppDigits(raw: string): string {
  let digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 8) {
    return `95${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, body: string): string {
  const digits = toWhatsAppDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

export function storePhone(row: Pick<MerchantOpsWatchRow, 'phone' | 'managerPhone'>): string {
  return String(row.managerPhone || row.phone || '').trim();
}

export function buildNudgeMessage(
  row: Pick<MerchantOpsWatchRow, 'storeName' | 'storeCode' | 'pending'>,
  language: string,
): string {
  const n = row.pending.length;
  const who = row.storeCode ? `${row.storeName}（${row.storeCode}）` : row.storeName;
  if (language === 'my') {
    return `[ML Express] ${who} တွင် လက်ခံရန်ကျန် ${n} ခုရှိပါသည်။ ကျေးဇူးပြု၍ Merchant App/Web တွင် အမြန်လက်ခံပါ။`;
  }
  if (language === 'en') {
    return `[ML Express] ${who}: ${n} order(s) still awaiting confirmation. Please accept in merchant web/app now.`;
  }
  return `【ML Express】调度催接单：${who} 还有 ${n} 单待确认，请尽快在商家端接单。`;
}

function csvCell(value: string | number | undefined | null): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildOpsWatchTable(
  rows: MerchantOpsWatchRow[],
  desk: MerchantOpsDeskState,
  day = localDateKey(),
): { headers: string[]; rows: Array<Array<string | number>> } {
  const headers = [
    '店码',
    '店名',
    '区域',
    '店铺状态',
    '营业时段',
    '今日打烊',
    '今日休假',
    '营业中打烊',
    '待接单',
    '超时待接',
    '缺货',
    '偏低',
    '电话',
    '已联系',
    '联系人',
    '备注',
    '今日忽略',
  ];
  const tableRows = rows.map((row) => {
    const contact = desk.contacted[row.storeId];
    return [
      row.storeCode,
      row.storeName,
      row.region,
      row.status,
      row.hours.hoursLabel,
      row.hours.closedToday ? '1' : '0',
      row.hours.onVacation ? '1' : '0',
      row.hours.closedToday && row.hours.inHours ? '1' : '0',
      row.pending.length,
      row.overdueCount,
      row.outOfStockCount,
      row.lowStockCount,
      storePhone(row),
      contact?.at || '',
      contact?.by || '',
      contact?.note || '',
      isStoreIgnoredToday(desk, row.storeId, day) ? '1' : '0',
    ];
  });
  return { headers, rows: tableRows };
}

export function buildOpsWatchCsv(
  rows: MerchantOpsWatchRow[],
  desk: MerchantOpsDeskState,
  day = localDateKey(),
): string {
  const table = buildOpsWatchTable(rows, desk, day);
  return [table.headers, ...table.rows].map((line) => line.map(csvCell).join(',')).join('\n');
}

export function downloadCsv(filename: string, text: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
