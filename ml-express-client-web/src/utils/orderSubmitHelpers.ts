import { PACKAGE_STATUS } from '../constants/packageStatus';

export interface DeriveOrderStatusParams {
  isFromCart: boolean;
  userType?: string;
  paymentMethod: 'qr' | 'cash' | 'balance';
}

/** 与 HomePage 下单提交时初始 status 字段逻辑一致 */
export function deriveInitialOrderStatus(p: DeriveOrderStatusParams): string {
  if (p.isFromCart && p.userType !== 'merchant') {
    return PACKAGE_STATUS.PENDING_CONFIRM;
  }
  if (p.paymentMethod === 'cash') {
    return PACKAGE_STATUS.PENDING_COD;
  }
  return PACKAGE_STATUS.PENDING_PICKUP;
}
