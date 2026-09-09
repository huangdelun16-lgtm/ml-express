import { supabase } from '../services/supabase';
import type { Package } from '../services/supabase';
import {
  detectFinanceRegionPrefix,
  getLocalDateYYYYMMDD,
  isPriorUnsettledRiderCashPackage,
} from '../pages/FinanceManagement.helpers';

const FINANCE_CASH_PAGE = 500;
const FINANCE_CASH_MAX = 3000;

type RiderCashTodoRow = Pick<
  Package,
  | 'id'
  | 'payment_method'
  | 'status'
  | 'rider_settled'
  | 'delivery_time'
  | 'updated_at'
  | 'created_at'
  | 'create_time'
>;

function readFinanceTodoRegionPrefix(): string | undefined {
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

/**
 * 左菜单「财务管理」通知：往日已送达现金单、骑手尚未结清。
 * 与财务页「当日收款管理」Tab 橙点同一判断。
 */
export async function fetchPendingFinanceCashCount(): Promise<number> {
  const today = getLocalDateYYYYMMDD();
  const regionPrefix = readFinanceTodoRegionPrefix();
  const rows: RiderCashTodoRow[] = [];

  for (let from = 0; from < FINANCE_CASH_MAX; from += FINANCE_CASH_PAGE) {
    const { data, error } = await supabase
      .from('packages')
      .select(
        'id, payment_method, status, rider_settled, delivery_time, updated_at, created_at, create_time',
      )
      .eq('payment_method', 'cash')
      .in('status', ['已送达', '已完成'])
      .or('rider_settled.eq.false,rider_settled.is.null')
      .range(from, from + FINANCE_CASH_PAGE - 1);

    if (error) {
      console.error('fetchPendingFinanceCashCount failed:', error);
      return 0;
    }

    const chunk = (data ?? []) as RiderCashTodoRow[];
    rows.push(...chunk);
    if (chunk.length < FINANCE_CASH_PAGE) break;
  }

  return rows.filter((pkg) =>
    isPriorUnsettledRiderCashPackage(pkg as Package, today, regionPrefix),
  ).length;
}
