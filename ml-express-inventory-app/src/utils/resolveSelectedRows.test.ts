import { describe, expect, it } from 'vitest';
import { resolveSelectedRows } from './resolveSelectedRows';

describe('resolveSelectedRows', () => {
  it('keeps every selected order when search has hidden the rest', () => {
    const hidden = { id: 'a', name: 'older' };
    const visible = { id: 'b', name: '0057' };
    const rows = resolveSelectedRows(
      [visible],
      ['a', 'b', 'c'],
      new Map([['a', hidden]]),
    );
    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('prefers the row still on screen over the remembered copy', () => {
    const rows = resolveSelectedRows(
      [{ id: 'a', weight: '2 Kg' }],
      ['a'],
      new Map([['a', { id: 'a', weight: '1 Kg' }]]),
    );
    expect(rows[0].weight).toBe('2 Kg');
  });
});
