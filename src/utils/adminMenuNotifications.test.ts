import {
  ADMIN_MENU_SEEN_KEY,
  afterSalesNoticeCount,
  moduleIdFromAdminPath,
  emptyAdminTodoCounts,
  ensureModuleSeenInitialized,
  financeNoticeCount,
  formatMenuBadgeCount,
  getAdminMenuNotice,
  merchantOpsNoticeCount,
  merchantStoresNoticeCount,
  usersNoticeCount,
} from './adminMenuNotifications';

describe('admin menu notice counts', () => {
  it('sums after-sales and finance signals', () => {
    expect(
      afterSalesNoticeCount({
        watchReviews: 1,
        waitingChats: 2,
        pendingRefunds: 3,
      }),
    ).toBe(6);
    expect(
      financeNoticeCount({
        pendingFinanceCash: 2,
        unseenFinanceRecords: 4,
      }),
    ).toBe(6);
  });

  it('shows overdue accept on merchant ops first, otherwise pending', () => {
    expect(
      merchantOpsNoticeCount({
        pendingMerchantAccept: 5,
        overdueMerchantAccept: 2,
      }),
    ).toBe(2);
    expect(
      merchantOpsNoticeCount({
        pendingMerchantAccept: 4,
        overdueMerchantAccept: 0,
      }),
    ).toBe(4);
    const overdueNotice = getAdminMenuNotice('merchant_ops', {
      ...emptyAdminTodoCounts,
      pendingMerchantAccept: 5,
      overdueMerchantAccept: 2,
    });
    expect(overdueNotice?.tone).toBe('red');
    expect(overdueNotice?.pulse).toBe(true);
    expect(overdueNotice?.href).toBe('/admin/merchant-ops?tab=overdue');
    const pendingNotice = getAdminMenuNotice('merchant_ops', {
      ...emptyAdminTodoCounts,
      pendingMerchantAccept: 3,
      overdueMerchantAccept: 0,
    });
    expect(pendingNotice?.tone).toBe('amber');
    expect(pendingNotice?.pulse).toBe(false);
    expect(pendingNotice?.href).toBe('/admin/merchant-ops?tab=pending');
  });

  it('adds store applications and newly created stores', () => {
    expect(
      merchantStoresNoticeCount({
        pendingMerchantApplications: 2,
        unseenStores: 1,
      }),
    ).toBe(3);
  });

  it('adds pending and newly registered users', () => {
    expect(usersNoticeCount({ pendingUsers: 1, unseenUsers: 4 })).toBe(5);
  });

  it('returns a menu notice only when the module has a count', () => {
    const empty = getAdminMenuNotice('finance', emptyAdminTodoCounts);
    expect(empty).toBeNull();
    const notice = getAdminMenuNotice('finance', {
      ...emptyAdminTodoCounts,
      pendingFinanceCash: 3,
    });
    expect(notice?.n).toBe(3);
    expect(notice?.href).toBe('/admin/finance?tab=cash_collection');
    expect(notice?.pulse).toBe(true);
  });

  it('deep-links city orders to 待确认 when that queue has items', () => {
    const notice = getAdminMenuNotice('city_packages', {
      ...emptyAdminTodoCounts,
      pendingCityOrders: 8,
      pendingMerchantAccept: 2,
    });
    expect(notice?.href).toContain('待确认');
  });

  it('deep-links city orders to 待取件 when only pickup queue has items', () => {
    const notice = getAdminMenuNotice('city_packages', {
      ...emptyAdminTodoCounts,
      pendingCityOrders: 5,
      pendingMerchantAccept: 0,
    });
    expect(notice?.href).toContain('待取件');
  });

  it('maps admin paths back to module ids', () => {
    expect(moduleIdFromAdminPath('/admin/finance?tab=cash_collection'.split('?')[0])).toBe(
      'finance',
    );
    expect(moduleIdFromAdminPath('/admin/merchant-applications')).toBe('merchant_stores');
    expect(moduleIdFromAdminPath('/admin/realtime-tracking')).toBe('tracking');
  });

  it('formats large badge numbers', () => {
    expect(formatMenuBadgeCount(7)).toBe('7');
    expect(formatMenuBadgeCount(100)).toBe('99+');
  });
});

describe('ensureModuleSeenInitialized', () => {
  beforeEach(() => {
    localStorage.removeItem(ADMIN_MENU_SEEN_KEY);
  });

  it('writes now for missing modules and keeps existing timestamps', () => {
    const first = ensureModuleSeenInitialized(['users'], new Date('2026-09-09T01:00:00.000Z'));
    expect(first.users).toBe('2026-09-09T01:00:00.000Z');
    const second = ensureModuleSeenInitialized(['users'], new Date('2026-09-09T08:00:00.000Z'));
    expect(second.users).toBe('2026-09-09T01:00:00.000Z');
  });
});
