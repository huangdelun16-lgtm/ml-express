export const CUSTOMER_TYPES = ['customer', 'vip'] as const;

export const USER_LIST_PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_USER_PAGE_SIZE = 20;
export const CUSTOMER_EXPORT_MAX = 2000;

export type CustomerSort = 'newest' | 'balance' | 'orders' | 'name';
export type CustomerTypeFilter = 'all' | 'vip' | 'member';

export type CustomerListFilters = {
  filterStatus: string;
  filterType: CustomerTypeFilter;
  filterRegion: string;
  searchTerm: string;
};

type FilterChain = {
  in: (column: string, values: readonly string[]) => FilterChain;
  eq: (column: string, value: string) => FilterChain;
  or: (filters: string) => FilterChain;
};

/** Server-side customer list filters. VIP is `user_type=vip` only (never wallet balance). */
export function applyCustomerFilters<Q>(query: Q, filters: CustomerListFilters): Q {
  let q = query as FilterChain;
  q = q.in('user_type', CUSTOMER_TYPES);
  if (filters.filterStatus !== 'all') q = q.eq('status', filters.filterStatus);
  if (filters.filterType === 'vip') q = q.eq('user_type', 'vip');
  if (filters.filterType === 'member') q = q.eq('user_type', 'customer');
  if (filters.filterRegion !== 'all') q = q.eq('register_region', filters.filterRegion);
  const like = sanitizeIlike(filters.searchTerm);
  if (like) q = q.or(customerSearchOr(like));
  return q as Q;
}

/** Strip PostgREST `or()` / `ilike` metacharacters so search text cannot break the filter. */
export function sanitizeIlike(raw: string): string | null {
  const q = raw
    .trim()
    .replace(/[%_,.()'"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  if (!q) return null;
  return `%${q}%`;
}

/** Strip characters that would break a PostgREST `.eq` inside `.or()`. */
export function sanitizeEq(raw: string): string {
  return raw.replace(/[%_,.()'"\\]/g, '').trim().slice(0, 80);
}

export function isVipUserType(userType: string | null | undefined): boolean {
  return userType === 'vip';
}

export function customerSearchOr(pattern: string): string {
  return `name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},id.ilike.${pattern}`;
}

export function courierSearchOr(pattern: string): string {
  return `name.ilike.${pattern},phone.ilike.${pattern},employee_id.ilike.${pattern}`;
}

export function customerPackageOr(userId: string, phone: string): string {
  const parts = [`customer_id.eq.${sanitizeEq(userId)}`];
  const p = sanitizeEq(phone);
  if (p) parts.push(`sender_phone.eq.${p}`);
  return parts.join(',');
}

export function customerOrder(sortBy: CustomerSort): { column: string; ascending: boolean } {
  switch (sortBy) {
    case 'balance':
      return { column: 'balance', ascending: false };
    case 'orders':
      return { column: 'total_orders', ascending: false };
    case 'name':
      return { column: 'name', ascending: true };
    default:
      return { column: 'created_at', ascending: false };
  }
}

export function pageRange(page: number, pageSize: number): { from: number; to: number; size: number } {
  const size = Math.min(100, Math.max(1, pageSize));
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * size;
  return { from, to: from + size - 1, size };
}

export function totalPagesFor(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, count) / Math.max(1, pageSize)));
}
