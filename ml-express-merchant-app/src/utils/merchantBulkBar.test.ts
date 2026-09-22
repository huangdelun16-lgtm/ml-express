import { describe, expect, it } from 'vitest';
import {
  bulkListPadding,
  formatBulkHeadline,
  shouldClaimBulkBarPan,
  shouldCloseBulkBar,
  summarizeBulkChangeResults,
  summarizeBulkSelection,
  survivingBulkIds,
} from './merchantBulkBar';

const products = [
  { id: 'a', is_available: true },
  { id: 'b', is_available: false },
  { id: 'c', is_available: true },
];

describe('summarizeBulkSelection', () => {
  it('treats an empty selection as disabled actions', () => {
    const summary = summarizeBulkSelection(products, []);
    expect(summary).toMatchObject({
      selected: 0,
      total: 3,
      allSelected: false,
      noneSelected: true,
      availableCount: 0,
      unavailableCount: 0,
      actionsEnabled: false,
    });
  });

  it('counts shelf split only among selected products', () => {
    const summary = summarizeBulkSelection(products, ['a', 'b']);
    expect(summary.selected).toBe(2);
    expect(summary.availableCount).toBe(1);
    expect(summary.unavailableCount).toBe(1);
    expect(summary.actionsEnabled).toBe(true);
    expect(summary.allSelected).toBe(false);
  });

  it('marks allSelected only when every product is chosen', () => {
    expect(summarizeBulkSelection(products, ['a', 'b', 'c']).allSelected).toBe(true);
    expect(summarizeBulkSelection([], []).allSelected).toBe(false);
  });
});

describe('bulk list padding and headline', () => {
  it('reserves more list space while the bar is open', () => {
    expect(bulkListPadding(false)).toBe(96);
    expect(bulkListPadding(true)).toBeGreaterThan(bulkListPadding(false));
  });

  it('shows selected against catalog size', () => {
    expect(formatBulkHeadline(0, 12)).toBe('0 / 12');
    expect(formatBulkHeadline(3, 12)).toBe('3 / 12');
  });
});

describe('summarizeBulkChangeResults', () => {
  it('treats a total failure as unchanged and keeps every id selected', () => {
    const results = [{ success: false }, null, { success: false }];
    expect(summarizeBulkChangeResults(results).kind).toBe('failed');
    expect(survivingBulkIds(['a', 'b', 'c'], results)).toEqual(['a', 'b', 'c']);
  });

  it('clears selection only for products that actually saved', () => {
    const results = [{ success: true, pendingReview: true }, { success: false }];
    const summary = summarizeBulkChangeResults(results);
    expect(summary.kind).toBe('partial');
    expect(summary.successCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(survivingBulkIds(['a', 'b'], results)).toEqual(['b']);
  });

  it('distinguishes a full pending submit from a direct save', () => {
    expect(summarizeBulkChangeResults([{ success: true, pendingReview: true }]).kind).toBe('pending');
    expect(summarizeBulkChangeResults([{ success: true }]).kind).toBe('saved');
    expect(survivingBulkIds(['a'], [{ success: true }])).toEqual([]);
  });
});

describe('bulk bar pull-down', () => {
  it('only claims a downward pull', () => {
    expect(shouldClaimBulkBarPan(0, 20)).toBe(true);
    expect(shouldClaimBulkBarPan(0, -20)).toBe(false);
    expect(shouldClaimBulkBarPan(40, 10)).toBe(false);
  });

  it('closes on a long pull or a downward flick', () => {
    expect(shouldCloseBulkBar(80, 0)).toBe(true);
    expect(shouldCloseBulkBar(20, 1)).toBe(true);
    expect(shouldCloseBulkBar(20, 0.1)).toBe(false);
  });
});
