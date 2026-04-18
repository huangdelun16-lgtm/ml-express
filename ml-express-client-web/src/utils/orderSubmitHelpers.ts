import { PACKAGE_STATUS } from '../constants/packageStatus';

export interface DeriveOrderStatusParams {
  isFromCart: boolean;
  paymentMethod: 'qr' | 'cash' | 'balance';
}

/** 与 HomePage 下单提交时初始 status 字段逻辑一致（客户端 Web 仅会员下单） */
export function deriveInitialOrderStatus(p: DeriveOrderStatusParams): string {
  if (p.isFromCart) {
    return PACKAGE_STATUS.PENDING_CONFIRM;
  }
  if (p.paymentMethod === 'cash') {
    return PACKAGE_STATUS.PENDING_COD;
  }
  return PACKAGE_STATUS.PENDING_PICKUP;
}
