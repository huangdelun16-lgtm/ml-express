import { describe, expect, it } from 'vitest';
import { isServiceError } from '../errors/serviceError';
import {
  assertPackagingExpressMatch,
  filterItemsByExpressCodes,
  packagingExpressKey,
} from './packagingExpressMatch';

describe('packagingExpressMatch', () => {
  it('treats the same express slips as a match regardless of order or case', () => {
    expect(packagingExpressKey(['YT763565769523', 'JT550754839392'])).toBe(
      packagingExpressKey(['jt550754839392', 'yt763565769523']),
    );
    expect(() =>
      assertPackagingExpressMatch(
        ['YT763565769523', 'JT550754839392', '46553270243394'],
        ['46553270243394', 'YT763565769523', 'JT550754839392'],
      ),
    ).not.toThrow();
  });

  it('rejects a stale pack that still has old express slips', () => {
    try {
      assertPackagingExpressMatch(
        ['YT763565769523', 'JT550754839392', '46553270243394'],
        ['774', '883', '1162'],
      );
      throw new Error('expected mismatch');
    } catch (error) {
      expect(isServiceError(error)).toBe(true);
      if (isServiceError(error)) {
        expect(error.code).toBe('expressMismatch');
        expect(String(error.params?.returned)).toMatch(/774/);
      }
    }
  });

  it('keeps only items whose express slip was just submitted', () => {
    const kept = filterItemsByExpressCodes(
      [
        { input_barcode: '774' },
        { input_barcode: 'YT763565769523' },
        { input_barcode: 'JT550754839392' },
      ],
      ['YT763565769523', 'JT550754839392'],
    );
    expect(kept.map((item) => item.input_barcode)).toEqual(['YT763565769523', 'JT550754839392']);
  });
});
