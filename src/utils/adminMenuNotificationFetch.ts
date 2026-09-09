import { supabase } from '../services/supabase';
import { detectFinanceRegionPrefix } from '../pages/FinanceManagement.helpers';
import { summarizeCodDiff } from './codSettlement';
import {
  ensureModuleSeenInitialized,
  type AdminTodoCounts,
} from './adminMenuNotifications';

function readPackageRegionPrefix(): string | undefined {
  const role =
    sessionStorage.getItem('currentUserRole') ||
    localStorage.getItem('currentUserRole') ||
    '';
  if (role === 'admin') return undefined;
  const user =
    sessionStorage.getItem('currentUser') ||
    localStorage.getItem('currentUser') ||
    '';
  const region =
    sessionStorage.getItem('currentUserRegion') ||
    localStorage.getItem('currentUserRegion') ||
    '';
  return detectFinanceRegionPrefix(user, region) || undefined;
}

async function countHead(
  run: () => PromiseLike<{ count: number | null; error: { message?: string } | null }>,
): Promise<number> {
  try {
    const { count, error } = await run();
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

function withPackageRegion<T extends { like: (col: string, val: string) => T }>(
  query: T,
  prefix?: string,
): T {
  return prefix ? query.like('id', `${prefix}%`) : query;
}

const RECONCILE_PAGE = 500;
const RECONCILE_MAX = 2500;

export async function fetchAdminMenuExtraCounts(): Promise<
  Pick<
    AdminTodoCounts,
    | 'pendingCityOrders'
    | 'pendingMerchantAccept'
    | 'pendingMerchantReconcile'
    | 'pendingCrossBorderExceptions'
    | 'pendingUsers'
    | 'unseenUsers'
    | 'unseenBanners'
    | 'unseenAudit'
    | 'unseenFinanceRecords'
    | 'unseenStores'
    | 'unseenMetricDrafts'
  >
> {
  const seen = ensureModuleSeenInitialized();
  const regionPrefix = readPackageRegionPrefix();

  const cityBase = () => {
    let q = supabase.from('packages').select('id', { count: 'exact', head: true });
    q = withPackageRegion(q, regionPrefix);
    return q;
  };

  const [
    cityAttentionRes,
    merchantAcceptRes,
    pendingUsersRes,
    unseenUsersRes,
    unseenBannersRes,
    unseenAuditRes,
    unseenFinanceRes,
    unseenStoresRes,
    unseenMetricRes,
    exceptionRes,
    reconcileRows,
  ] = await Promise.all([
    countHead(() => cityBase().in('status', ['待确认', '待取件', '待收款'])),
    countHead(() => cityBase().eq('status', '待确认')),
    countHead(() =>
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ),
    countHead(() =>
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', seen.users),
    ),
    countHead(() =>
      supabase
        .from('banners')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', seen.banners),
    ),
    countHead(() =>
      supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gt('action_time', seen.supervision),
    ),
    countHead(() =>
      supabase
        .from('finances')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', seen.finance),
    ),
    countHead(() =>
      supabase
        .from('delivery_stores')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', seen.merchant_stores),
    ),
    countHead(() =>
      supabase
        .from('import_metric_drafts')
        .select('id', { count: 'exact', head: true })
        .gt('created_at', seen.metric_management),
    ),
    countHead(() =>
      supabase
        .from('inventory_exceptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
    ),
    fetchMerchantReconcileNeeds(regionPrefix),
  ]);

  return {
    pendingCityOrders: cityAttentionRes,
    pendingMerchantAccept: merchantAcceptRes,
    pendingMerchantReconcile: reconcileRows,
    pendingCrossBorderExceptions: exceptionRes,
    pendingUsers: pendingUsersRes,
    unseenUsers: unseenUsersRes,
    unseenBanners: unseenBannersRes,
    unseenAudit: unseenAuditRes,
    unseenFinanceRecords: unseenFinanceRes,
    unseenStores: unseenStoresRes,
    unseenMetricDrafts: unseenMetricRes,
  };
}

async function fetchMerchantReconcileNeeds(regionPrefix?: string): Promise<number> {
  try {
    const rows: Parameters<typeof summarizeCodDiff>[0] = [];
    for (let from = 0; from < RECONCILE_MAX; from += RECONCILE_PAGE) {
      let query = supabase
        .from('packages')
        .select(
          'id, status, description, sender_name, courier, delivery_time, delivery_store_id, delivery_store_name, cod_amount, cod_settled, cod_settled_at, cod_settled_by, rider_settled',
        )
        .in('status', ['已送达', '已完成'])
        .not('delivery_store_id', 'is', null)
        .or('cod_settled.eq.false,cod_settled.is.null,rider_settled.eq.false,rider_settled.is.null')
        .range(from, from + RECONCILE_PAGE - 1);
      query = withPackageRegion(query, regionPrefix);
      const { data, error } = await query;
      if (error) return 0;
      const chunk = data ?? [];
      rows.push(...chunk);
      if (chunk.length < RECONCILE_PAGE) break;
    }
    return summarizeCodDiff(rows).needs;
  } catch {
    return 0;
  }
}
