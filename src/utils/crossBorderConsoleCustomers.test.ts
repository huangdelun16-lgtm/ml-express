import {
  filterCustomersByKind,
  filterUnifiedCustomers,
  mergeConsoleCustomers,
} from './crossBorderConsoleCustomers';

describe('crossBorderConsoleCustomers', () => {
  it('merges registered customers with express summaries and keeps unfiled rows', () => {
    const registered = [
      { id: '1', customer_name: '张三', customer_code: 'MDY-001', phone: '0911' },
    ];
    const summaries = [
      { customerKey: 'a', customerCode: 'MDY-001', customerName: '张三', customerPhone: '0911' },
      { customerKey: 'b', customerCode: '', customerName: '临时客', customerPhone: '0999' },
    ];

    const merged = mergeConsoleCustomers(registered, summaries);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ kind: 'registered', key: 'reg:1' });
    expect(merged[0].summary?.customerKey).toBe('a');
    expect(merged[1]).toMatchObject({ kind: 'express', key: 'exp:b' });
    expect(filterUnifiedCustomers(merged, '临时').map((row) => row.key)).toEqual(['exp:b']);
    expect(filterUnifiedCustomers(merged, 'mdy001')).toHaveLength(1);
    expect(filterCustomersByKind(merged, 'unfiled').map((row) => row.key)).toEqual(['exp:b']);
    expect(filterCustomersByKind(merged, 'registered').map((row) => row.kind)).toEqual([
      'registered',
    ]);
    expect(filterCustomersByKind(merged, 'all')).toHaveLength(2);
  });
});
