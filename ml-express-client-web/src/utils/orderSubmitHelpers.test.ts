import { deriveInitialOrderStatus } from './orderSubmitHelpers';
import { PACKAGE_STATUS } from '../constants/packageStatus';

describe('deriveInitialOrderStatus', () => {
  it('returns 待确认 for cart + non-merchant', () => {
    expect(
      deriveInitialOrderStatus({ isFromCart: true, userType: 'member', paymentMethod: 'cash' })
    ).toBe(PACKAGE_STATUS.PENDING_CONFIRM);
  });

  it('returns 待收款 for cash when not cart-confirm case', () => {
    expect(
      deriveInitialOrderStatus({ isFromCart: false, userType: 'member', paymentMethod: 'cash' })
    ).toBe(PACKAGE_STATUS.PENDING_COD);
  });

  it('returns 待取件 for merchant cart with cash', () => {
    expect(
      deriveInitialOrderStatus({ isFromCart: true, userType: 'merchant', paymentMethod: 'cash' })
    ).toBe(PACKAGE_STATUS.PENDING_COD);
  });

  it('returns 待取件 for balance non-cart', () => {
    expect(
      deriveInitialOrderStatus({ isFromCart: false, userType: 'member', paymentMethod: 'balance' })
    ).toBe(PACKAGE_STATUS.PENDING_PICKUP);
  });
});
