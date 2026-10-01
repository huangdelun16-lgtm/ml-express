import { describe, expect, it } from 'vitest';
import { resolveCameraScanRoute } from './cameraScanRoute';

const mdyPack = {
  pack_barcode: 'RUI26POL40001',
  leg_destination_code: 'MDY',
  destination_code: 'POL',
  status: 'in_transit',
};

describe('resolveCameraScanRoute', () => {
  it('sends a pack ending at this hub to hub receive', () => {
    expect(
      resolveCameraScanRoute({
        code: 'RUI26POL40001',
        hubCode: 'MDY',
        hasLocalItem: false,
        canSign: false,
        pkg: mdyPack,
      }),
    ).toEqual({ kind: 'hub_receive', packBarcode: 'RUI26POL40001' });
  });

  it('does not stock in a pack that ends somewhere else', () => {
    expect(
      resolveCameraScanRoute({
        code: 'RUI26POL40001',
        hubCode: 'RUI',
        hasLocalItem: false,
        canSign: false,
        pkg: mdyPack,
      }).kind,
    ).toBe('stay');
  });

  it('sends an unknown order barcode to stock in', () => {
    expect(
      resolveCameraScanRoute({
        code: 'MDY1001',
        hubCode: 'MDY',
        hasLocalItem: false,
        canSign: false,
        pkg: null,
      }),
    ).toEqual({ kind: 'stock_in', barcode: 'MDY1001' });
  });

  it('opens sign when the local item has arrived and is unsigned', () => {
    expect(
      resolveCameraScanRoute({
        code: 'POL142622220926',
        hubCode: 'MDY',
        hasLocalItem: true,
        canSign: true,
        pkg: null,
      }).kind,
    ).toBe('sign');
  });

  it('stays when the pack for this hub is already received', () => {
    expect(
      resolveCameraScanRoute({
        code: 'RUI26POL40001',
        hubCode: 'MDY',
        hasLocalItem: false,
        canSign: false,
        pkg: { ...mdyPack, status: 'hub_received' },
      }).kind,
    ).toBe('stay');
  });

  it('stays on the result when the order is already in stock but not ready to sign', () => {
    expect(
      resolveCameraScanRoute({
        code: 'POL142622220926',
        hubCode: 'MDY',
        hasLocalItem: true,
        canSign: false,
        pkg: null,
      }).kind,
    ).toBe('stay');
  });
});
