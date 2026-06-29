import { Alert } from 'react-native';
import { svc } from '../errors/serviceError';
import type { InventoryStoreSession } from '../services/authService';
import { getItemDetail, markCustomerSigned } from '../services/inventoryService';

type ConfirmSignParams = {
  itemId: string;
  operator: string;
  store: InventoryStoreSession;
  resolveError?: (error: unknown) => string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  /** 弹窗关闭或流程结束（含用户点取消） */
  onDismiss?: () => void;
};

async function executeSign(params: ConfirmSignParams): Promise<void> {
  await markCustomerSigned(params.itemId, params.operator, params.store);
  params.onSuccess?.();
}

/**
 * 到付订单签收前提示总费用并确认客户是否已付清；预付等直接签收。
 */
export function confirmAndMarkCustomerSigned(params: ConfirmSignParams): void {
  void (async () => {
    try {
      const detail = await getItemDetail(params.itemId);
      if (!detail) throw svc('orderNotFoundOrDeleted');

      if (detail.payment_label === '到付') {
        const feeRaw = detail.total_fee?.trim();
        const feeLine = feeRaw ? `${feeRaw} MMK` : '未登记';
        Alert.alert(
          '确认客户付款',
          `付款方式：到付\n总费用：${feeLine}\n\n客户是否已支付完毕？`,
          [
            { text: '取消', style: 'cancel', onPress: () => params.onDismiss?.() },
            {
              text: '已收款，确认签收',
              onPress: () => {
                void executeSign(params)
                  .catch((e: unknown) => {
                    params.onError?.(params.resolveError?.(e) ?? '请重试');
                  })
                  .finally(() => params.onDismiss?.());
              },
            },
          ],
        );
        return;
      }

      await executeSign(params);
    } catch (e: unknown) {
      params.onError?.(params.resolveError?.(e) ?? '请重试');
    } finally {
      params.onDismiss?.();
    }
  })();
}
