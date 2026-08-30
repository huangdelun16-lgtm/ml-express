import { MERCHANT_ORDER_STATUS } from '../constants/merchantOrderStatus';
import {
  pendingConfirmIds,
  printableIds,
  toggleSelectedId,
} from './merchantBatchSelection';

describe('merchantBatchSelection', () => {
  const orders = [
    { id: 'a', status: MERCHANT_ORDER_STATUS.PENDING_CONFIRM },
    { id: 'b', status: MERCHANT_ORDER_STATUS.PACKING },
    { id: 'c', status: MERCHANT_ORDER_STATUS.PENDING_COD },
    { id: 'd', status: MERCHANT_ORDER_STATUS.DELIVERED },
  ];

  it('pendingConfirmIds only keeps 待确认', () => {
    expect(pendingConfirmIds(orders)).toEqual(['a']);
  });

  it('printableIds keeps packing / pickup / COD', () => {
    expect(printableIds(orders)).toEqual(['b', 'c']);
  });

  it('toggleSelectedId adds and removes', () => {
    const once = toggleSelectedId(new Set(), 'a');
    expect(Array.from(once)).toEqual(['a']);
    expect(Array.from(toggleSelectedId(once, 'a'))).toEqual([]);
  });
});
