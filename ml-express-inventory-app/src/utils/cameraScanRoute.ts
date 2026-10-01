import { isPackageBarcode } from './packageNumber';
import { isTruckLegEndingAtHub } from './hubReceivePack';

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
