import type { PkgTrackingDetail } from '../types/tracking';
import { isTruckLegEndingAtHub, resolvePackLegDestinationCode } from './hubReceivePack';
import { isPackageBarcode } from './packageNumber';

export type CameraScanRoute =
  | { kind: 'hub_receive'; packBarcode: string }
  | { kind: 'stock_in'; barcode: string }
  | { kind: 'sign' }
  | { kind: 'stay' };

type PackEnd = {
  pack_barcode: string;
  leg_destination_code: string;
  destination_code: string;
  status: string;
};

function packStillOnTheWay(status: string): boolean {
  return status === 'in_transit' || status === 'split_at_hub';
}

/** 扫码后该去哪：本站到货车 → 到站；未入库单号 → 入库；已到站未签 → 签收；其余停在结果页 */
export function resolveCameraScanRoute(input: {
  code: string;
  hubCode: string;
  hasLocalItem: boolean;
  canSign: boolean;
  pkg: PackEnd | null;
}): CameraScanRoute {
  const code = input.code.trim().toUpperCase();
  const hub = input.hubCode.trim().toUpperCase();
  const packEndsHere = Boolean(
    hub && input.pkg && packStillOnTheWay(input.pkg.status) && isTruckLegEndingAtHub(input.pkg, hub),
  );

  if (input.canSign && input.hasLocalItem) return { kind: 'sign' };

  if (isPackageBarcode(code)) {
    if (packEndsHere) return { kind: 'hub_receive', packBarcode: code };
    return { kind: 'stay' };
  }

  if (packEndsHere && input.pkg) {
    return { kind: 'hub_receive', packBarcode: input.pkg.pack_barcode };
  }

  if (!input.hasLocalItem) return { kind: 'stock_in', barcode: code };

  return { kind: 'stay' };
}

/** 结果页按钮与自动跳转同一套：只有该入库才给入库；到站必须带上包装号 */
export function cameraScanManualActions(input: {
  route: CameraScanRoute;
  code: string;
  packBarcode?: string | null;
}): { showStockIn: boolean; hubPackBarcode: string } {
  if (input.route.kind === 'stock_in') {
    return { showStockIn: true, hubPackBarcode: '' };
  }
  if (input.route.kind === 'hub_receive') {
    return { showStockIn: false, hubPackBarcode: input.route.packBarcode };
  }
  const fromCloud = (input.packBarcode ?? '').trim().toUpperCase();
  if (fromCloud) return { showStockIn: false, hubPackBarcode: fromCloud };
  const scanned = input.code.trim().toUpperCase();
  if (isPackageBarcode(scanned)) return { showStockIn: false, hubPackBarcode: scanned };
  return { showStockIn: false, hubPackBarcode: '' };
}

/** 云端路线显示本段运达站。包装号上的客户目的地可以不同，例如 POL 客户只发到 MDY。 */
export function formatScanCloudRoute(pkg: {
  origin_store_code: string;
  leg_destination_code: string;
  destination_code: string;
}): string {
  const origin = pkg.origin_store_code.trim().toUpperCase();
  const leg = resolvePackLegDestinationCode(pkg as PkgTrackingDetail);
  if (origin && leg) return `${origin} → ${leg}`;
  return origin || leg;
}
