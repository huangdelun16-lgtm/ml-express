import { packageHasCod } from './packageCodAmount';

export type CodSettleKind = 'admin' | 'merchant';

export type CodSettledBy = CodSettleKind | 'unknown' | null;

export type CodDiffKind =
  | 'unsettled'
  | 'admin_settled'
  | 'merchant_settled'
  | 'unknown_settled'
  | 'rider_pending_merchant'
  | 'merchant_ahead_of_rider';

export type CodDiffFilter = 'needs' | 'all' | CodDiffKind;

export type CodLang = 'zh' | 'en' | 'my';

export type CodSettleActorInput = {
  kind: CodSettleKind;
  id?: string;
  name?: string;
};

export type CodSettlePatch = {
  cod_settled: true;
  cod_settled_at: string;
  cod_settled_by: CodSettleKind;
  cod_settled_by_id: string;
  cod_settled_by_name: string;
};

export type CodSettlementLike = {
  id?: string;
  status?: string | null;
  description?: string | null;
  sender_name?: string | null;
  courier?: string | null;
  delivery_time?: string | null;
  delivery_store_id?: string | null;
  delivery_store_name?: string | null;
  cod_amount?: number | null;
  cod_settled?: boolean | null;
  cod_settled_at?: string | null;
  cod_settled_by?: string | null;
  cod_settled_by_id?: string | null;
  cod_settled_by_name?: string | null;
  rider_settled?: boolean | null;
  rider_settled_at?: string | null;
};

export const COD_DIFF_NEEDS_RECONCILE: readonly CodDiffKind[] = [
  'unsettled',
  'unknown_settled',
  'rider_pending_merchant',
  'merchant_ahead_of_rider',
];

export const COD_DIFF_KINDS: readonly CodDiffKind[] = [
  'unsettled',
  'admin_settled',
  'merchant_settled',
  'unknown_settled',
  'rider_pending_merchant',
  'merchant_ahead_of_rider',
];

export function isDeliveredCodStatus(status?: string | null): boolean {
  const s = String(status || '').trim();
  return s === '已送达' || s === '已完成';
}

export function normalizeCodSettledBy(raw?: string | null): CodSettleKind | 'unknown' | null {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'admin' || s === 'merchant') return s;
  return 'unknown';
}

export function readCodSettledBy(pkg: Pick<CodSettlementLike, 'cod_settled' | 'cod_settled_by'>): CodSettledBy {
  if (!pkg.cod_settled) return null;
  return normalizeCodSettledBy(pkg.cod_settled_by) ?? 'unknown';
}

export function buildCodSettlePatch(
  actor: CodSettleActorInput,
  now = new Date().toISOString(),
): CodSettlePatch {
  const kind: CodSettleKind = actor.kind === 'merchant' ? 'merchant' : 'admin';
  return {
    cod_settled: true,
    cod_settled_at: now,
    cod_settled_by: kind,
    cod_settled_by_id: String(actor.id || '').trim(),
    cod_settled_by_name: String(actor.name || '').trim(),
  };
}

export function stripCodSettledByFields<T extends Record<string, unknown>>(
  patch: T,
): Omit<T, 'cod_settled_by' | 'cod_settled_by_id' | 'cod_settled_by_name'> {
  const next = { ...patch };
  delete next.cod_settled_by;
  delete next.cod_settled_by_id;
  delete next.cod_settled_by_name;
  return next;
}

export function isMissingCodSettledByColumn(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  const message = String(e?.message || '');
  return (
    e?.code === 'PGRST204' ||
    e?.code === '42703' ||
    /cod_settled_by/i.test(message)
  );
}

export function classifyCodDiff(pkg: CodSettlementLike): CodDiffKind | null {
  const delivered = isDeliveredCodStatus(pkg.status);
  const hasCod = packageHasCod({
    cod_amount: pkg.cod_amount ?? undefined,
    description: pkg.description ?? undefined,
  });
  const settled = !!pkg.cod_settled;
  const rider = !!pkg.rider_settled;
  const actor = readCodSettledBy(pkg);

  if (!delivered && !settled) return null;
  if (!hasCod && !settled) return null;

  if (settled && !rider && hasCod) return 'merchant_ahead_of_rider';
  if (!settled && delivered && hasCod) {
    return rider ? 'rider_pending_merchant' : 'unsettled';
  }
  if (settled) {
    if (actor === 'admin') return 'admin_settled';
    if (actor === 'merchant') return 'merchant_settled';
    return 'unknown_settled';
  }
  return null;
}

export function matchesCodDiffFilter(kind: CodDiffKind, filter: CodDiffFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'needs') return COD_DIFF_NEEDS_RECONCILE.includes(kind);
  return kind === filter;
}

export function filterCodDiffRows<T extends CodSettlementLike>(
  rows: T[],
  filter: CodDiffFilter = 'needs',
): Array<T & { diffKind: CodDiffKind }> {
  const out: Array<T & { diffKind: CodDiffKind }> = [];
  for (const row of rows) {
    const diffKind = classifyCodDiff(row);
    if (!diffKind || !matchesCodDiffFilter(diffKind, filter)) continue;
    out.push({ ...row, diffKind });
  }
  return out;
}

export type CodDiffSummary = Record<CodDiffKind, number> & {
  total: number;
  needs: number;
};

export function emptyCodDiffSummary(): CodDiffSummary {
  return {
    unsettled: 0,
    admin_settled: 0,
    merchant_settled: 0,
    unknown_settled: 0,
    rider_pending_merchant: 0,
    merchant_ahead_of_rider: 0,
    total: 0,
    needs: 0,
  };
}

