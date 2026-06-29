import { PACK_DESTINATION_OPTIONS, regionDisplayLabel } from '../constants/destinationOptions';
import { extractDestinationCode } from './inboundBarcode';
import { isExpressPackItem } from './packItem';
import { packDestinationFromBarcode } from './packageNumber';

/** 解析商品/快递包所属地区码（用于列表筛选） */
export function resolveItemDestinationCode(item: {
  barcode: string;
  destination?: string;
  final_destination?: string;
}): string {
  if (item.final_destination?.trim()) {
    return extractDestinationCode(item.final_destination);
  }
  if (item.destination?.trim()) {
    return extractDestinationCode(item.destination);
  }
  if (isExpressPackItem(item)) {
    return packDestinationFromBarcode(item.barcode);
  }
  const fromBarcode = extractDestinationCode(item.barcode.slice(0, 6));
  if ((PACK_DESTINATION_OPTIONS as readonly string[]).includes(fromBarcode)) {
    return fromBarcode;
  }
  const prefix3 = item.barcode.trim().toUpperCase().slice(0, 3);
  if ((PACK_DESTINATION_OPTIONS as readonly string[]).includes(prefix3)) {
    return prefix3;
  }
  return '';
}

/** 所选商品的去重地区码列表 */
export function collectItemDestinationCodes(
  items: { barcode: string; destination?: string }[],
): string[] {
  const codes = new Set<string>();
  for (const item of items) {
    const code = resolveItemDestinationCode(item);
    if (code) codes.add(code);
  }
  return [...codes].sort();
}

/** 跨地区打包确认文案 */
export function formatMixedRegionPackConfirmMessage(codes: string[]): string {
  if (codes.length < 2) return '';
  const parts = codes.map((code) => `${regionDisplayLabel(code)} 地区`);
  return `是否将 ${parts.join(' 和 ')} 订单打包在一个快递包中？`;
}
