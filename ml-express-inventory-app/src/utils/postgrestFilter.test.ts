import { describe, expect, it } from 'vitest';
import { buildOrEqFilter, escapePostgrestFilterValue } from './postgrestFilter';

describe('postgrestFilter', () => {
  it('escapePostgrestFilterValue keeps simple codes unquoted', () => {
    expect(escapePostgrestFilterValue('MUSE001')).toBe('MUSE001');
    expect(escapePostgrestFilterValue('YGN')).toBe('YGN');
  });

  it('escapePostgrestFilterValue quotes values with special characters', () => {
    expect(escapePostgrestFilterValue('a,b')).toBe('"a,b"');
    expect(escapePostgrestFilterValue('foo"bar')).toBe('"foo\\"bar"');
  });

  it('buildOrEqFilter joins eq filters', () => {
    expect(
      buildOrEqFilter([
        { column: 'owner_store_code', value: 'MUSE001' },
        { column: 'final_destination', value: 'YGN' },
      ]),
    ).toBe('owner_store_code.eq.MUSE001,final_destination.eq.YGN');
  });
});
