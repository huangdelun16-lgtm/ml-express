import {
  applyCustomerFilters,
  CUSTOMER_EXPORT_MAX,
  CUSTOMER_TYPES,
  customerOrder,
  customerPackageOr,
  customerSearchOr,
  courierSearchOr,
  isVipUserType,
  pageRange,
  sanitizeEq,
  sanitizeIlike,
  totalPagesFor,
  type CustomerListFilters,
} from './adminUserListQuery';

function createFilterSpy() {
  const calls: string[] = [];
  const api = {
    in(column: string, values: readonly string[]) {
      calls.push(`in:${column}:${[...values].join('|')}`);
      return api;
    },
    eq(column: string, value: string) {
      calls.push(`eq:${column}:${value}`);
      return api;
    },
    or(value: string) {
      calls.push(`or:${value}`);
      return api;
    },
  };
  return { api, calls };
}

const baseFilters = (): CustomerListFilters => ({
  filterStatus: 'all',
  filterType: 'all',
  filterRegion: 'all',
  searchTerm: '',
});

describe('adminUserListQuery', () => {
  it('sanitizeIlike strips or() metacharacters and wraps ilike wildcards', () => {
    expect(sanitizeIlike('  ')).toBeNull();
    expect(sanitizeIlike('Aung')).toBe('%Aung%');
    expect(sanitizeIlike('09,123%(vip)')).toBe('%09 123 vip%');
  });

  it('builds search or() clauses from a sanitized pattern', () => {
    expect(customerSearchOr('%aung%')).toBe(
      'name.ilike.%aung%,phone.ilike.%aung%,email.ilike.%aung%,id.ilike.%aung%',
    );
    expect(courierSearchOr('%09%')).toBe(
      'name.ilike.%09%,phone.ilike.%09%,employee_id.ilike.%09%',
    );
  });

  it('treats VIP as user_type=vip only, not wallet balance', () => {
    expect(isVipUserType('vip')).toBe(true);
    expect(isVipUserType('customer')).toBe(false);
    expect(isVipUserType(undefined)).toBe(false);
  });

  it('builds package match or() from id and phone', () => {
    expect(sanitizeEq('09,123')).toBe('09123');
    expect(customerPackageOr('USR123', '09-111')).toBe(
      'customer_id.eq.USR123,sender_phone.eq.09-111',
    );
  });

  it('maps sort and pagination', () => {
    expect(customerOrder('newest')).toEqual({ column: 'created_at', ascending: false });
    expect(customerOrder('balance')).toEqual({ column: 'balance', ascending: false });
    expect(pageRange(2, 20)).toEqual({ from: 20, to: 39, size: 20 });
    expect(totalPagesFor(45, 20)).toBe(3);
    expect(CUSTOMER_EXPORT_MAX).toBe(2000);
  });

  it('filters VIP and ordinary members by user_type, never balance', () => {
    const vip = createFilterSpy();
    applyCustomerFilters(vip.api, { ...baseFilters(), filterType: 'vip' });
    expect(vip.calls).toEqual([`in:user_type:${CUSTOMER_TYPES.join('|')}`, 'eq:user_type:vip']);
    expect(vip.calls.join(' ')).not.toMatch(/balance/);

    const member = createFilterSpy();
    applyCustomerFilters(member.api, { ...baseFilters(), filterType: 'member' });
    expect(member.calls).toContain('eq:user_type:customer');
  });

  it('applies region, status, and sanitized search', () => {
    const spy = createFilterSpy();
    applyCustomerFilters(spy.api, {
      filterStatus: 'suspended',
      filterType: 'all',
      filterRegion: 'mandalay',
      searchTerm: 'Aung,(vip)',
    });
    expect(spy.calls).toEqual([
      `in:user_type:${CUSTOMER_TYPES.join('|')}`,
      'eq:status:suspended',
      'eq:register_region:mandalay',
      'or:name.ilike.%Aung vip%,phone.ilike.%Aung vip%,email.ilike.%Aung vip%,id.ilike.%Aung vip%',
    ]);
  });

  it('matches packages by id only when phone is empty', () => {
    expect(customerPackageOr('USR123', '  ')).toBe('customer_id.eq.USR123');
  });
});
