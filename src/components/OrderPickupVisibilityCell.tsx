import type { InventoryOrderRow } from '../services/inventoryConsoleService';
import {
  orderPickupVisibility,
  orderPickupVisibilityBadgeClass,
  orderPickupVisibilityLabel,
} from '../utils/inventoryOrderTracking';

type Props = {
  order: Pick<
    InventoryOrderRow,
    'customer_signed_at' | 'arrival_notified_at' | 'hub_received_at' | 'status'
  >;
  isEn: boolean;
};

export default function OrderPickupVisibilityCell({ order, isEn }: Props) {
  const visibility = orderPickupVisibility(order);
  return (
    <span className={orderPickupVisibilityBadgeClass(visibility.kind)}>
      {orderPickupVisibilityLabel(order, isEn)}
    </span>
  );
}
