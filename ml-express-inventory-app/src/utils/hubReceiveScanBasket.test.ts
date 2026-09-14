import { describe, expect, it } from 'vitest';
import {
  groupHubReceiveScanLines,
  normalizeCustomerSignCode,
  removeHubReceiveScanIds,
  upsertHubReceiveScanLine,
  type HubReceiveScanLine,
} from './hubReceiveScanBasket';

function line(partial: Partial<HubReceiveScanLine> & Pick<HubReceiveScanLine, 'id'>): HubReceiveScanLine {
  return {
    barcode: partial.barcode ?? partial.id,
    name: partial.name ?? 'Item',
    customerCode: partial.customerCode ?? '',
    customerName: partial.customerName ?? '',
    canSign: partial.canSign ?? true,
    alreadySigned: partial.alreadySigned ?? false,
    ...partial,
  };
}

describe('hubReceiveScanBasket', () => {
  it('normalizes customer codes', () => {
    expect(normalizeCustomerSignCode(' mdy-260812005 ')).toBe('MDY260812005');
    expect(normalizeCustomerSignCode('')).toBe('');
  });

  it('rejects duplicate barcodes', () => {
    const first = line({ id: 'a', barcode: 'MDY1', customerCode: 'YGN00921' });
    const added = upsertHubReceiveScanLine([], first);
    expect(added.duplicate).toBe(false);
    expect(upsertHubReceiveScanLine(added.lines, first).duplicate).toBe(true);
  });

  it('groups the same customer code for one signature', () => {
    const groups = groupHubReceiveScanLines([
      line({ id: 'a', customerCode: 'YGN00921', customerName: 'Ko Mg' }),
      line({ id: 'b', customerCode: 'YGN00921', customerName: 'Ko Mg' }),
      line({ id: 'c', customerCode: 'MDY00000', customerName: 'Ma Hla' }),
      line({ id: 'd', customerCode: '', customerName: 'Ko Mg' }),
    ]);
    expect(groups).toHaveLength(3);
    const ygn = groups.find((group) => group.customerCode === 'YGN00921');
    expect(ygn?.signable.map((row) => row.id)).toEqual(['a', 'b']);
    const noCode = groups.find((group) => group.key === 'solo:d');
    expect(noCode?.lines).toHaveLength(1);
  });

  it('removes signed ids from the basket', () => {
    const remaining = removeHubReceiveScanIds(
      [
        line({ id: 'a', customerCode: 'YGN00921' }),
        line({ id: 'b', customerCode: 'YGN00921' }),
      ],
      ['a'],
    );
    expect(remaining.map((row) => row.id)).toEqual(['b']);
  });
});
