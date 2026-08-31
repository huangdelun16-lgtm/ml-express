import { describe, expect, it } from 'vitest';
import {
  canResolveInventoryException,
  countOpenInventoryExceptions,
  exceptionNeedsQty,
  isInventoryExceptionType,
  parseExceptionQty,
  validateInventoryExceptionDraft,
} from './inventoryException';

describe('inventoryException', () => {
  it('recognizes known types', () => {
    expect(isInventoryExceptionType('damage')).toBe(true);
    expect(isInventoryExceptionType('lost')).toBe(true);
    expect(isInventoryExceptionType('broken')).toBe(false);
  });

  it('requires type, note and at least one photo', () => {
    expect(
      validateInventoryExceptionDraft({ type: '', note: '破损', photoCount: 1 }),
    ).toBe('exceptionTypeRequired');
    expect(
      validateInventoryExceptionDraft({ type: 'damage', note: ' ', photoCount: 1 }),
    ).toBe('exceptionNoteRequired');
    expect(
      validateInventoryExceptionDraft({ type: 'damage', note: '外箱破损进水', photoCount: 0 }),
    ).toBe('exceptionPhotoRequired');
    expect(
      validateInventoryExceptionDraft({ type: 'damage', note: '外箱破损进水', photoCount: 7 }),
    ).toBe('exceptionPhotoLimit');
    expect(
      validateInventoryExceptionDraft({ type: 'damage', note: '外箱破损进水', photoCount: 1 }),
    ).toBeNull();
  });

  it('requires actual vs expected qty for shortage and excess', () => {
    expect(exceptionNeedsQty('shortage')).toBe(true);
    expect(
      validateInventoryExceptionDraft({
        type: 'shortage',
        note: '少了一件',
        photoCount: 1,
        qtyExpected: 3,
        qtyActual: 3,
      }),
    ).toBe('exceptionQtyInvalid');
    expect(
      validateInventoryExceptionDraft({
        type: 'shortage',
        note: '少了一件',
        photoCount: 1,
        qtyExpected: 3,
        qtyActual: 2,
      }),
    ).toBeNull();
    expect(
      validateInventoryExceptionDraft({
        type: 'excess',
        note: '多出一件',
        photoCount: 1,
        qtyExpected: '2',
        qtyActual: '3',
      }),
    ).toBeNull();
  });

  it('parses qty and counts open rows', () => {
    expect(parseExceptionQty('2,000')).toBe(2000);
    expect(parseExceptionQty('x')).toBeNull();
    expect(canResolveInventoryException('open')).toBe(true);
    expect(canResolveInventoryException('resolved')).toBe(false);
    expect(countOpenInventoryExceptions([{ status: 'open' }, { status: 'resolved' }])).toBe(1);
  });
});
