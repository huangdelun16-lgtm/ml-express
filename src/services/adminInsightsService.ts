import { supabase, Package, CourierSalary } from './supabase';

export type DatePreset = 'today' | '7d' | '30d' | 'custom';

export function getRangeForPreset(preset: DatePreset, customStart?: string, customEnd?: string): { start: string; end: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  let start = new Date();

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (preset === '7d') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (preset === '30d') {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  } else if (preset === 'custom' && customStart && customEnd) {
    const a = new Date(customStart);
    a.setHours(0, 0, 0, 0);
    const b = new Date(customEnd);
    b.setHours(23, 59, 59, 999);
    return { start: a.toISOString(), end: b.toISOString() };
  } else {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

/** 与财务/领区逻辑对齐：优先 DB region，其次单号前缀 */
export function inferPackageRegion(p: Package): string {
  if (p.region && String(p.region).trim()) {
    return String(p.region).toLowerCase().trim();
  }
  const id = (p.id || '').toUpperCase();
  if (id.startsWith('YGN')) return 'yangon';
  if (id.startsWith('MDY')) return 'mandalay';
  if (id.startsWith('POL')) return 'maymyo';
  return 'other';
}

export async function fetchPackagesBetween(startIso: string, endIso: string): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchPackagesBetween:', error);
    return [];
  }
  return data || [];
}

export function filterPackagesByRegion(pkgs: Package[], region: string | 'all'): Package[] {
  if (region === 'all') return pkgs;
  return pkgs.filter((p) => inferPackageRegion(p) === region);
}

export type PackageSummary = {
  total: number;
  byStatus: Record<string, number>;
  byRegion: Record<string, number>;
  delivered: number;
  inTransit: number;
  pending: number;
  codTotalMmk: number;
};

export function summarizePackages(pkgs: Package[]): PackageSummary {
  const byStatus: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  let delivered = 0;
  let inTransit = 0;
  let pending = 0;
  let codTotalMmk = 0;

  for (const p of pkgs) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    const reg = inferPackageRegion(p);
    byRegion[reg] = (byRegion[reg] || 0) + 1;
    if (p.status === '已送达') delivered++;
    if (['已取件', '配送中', '配送进行中'].includes(p.status)) inTransit++;
    if (p.status === '待取件' || p.status === '待收款') pending++;
    const cod = typeof p.cod_amount === 'number' ? p.cod_amount : parseFloat(String(p.cod_amount || 0)) || 0;
    if (cod > 0) codTotalMmk += cod;
  }

  return {
    total: pkgs.length,
    byStatus,
    byRegion,
    delivered,
    inTransit,
    pending,
    codTotalMmk,
  };
}

export type RechargeRangeSummary = {
  count: number;
  completed: number;
  pending: number;
  rejected: number;
  amountCompletedMmk: number;
};

export async function fetchRechargeSummaryBetween(startIso: string, endIso: string): Promise<RechargeRangeSummary> {
  const { data, error } = await supabase
    .from('recharge_requests')
    .select('status, amount')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error || !data) {
    console.error('fetchRechargeSummaryBetween:', error);
    return { count: 0, completed: 0, pending: 0, rejected: 0, amountCompletedMmk: 0 };
  }

  let completed = 0;
  let pending = 0;
  let rejected = 0;
  let amountCompletedMmk = 0;
  for (const r of data) {
    if (r.status === 'completed') {
      completed++;
      amountCompletedMmk += Number(r.amount) || 0;
    } else if (r.status === 'pending') pending++;
    else if (r.status === 'rejected') rejected++;
  }
  return { count: data.length, completed, pending, rejected, amountCompletedMmk };
}

export type RiderStatRow = {
  courierName: string;
  courierId: string | null;
  delivered: number;
  inProgress: number;
  pendingPickup: number;
  alertCount: number;
  creditScore: number | null;
  lastActive: string | null;
};

export async function fetchRiderPerformanceBetween(startIso: string, endIso: string): Promise<RiderStatRow[]> {
  const [pkgs, couriersRes, alertsRes] = await Promise.all([
    fetchPackagesBetween(startIso, endIso),
    supabase.from('couriers').select('id,name,credit_score,last_active'),
    supabase
      .from('delivery_alerts')
      .select('courier_id')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
  ]);

  const couriers = couriersRes.data || [];
  const idByName = new Map<string, (typeof couriers)[0]>();
  for (const c of couriers) {
    const n = c.name?.trim();
    if (n) idByName.set(n, c);
  }
  const alertById: Record<string, number> = {};
  for (const a of alertsRes.data || []) {
    if (!a.courier_id) continue;
    alertById[a.courier_id] = (alertById[a.courier_id] || 0) + 1;
  }

  const agg: Record<
    string,
    { delivered: number; inProgress: number; pendingPickup: number }
  > = {};

  for (const p of pkgs) {
    const c = (p.courier || '').trim();
    if (!c || c === '待分配') continue;
    if (!agg[c]) agg[c] = { delivered: 0, inProgress: 0, pendingPickup: 0 };
    if (p.status === '已送达') agg[c].delivered++;
    else if (['已取件', '配送中', '配送进行中'].includes(p.status)) agg[c].inProgress++;
    else if (p.status === '待取件') agg[c].pendingPickup++;
  }

  const rows: RiderStatRow[] = Object.keys(agg).map((name) => {
    const meta = idByName.get(name);
    const id = meta?.id ?? null;
    return {
      courierName: name,
      courierId: id,
      delivered: agg[name].delivered,
      inProgress: agg[name].inProgress,
      pendingPickup: agg[name].pendingPickup,
      alertCount: id ? alertById[id] || 0 : 0,
      creditScore: meta?.credit_score ?? null,
      lastActive: meta?.last_active ?? null,
    };
  });

  rows.sort((a, b) => b.delivered + b.inProgress - (a.delivered + a.inProgress));
  return rows;
}

