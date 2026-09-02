import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MerchantOrderProvider, useMerchantOrders } from '../../contexts/MerchantOrderContext';
import OrderAlertModal from '../orders/OrderAlertModal';
import MerchantRiderApproachHost from '../orders/MerchantRiderApproachHost';

function OrderAlertHost() {
  const { language } = useLanguage();
  const {
    pendingOrders,
    showOrderAlert,
    setShowOrderAlert,
    removePendingOrder,
  } = useMerchantOrders();

  return (
    <OrderAlertModal
      visible={showOrderAlert && pendingOrders.length > 0}
      orders={pendingOrders}
      language={language as 'zh' | 'en' | 'my'}
      onClose={() => setShowOrderAlert(false)}
      onAccepted={(id) => removePendingOrder(id)}
      onDeclined={(id) => removePendingOrder(id)}
    />
  );
}

const MerchantOrderShell: React.FC<{
  storeId: string;
  children: React.ReactNode;
}> = ({ storeId, children }) => (
  <MerchantOrderProvider storeId={storeId}>
    {storeId ? <MerchantRiderApproachHost storeId={storeId} /> : null}
    {children}
    <OrderAlertHost />
  </MerchantOrderProvider>
);

export default MerchantOrderShell;
