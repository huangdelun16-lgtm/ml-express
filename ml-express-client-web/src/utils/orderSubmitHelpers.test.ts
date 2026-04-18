import { deriveInitialOrderStatus } from './orderSubmitHelpers';
import { PACKAGE_STATUS } from '../constants/packageStatus';

describe('deriveInitialOrderStatus', () => {
  it('returns 待确认 for cart checkout', () => {
    expect(
      deriveInitialOrderStatus({ isFromCart: true, paymentMethod: 'cash' })
    ).toBe(PACKAGE_STATUS.PENDING_CONFIRM);
  });

  it('returns 待收款 for cash when not cart-confirm case', () => {
    expect(
      deriveInitialOrderStatus({ isFromCart: false, paymentMethod: 'cash' })
    ).toBe(PACKAGE_STATUS.PENDING_COD);
  });

  it('returns 待取件 for balance non-cart', () => {
    expect(
      deriveInitialOrderStatus({ isFromCart: false, paymentMethod: 'balance' })
    ).toBe(PACKAGE_STATUS.PENDING_PICKUP);
  });
});