/**
 * 工资结算周期与页面所选 [start,end] 在时间轴上有交集的记录（用于绩效页导出工资表）
 * 条件：period_start_date ≤ rangeEnd 且 period_end_date ≥ rangeStart（按日期比较）
 */
export async function fetchCourierSalariesOverlappingRange(startIso: string, endIso: string): Promise<CourierSalary[]> {
  const startDay = startIso.slice(0, 10);
  const endDay = endIso.slice(0, 10);
  const { data, error } = await supabase
    .from('courier_salaries')
    .select('*')
    .lte('period_start_date', endDay)
    .gte('period_end_date', startDay)
    .order('period_end_date', { ascending: false });

  if (error) {
    console.error('fetchCourierSalariesOverlappingRange:', error);
    return [];
  }
  return (data || []) as CourierSalary[];
}

export type SearchHitType = 'package' | 'user' | 'store' | 'courier';

export type SearchHit = {
  type: SearchHitType;
  id: string;
  title: string;
  subtitle?: string;
  path: string;
};

function sanitizeSearchTerm(raw: string): string {
  const t = raw.trim().slice(0, 48);
  return t.length >= 2 ? t : '';
}

export async function globalSearch(rawQuery: string, perType = 6): Promise<SearchHit[]> {
  const term = sanitizeSearchTerm(rawQuery);
  if (term.length < 2) return [];

  const safePattern = term.replace(/%/g, '');
  const like = `%${safePattern}%`;
  const hits: SearchHit[] = [];

  const packageHits = await (async (): Promise<SearchHit[]> => {
    const list: SearchHit[] = [];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    const tasks: Promise<void>[] = [];
    if (isUuid) {
      tasks.push(
        (async () => {
          const { data } = await supabase
            .from('packages')
            .select('id,receiver_name,status')
            .eq('id', term)
            .limit(1);
          const p = data?.[0];
          if (p) {
            list.push({
              type: 'package',
              id: p.id,
              title: `包裹 ${p.id}`,
              subtitle: `${p.receiver_name || ''} · ${p.status || ''}`,
              path: `/admin/city-packages?q=${encodeURIComponent(p.id)}`,
            });
          }
        })()
      );
    }

    tasks.push(
      (async () => {
        const { data, error } = await supabase
          .from('packages')
          .select('id,receiver_name,receiver_phone,sender_phone,transfer_code,status')
          .or(
            `receiver_phone.ilike.${like},sender_phone.ilike.${like},transfer_code.ilike.${like},id.ilike.${like}`
          )
          .limit(perType);
        if (error) console.warn('globalSearch packages:', error);
        for (const p of data || []) {
          list.push({
            type: 'package',
            id: p.id,
            title: `包裹 ${p.id.slice(0, 18)}`,
            subtitle: `${p.receiver_name || ''} · ${p.status || ''}`,
            path: `/admin/city-packages?q=${encodeURIComponent(p.id)}`,
          });
        }
      })()
    );

    await Promise.all(tasks);
    return list;
  })();

  const [usersRes, storesRes, couriersRes] = await Promise.all([
    supabase
      .from('users')
      .select('id,name,phone,user_type')
      .or(`phone.ilike.${like},name.ilike.${like},email.ilike.${like}`)
      .limit(perType),
    supabase
      .from('delivery_stores')
      .select('id,store_name,store_code')
      .or(`store_name.ilike.${like},store_code.ilike.${like}`)
      .limit(perType),
    supabase.from('couriers').select('id,name,phone').or(`name.ilike.${like},phone.ilike.${like}`).limit(perType),
  ]);

  hits.push(...packageHits);

  for (const u of usersRes.data || []) {
    const tab =
      u.user_type === 'courier'
        ? 'courier_management'
        : u.user_type === 'merchant'
          ? 'merchant_store'
          : 'customer_list';
    hits.push({
      type: 'user',
      id: u.id,
      title: u.name || u.phone || u.id,
      subtitle: `${u.phone || ''} · ${u.user_type || ''}`,
      path: `/admin/users?q=${encodeURIComponent(u.phone || u.name || '')}&tab=${tab}`,
    });
  }

  for (const s of storesRes.data || []) {
    hits.push({
      type: 'store',
      id: s.id || s.store_code || '',
      title: s.store_name || s.store_code || '',
      subtitle: s.store_code,
      path: `/admin/delivery-stores?q=${encodeURIComponent(s.store_name || s.store_code || '')}`,
    });
  }

  for (const c of couriersRes.data || []) {
    hits.push({
      type: 'courier',
      id: c.id,
      title: c.name || c.phone || '',
      subtitle: c.phone || '',
      path: `/admin/users?q=${encodeURIComponent(c.phone || c.name || '')}&tab=courier_management`,
    });
  }

  const seen = new Set<string>();
  const dedup: SearchHit[] = [];
  for (const h of hits) {
    const key = `${h.type}:${h.id}:${h.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(h);
  }
  return dedup.slice(0, 24);
}

export function toCsvRow(cells: (string | number | undefined | null)[]): string {
  return cells
    .map((c) => {
      const s = c === undefined || c === null ? '' : String(c);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(',');
}
