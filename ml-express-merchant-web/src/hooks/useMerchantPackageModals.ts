import { useCallback, useMemo, useState } from 'react';
import { packageService } from '../services/supabase';
import LoggerService from '../services/LoggerService';
import { MERCHANT_ORDER_STATUS } from '../constants/merchantOrderStatus';
import type { MerchantLanguage } from '../constants/merchantOrderStatus';
import { getPackingModalModel } from '../utils/parseOrderPackingItems';
import { printMerchantReceipt } from '../utils/printMerchantReceipt';

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
          alert(
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
          await printMerchantReceipt(pkgToAccept, productPriceMap, language);
          removePendingOrder?.(pkgToAccept.id);
          alert(
            language === 'zh'
              ? '接单成功！小票已自动打印，请开始打包商品。'
              : 'Order accepted! Receipt printed.',
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
        alert(
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
    handleCancelOrder,
    handleCompletePacking,
    isPackingCompleteEnabled,
    closePackingModal: () => {
      if (!actionLoading) setShowPackingModal(false);
    },
  };
}
