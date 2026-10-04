import { describe, expect, it } from 'vitest';
import { cameraScanManualActions, formatScanCloudRoute, resolveCameraScanRoute } from './cameraScanRoute';

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

  it('hides stock-in for a pack that stays on the result, and still opens hub receive', () => {
    const route = resolveCameraScanRoute({
      code: 'RUI26POL40001',
      hubCode: 'RUI',
      hasLocalItem: false,
      canSign: false,
      pkg: mdyPack,
    });
    expect(cameraScanManualActions({ route, code: 'RUI26POL40001', packBarcode: mdyPack.pack_barcode })).toEqual({
      showStockIn: false,
      hubPackBarcode: 'RUI26POL40001',
    });
  });

  it('opens hub receive with the pack when the scanned code is an order', () => {
    const route = resolveCameraScanRoute({
      code: 'POL142622220926',
      hubCode: 'MDY',
      hasLocalItem: true,
      canSign: false,
      pkg: { ...mdyPack, status: 'hub_received' },
    });
    expect(route.kind).toBe('stay');
    expect(
      cameraScanManualActions({
        route,
        code: 'POL142622220926',
        packBarcode: mdyPack.pack_barcode,
      }),
    ).toEqual({ showStockIn: false, hubPackBarcode: 'RUI26POL40001' });
  });

  it('shows the truck leg end instead of the customer destination', () => {
    expect(
      formatScanCloudRoute({
        origin_store_code: 'RUI',
        leg_destination_code: 'MDY',
        destination_code: 'POL',
      }),
    ).toBe('RUI → MDY');
  });

  it('falls back to the printed destination when the leg end is missing', () => {
    expect(
      formatScanCloudRoute({
        origin_store_code: 'mse',
        leg_destination_code: '',
        destination_code: 'ygn',
      }),
    ).toBe('MSE → YGN');
  });

  it('shows stock-in only for an unknown order barcode', () => {
    const route = resolveCameraScanRoute({
      code: 'MDY1001',
      hubCode: 'MDY',
      hasLocalItem: false,
      canSign: false,
      pkg: null,
    });
    expect(cameraScanManualActions({ route, code: 'MDY1001', packBarcode: null })).toEqual({
      showStockIn: true,
      hubPackBarcode: '',
    });
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
