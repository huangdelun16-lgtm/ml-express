export type PkgTrackingStatus =
  | 'in_transit'
  | 'hub_received'
  | 'completed'
  | 'cancelled'
  | 'split_at_hub';
export type OrderTrackingStatus = 'in_transit' | 'hub_received' | 'released_at_hub';

export interface PkgTrackingRecord {
  id: string;
  pack_barcode: string;
  pack_name: string;
  origin_store_id: string | null;
  origin_store_code: string;
  origin_store_name: string;
  /** 包装号标注的最终目的地（信息用途） */
  destination_code: string;
  /** 本段装车运达站 */
  leg_destination_code: string;
  item_count: number;
  total_weight: string;
  status: PkgTrackingStatus;
  truck_outbound_date: string | null;
  truck_loaded_at: string | null;
  hub_received_at: string | null;
  hub_received_by_store_code: string | null;
  hub_received_by_store_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderTrackingRecord {
  id: string;
  pkg_tracking_id: string;
  pack_barcode: string;
  order_barcode: string;
  express_barcode: string;
  order_name: string;
  /** 订单最终目的地 */
  destination_code: string;
  qty: number;
  status: OrderTrackingStatus;
  hub_received_at: string | null;
  hub_received_by_store_code: string | null;
  hub_received_by_store_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PkgTrackingDetail extends PkgTrackingRecord {
  orders: OrderTrackingRecord[];
  received_order_count: number;
}

export const PKG_STATUS_LABEL: Record<PkgTrackingStatus, string> = {
  in_transit: '运输中',
  hub_received: '到站已收包',
  completed: '全部完成',
  cancelled: '已取消',
  split_at_hub: '已分拨拆包',
};

export const ORDER_STATUS_LABEL: Record<OrderTrackingStatus, string> = {
  in_transit: '运输中',
  hub_received: '本站已交付',
  released_at_hub: '已释放待转出',
};
