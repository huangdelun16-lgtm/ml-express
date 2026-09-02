import {
  buildCustomerPhoneOrFilter,
  mergePackageRows,
  quotePostgrestOrValue,
  uniquePhoneVariants,
} from '../services/_shared/customerPackageQuery';

describe('quotePostgrestOrValue', () => {
  it('quotes emails so dots do not split the .or() filter', () => {
    expect(quotePostgrestOrValue('user@gmail.com')).toBe('"user@gmail.com"');
  });

  it('quotes phones with + and spaces', () => {
    expect(quotePostgrestOrValue('+959 123 456')).toBe('"+959 123 456"');
  });
});

describe('uniquePhoneVariants', () => {
  it('maps Myanmar 09 to +95', () => {
    const variants = uniquePhoneVariants('09-123456789');
    expect(variants).toContain('09-123456789');
    expect(variants).toContain('09123456789');
    expect(variants).toContain('+959123456789');
  });
});

describe('buildCustomerPhoneOrFilter', () => {
  it('matches both sender and receiver with quoted values', () => {
    const filter = buildCustomerPhoneOrFilter('+95912345678');
    expect(filter).toContain('sender_phone.eq."+95912345678"');
    expect(filter).toContain('receiver_phone.eq."+95912345678"');
  });

  it('returns null when phone is empty', () => {
    expect(buildCustomerPhoneOrFilter('')).toBeNull();
    expect(buildCustomerPhoneOrFilter(undefined)).toBeNull();
  });
});

describe('mergePackageRows', () => {
  it('dedupes by id and sorts newest first', () => {
    const merged = mergePackageRows([
      [{ id: 'a', created_at: '2026-01-01T00:00:00Z' }],
      [
        { id: 'a', created_at: '2026-01-01T00:00:00Z' },
        { id: 'b', created_at: '2026-02-01T00:00:00Z' },
      ],
    ]);
    expect(merged.map((r) => r.id)).toEqual(['b', 'a']);
  });
});
