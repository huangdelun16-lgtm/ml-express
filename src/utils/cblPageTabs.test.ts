import { parseCblPageTab, withCblPageTab } from './cblPageTabs';

describe('parseCblPageTab', () => {
  it('keeps known tabs', () => {
    expect(parseCblPageTab('finance')).toBe('finance');
    expect(parseCblPageTab('export-cost')).toBe('export-cost');
    expect(parseCblPageTab('customers')).toBe('customers');
    expect(parseCblPageTab('inbound')).toBe('inbound');
    expect(parseCblPageTab('express')).toBe('express');
    expect(parseCblPageTab('transport')).toBe('transport');
    expect(parseCblPageTab('invoices')).toBe('invoices');
    expect(parseCblPageTab('settings')).toBe('settings');
  });

  it('falls back to overview', () => {
    expect(parseCblPageTab(null)).toBe('overview');
    expect(parseCblPageTab('')).toBe('overview');
    expect(parseCblPageTab('sidebar')).toBe('overview');
  });
});

describe('withCblPageTab', () => {
  it('omits overview from the query string', () => {
    const params = withCblPageTab(new URLSearchParams('tab=finance'), 'overview');
    expect(params.get('tab')).toBeNull();
  });

  it('writes other tabs and keeps unrelated params', () => {
    const params = withCblPageTab(new URLSearchParams('foo=1'), 'transport');
    expect(params.get('tab')).toBe('transport');
    expect(params.get('foo')).toBe('1');
  });
});
