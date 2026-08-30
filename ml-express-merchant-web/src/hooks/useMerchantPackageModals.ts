import { useCallback, useMemo, useState } from 'react';
import { packageService } from '../services/supabase';
import { batchAcceptOrders } from '../services/packageBatchService';
import LoggerService from '../services/LoggerService';
import { MERCHANT_ORDER_STATUS } from '../constants/merchantOrderStatus';
import type { MerchantLanguage } from '../constants/merchantOrderStatus';
import { getPackingModalModel } from '../utils/parseOrderPackingItems';
import { printMerchantReceipt } from '../utils/printMerchantReceipt';
import { loadPrinterSettings } from '../services/printerSettings';
import { feedbackService } from '../services/FeedbackService';
import { isBatchPrintableStatus } from '../utils/merchantBatchSelection';

interface UseMerchantPackageModalsOptions {
  language: MerchantLanguage;
  productPriceMap: Record<string, number>;
  isPartnerStore: boolean;
  onRefresh?: () => void;
  onPackageStatusChange?: (packageId: string, status: string) => void;
  removePendingOrder?: (packageId: string) => void;
}

export function useMerchantPackageModals({
  language,
  productPriceMap,
  isPartnerStore,
  onRefresh,
  onPackageStatusChange,
  removePendingOrder,
}: UseMerchantPackageModalsOptions) {
  const [actionLoading, setActionLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showPackageDetailModal, setShowPackageDetailModal] = useState(false);
  const [packingOrderData, setPackingOrderData] = useState<any>(null);
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const packingModalModel = useMemo(() => {
    if (!packingOrderData) return null;
    return getPackingModalModel(packingOrderData.description, productPriceMap);
  }, [packingOrderData, productPriceMap]);

  const openPackageDetail = useCallback((pkg: any) => {
    setSelectedPackage(pkg);
    setShowPackageDetailModal(true);
  }, []);

  const closePackageDetail = useCallback(() => {
    setShowPackageDetailModal(false);
  }, []);

  const handleOrderClick = useCallback(
    (order: any) => {
      if (order.status === MERCHANT_ORDER_STATUS.PACKING) {
        setPackingOrderData(order);
        setCheckedItems({});
        setShowPackingModal(true);
        setShowPackageDetailModal(false);
      } else {
        openPackageDetail(order);
      }
    },
    [openPackageDetail],
  );

  const handleStartPacking = useCallback((pkg: any) => {
    setPackingOrderData(pkg);
    setCheckedItems({});
    setShowPackingModal(true);
    setShowPackageDetailModal(false);
  }, []);

  const togglePackingItem = useCallback((itemId: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const handleAcceptOrder = useCallback(
    async (targetPkg?: any) => {
      const pkgToAccept = targetPkg || selectedPackage;
      if (!pkgToAccept?.id) return;
      try {
        setActionLoading(true);
        if (pkgToAccept.status !== MERCHANT_ORDER_STATUS.PENDING_CONFIRM) {
          feedbackService.notify(
            language === 'zh'
              ? '该订单状态已变更，无法接单'
              : 'Order status changed',
          );
          return;
        }
        const success = await packageService.updatePackageStatus(
          pkgToAccept.id,
          MERCHANT_ORDER_STATUS.PACKING,
        );
        if (success) {
          const printerSettings = loadPrinterSettings();
          if (printerSettings.autoPrint) {
            try {
              await printMerchantReceipt(pkgToAccept, productPriceMap, language);
            } catch (printError) {
              LoggerService.warn('接单后自动打印失败', printError);
              feedbackService.notify(
                language === 'zh'
                  ? '接单成功，但小票打印失败。请到「我的账号 → 打印机」检查设置后重试。'
                  : 'Order accepted, but receipt print failed. Check Printer settings.',
              );
            }
          }
          removePendingOrder?.(pkgToAccept.id);
          feedbackService.notify(
            language === 'zh'
              ? printerSettings.autoPrint
                ? '接单成功！小票已发送打印，请开始打包商品。'
                : '接单成功！请开始打包商品。'
              : printerSettings.autoPrint
                ? 'Order accepted! Print job sent.'
                : 'Order accepted!',
          );
          onPackageStatusChange?.(pkgToAccept.id, MERCHANT_ORDER_STATUS.PACKING);
          if (!targetPkg) {
            setSelectedPackage({ ...pkgToAccept, status: MERCHANT_ORDER_STATUS.PACKING });
          }
          onRefresh?.();
        }
      } catch (error) {
        LoggerService.error('接单失败:', error);
      } finally {
        setActionLoading(false);
      }
    },
    [
      selectedPackage,
      language,
      productPriceMap,
      removePendingOrder,
      onPackageStatusChange,
      onRefresh,
    ],
  );

  const printOrdersSequentially = useCallback(
    async (orders: any[]) => {
      let ok = 0;
      let failed = 0;
      let printerOff = false;
      for (const order of orders) {
        try {
          await printMerchantReceipt(order, productPriceMap, language);
          ok += 1;
          if (ok < orders.length) {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message === 'PRINT_NOT_ENABLED') {
            printerOff = true;
            failed += orders.length - ok;
            break;
          }
          LoggerService.warn('批量打印失败', error);
          failed += 1;
        }
      }
      return { ok, failed, printerOff };
    },
    [productPriceMap, language],
  );

  const handleAcceptMany = useCallback(
    async (orders: any[]) => {
      const pending = (orders || []).filter(
        (order) =>
          order?.id && order.status === MERCHANT_ORDER_STATUS.PENDING_CONFIRM,
      );
      if (!pending.length) {
        feedbackService.notify(
          language === 'zh'
            ? '没有可接的待确认订单'
            : 'No pending orders to accept',
        );
        return { ok: 0, failed: 0 };
      }
      const confirmMsg =
        language === 'zh'
          ? `确定接单 ${pending.length} 笔？将改为「打包中」。`
          : `Accept ${pending.length} orders and start packing?`;
      if (!window.confirm(confirmMsg)) return { ok: 0, failed: 0 };

      try {
        setActionLoading(true);
        const result = await batchAcceptOrders(pending.map((order) => order.id));
        if (result.ok === 0) {
          feedbackService.notify(
            language === 'zh' ? '批量接单失败，请重试' : 'Batch accept failed',
          );
          return result;
        }

        pending.forEach((order) => {
          removePendingOrder?.(order.id);
          onPackageStatusChange?.(order.id, MERCHANT_ORDER_STATUS.PACKING);
        });
        if (
          selectedPackage?.id &&
          pending.some((order) => order.id === selectedPackage.id)
        ) {
          setSelectedPackage({
            ...selectedPackage,
            status: MERCHANT_ORDER_STATUS.PACKING,
          });
        }

        const printerSettings = loadPrinterSettings();
        if (printerSettings.autoPrint) {
          const printed = await printOrdersSequentially(pending);
          feedbackService.notify(
            printed.printerOff || printed.failed > 0
              ? language === 'zh'
                ? `已接单 ${result.ok} 笔，但小票打印未全部成功。请到「我的账号 → 打印机」检查后补打。`
                : `Accepted ${result.ok}. Some receipts failed to print.`
              : language === 'zh'
                ? `已接单 ${result.ok} 笔，小票已发送打印`
                : `Accepted ${result.ok}. Print jobs sent.`,
          );
        } else {
          feedbackService.notify(
            language === 'zh'
              ? `已接单 ${result.ok} 笔${result.failed ? `，失败 ${result.failed} 笔` : ''}`
              : `Accepted ${result.ok}${result.failed ? `, failed ${result.failed}` : ''}`,
          );
        }
        onRefresh?.();
        return result;
      } catch (error) {
        LoggerService.error('批量接单失败:', error);
        feedbackService.notify(
          language === 'zh' ? '批量接单失败' : 'Batch accept failed',
        );
        return { ok: 0, failed: pending.length };
      } finally {
        setActionLoading(false);
      }
    },
    [
      language,
      printOrdersSequentially,
      removePendingOrder,
      onPackageStatusChange,
      onRefresh,
      selectedPackage,
    ],
  );

  const handlePrintMany = useCallback(
    async (orders: any[]) => {
      const printable = (orders || []).filter(
        (order) => order?.id && isBatchPrintableStatus(order.status),
      );
      if (!printable.length) {
        feedbackService.notify(
          language === 'zh'
            ? '没有可打单的订单（打包中 / 待取件 / 待收款）'
            : 'No printable orders selected',
        );
        return { ok: 0, failed: 0 };
      }
      try {
        setPrintLoading(true);
        const result = await printOrdersSequentially(printable);
        if (result.printerOff) {
          feedbackService.notify(
            language === 'zh'
              ? '打印机未开启。请到「我的账号 → 打印机」开启后再打单。'
              : 'Printer is off. Enable it in Account → Printer.',
          );
          return result;
        }
        feedbackService.notify(
          language === 'zh'
            ? `已发送 ${result.ok} 张小票${result.failed ? `，失败 ${result.failed} 张` : ''}`
            : `Sent ${result.ok} receipt(s)${result.failed ? `, failed ${result.failed}` : ''}`,
        );
        return result;
      } finally {
        setPrintLoading(false);
      }
    },
    [language, printOrdersSequentially],
  );

  const handleCancelOrder = useCallback(
    async (pkg: any) => {
      if (!pkg?.id) return;
      const confirmMsg =
        language === 'zh' ? '确定要取消吗？' : 'Cancel order?';
      if (!window.confirm(confirmMsg)) return;
      try {
        setActionLoading(true);
        const success = await packageService.updatePackageStatus(
          pkg.id,
          MERCHANT_ORDER_STATUS.CANCELLED,
        );
        if (success) {
          onPackageStatusChange?.(pkg.id, MERCHANT_ORDER_STATUS.CANCELLED);
          onRefresh?.();
          setShowPackageDetailModal(false);
        }
      } catch (error) {
        LoggerService.error('取消失败:', error);
      } finally {
        setActionLoading(false);
      }
    },
    [language, onPackageStatusChange, onRefresh],
  );

  const handlePackingPrint = useCallback(async () => {
    if (!packingOrderData?.id) return;
    try {
      setPrintLoading(true);
      await printMerchantReceipt(packingOrderData, productPriceMap, language);
    } catch (error) {
      LoggerService.warn('打包窗口补打小票失败', error);
      feedbackService.notify(
        language === 'zh'
          ? '打印失败，请检查浏览器是否允许打印，或稍后重试。'
          : language === 'en'
            ? 'Print failed. Check print permissions and try again.'
            : 'ပရင့်မရပါ။ ပြန်ကြိုးစားပါ။',
      );
    } finally {
      setPrintLoading(false);
    }
  }, [packingOrderData, productPriceMap, language]);

  const handleCompletePacking = useCallback(async () => {
    if (!packingOrderData) return;
    try {
      setActionLoading(true);
      const isPaid =
        packingOrderData.payment_method === 'balance' ||
        packingOrderData.payment_status === 'paid';
      const nextStatus = isPaid
        ? MERCHANT_ORDER_STATUS.PENDING_PICKUP
        : MERCHANT_ORDER_STATUS.PENDING_COD;
      const success = await packageService.updatePackageStatus(
        packingOrderData.id,
        nextStatus,
      );
      if (success) {
        feedbackService.notify(
          language === 'zh'
            ? '打包完成！快递员将很快上门取件。'
            : 'Packing complete! Courier will arrive soon.',
        );
        setShowPackingModal(false);
        setPackingOrderData(null);
        onPackageStatusChange?.(packingOrderData.id, nextStatus);
        onRefresh?.();
      }
    } catch (error) {
      LoggerService.error('打包失败:', error);
    } finally {
      setActionLoading(false);
    }
  }, [packingOrderData, language, onPackageStatusChange, onRefresh]);

  const isPackingCompleteEnabled = useMemo(() => {
    if (!packingModalModel) return false;
    if (packingModalModel.lineCount === 0) return !!checkedItems['default'];
    return !packingModalModel.rows.some(
      (_row, index) => !checkedItems[`item-${index}`],
    );
  }, [packingModalModel, checkedItems]);

  return {
    actionLoading,
    printLoading,
    selectedPackage,
    setSelectedPackage,
    showPackageDetailModal,
    setShowPackageDetailModal,
    openPackageDetail,
    closePackageDetail,
    packingOrderData,
    showPackingModal,
    setShowPackingModal,
    checkedItems,
    packingModalModel,
    isPartnerStore,
    handleOrderClick,
    handleStartPacking,
    togglePackingItem,
    handleAcceptOrder,
    handleAcceptMany,
    handlePrintMany,
    handleCancelOrder,
    handleCompletePacking,
    handlePackingPrint,
    isPackingCompleteEnabled,
    closePackingModal: () => {
      if (!actionLoading) setShowPackingModal(false);
    },
  };
}