export function summarizeCodDiff(rows: CodSettlementLike[]): CodDiffSummary {
  const summary = emptyCodDiffSummary();
  for (const row of rows) {
    const kind = classifyCodDiff(row);
    if (!kind) continue;
    summary[kind] += 1;
    summary.total += 1;
    if (COD_DIFF_NEEDS_RECONCILE.includes(kind)) summary.needs += 1;
  }
  return summary;
}

export function formatCodSettledByLabel(
  pkg: Pick<CodSettlementLike, 'cod_settled' | 'cod_settled_by' | 'cod_settled_by_name'>,
  language: CodLang = 'zh',
): string {
  const actor = readCodSettledBy(pkg);
  const name = String(pkg.cod_settled_by_name || '').trim();
  if (actor === 'admin') {
    if (language === 'en') return name ? `Admin · ${name}` : 'Admin';
    if (language === 'my') return name ? `အက်ဒမင် · ${name}` : 'အက်ဒမင်';
    return name ? `后台 · ${name}` : '后台';
  }
  if (actor === 'merchant') {
    if (language === 'en') return name ? `Store · ${name}` : 'Store';
    if (language === 'my') return name ? `ဆိုင် · ${name}` : 'ဆိုင်';
    return name ? `商家 · ${name}` : '商家';
  }
  if (actor === 'unknown') {
    if (language === 'en') return 'Unknown party';
    if (language === 'my') return 'မသိရှိရ';
    return '未记录结清方';
  }
  return '';
}

export function merchantSettledByLabel(
  settledBy?: string | null,
  language: CodLang = 'zh',
): string {
  const actor = normalizeCodSettledBy(settledBy);
  if (actor === 'admin') {
    return language === 'zh' ? '后台已结' : language === 'en' ? 'Settled by admin' : 'အက်ဒမင်မှ ရှင်းပြီး';
  }
  if (actor === 'merchant') {
    return language === 'zh' ? '本店已结' : language === 'en' ? 'Settled by store' : 'ဆိုင်မှ ရှင်းပြီး';
  }
  return language === 'zh'
    ? '已结清（未记录结清方）'
    : language === 'en'
      ? 'Settled (unknown party)'
      : 'ရှင်းပြီး (မသိရှိရ)';
}

export function codDiffKindLabel(kind: CodDiffKind, language: CodLang = 'zh'): string {
  const zh: Record<CodDiffKind, string> = {
    unsettled: '已送达未结清',
    admin_settled: '后台已结',
    merchant_settled: '商家已结',
    unknown_settled: '已结清但未记录结清方',
    rider_pending_merchant: '骑手已结、商家未结',
    merchant_ahead_of_rider: '商家已结、骑手未结',
  };
  const en: Record<CodDiffKind, string> = {
    unsettled: 'Delivered, merchant COD open',
    admin_settled: 'Settled by admin',
    merchant_settled: 'Settled by store',
    unknown_settled: 'Settled, party unknown',
    rider_pending_merchant: 'Rider cleared, merchant COD open',
    merchant_ahead_of_rider: 'Merchant COD settled, rider open',
  };
  const my: Record<CodDiffKind, string> = {
    unsettled: 'ပို့ပြီး မရှင်းရသေး',
    admin_settled: 'အက်ဒမင်မှ ရှင်းပြီး',
    merchant_settled: 'ဆိုင်မှ ရှင်းပြီး',
    unknown_settled: 'ရှင်းပြီး (မသိရှိရ)',
    rider_pending_merchant: 'ကောင်ရီယာရှင်းပြီး၊ ဆိုင်မရှင်း',
    merchant_ahead_of_rider: 'ဆိုင်ရှင်းပြီး၊ ကောင်ရီယာမရှင်း',
  };
  if (language === 'en') return en[kind];
  if (language === 'my') return my[kind];
  return zh[kind];
}

export function yesNoLabel(value: boolean, language: CodLang = 'zh'): string {
  if (language === 'en') return value ? 'Yes' : 'No';
  if (language === 'my') return value ? 'ဟုတ်' : 'မဟုတ်';
  return value ? '是' : '否';
}

export function buildCodDiffCsvHeader(language: CodLang = 'zh'): string[] {
  if (language === 'en') {
    return [
      'order_id',
      'store_id',
      'store_name',
      'status',
      'cod_amount',
      'diff_kind',
      'merchant_settled',
      'settled_by',
      'settled_by_name',
      'settled_at',
      'rider_settled',
      'rider_settled_at',
      'courier',
      'delivered_at',
    ];
  }
  return [
    '订单号',
    '店铺ID',
    '店铺名称',
    '状态',
    '代收款',
    '差异类型',
    '商家已结',
    '结清方',
    '结清人',
    '结清时间',
    '骑手已结',
    '骑手结清时间',
    '骑手',
    '送达时间',
  ];
}

export function buildCodDiffCsvRow(
  pkg: CodSettlementLike & { diffKind: CodDiffKind },
  language: CodLang = 'zh',
): unknown[] {
  return [
    pkg.id ?? '',
    pkg.delivery_store_id ?? '',
    pkg.delivery_store_name || pkg.sender_name || '',
    pkg.status ?? '',
    pkg.cod_amount ?? 0,
    codDiffKindLabel(pkg.diffKind, language),
    yesNoLabel(!!pkg.cod_settled, language),
    formatCodSettledByLabel(pkg, language),
    pkg.cod_settled_by_name ?? '',
    pkg.cod_settled_at ?? '',
    yesNoLabel(!!pkg.rider_settled, language),
    pkg.rider_settled_at ?? '',
    pkg.courier ?? '',
    pkg.delivery_time ?? '',
  ];
}
