export type MovementType = 'in' | 'out' | 'adjust';

export interface InventoryItem {
  id: string;
  /** 确认入库时自动生成的条码（目的地+缅甸时间） */
  barcode: string;
  /** 快递单号（入库时扫码/手动填写） */
  input_barcode: string;
  name: string;
  spec: string;
  unit: string;
  weight: string;
  qty_on_hand: number;
  min_qty: number;
  note: string;
  /** 入库登记站店铺代码（如 MUSE001、YGN002）；空表示历史数据 */
  owner_store_code?: string;
  /** 最近一次入库登记的收件人姓名（列表查询时填充） */
  customer_name?: string;
  /** 最终目的地（入库收发信息登记，如 YGN、MDY） */
  final_destination?: string;
  /** 列表展示用，同 final_destination */
  destination?: string;
  created_at: string;
  updated_at: string;
}

/** 商品库列表行（含入库 / 打包状态） */
export interface InventoryItemListRow extends InventoryItem {
  stocked_in: boolean;
  packed: boolean;
  /** 所属快递包包装号（已打包时由列表查询填充） */
  parent_pack_barcode?: string;
}

export interface StockMovement {
  id: string;
  item_id: string;
  barcode: string;
  item_name: string;
  type: MovementType;
  qty: number;
  qty_before: number;
  qty_after: number;
  operator: string;
  note: string;
  recipient_name: string;
  recipient_phone: string;
  destination: string;
  packaging: string;
  input_barcode: string;
  origin_store_id: string;
  origin_store_code: string;
  origin_store_name: string;
  created_at: string;
}

export interface PackedShipment {
  id: string;
  bundle_item_id: string;
  bundle_barcode: string;
  bundle_name: string;
  operator: string;
  note: string;
  /** 打包操作站店铺代码 */
  owner_store_code: string;
  created_at: string;
}

export interface PackedShipmentItem {
  id: string;
  pack_id: string;
  item_id: string;
  item_barcode: string;
  /** 入库时填写的快递单号 */
  input_barcode: string;
  item_name: string;
  /** 订单最终目的地（来自入库流水） */
  destination: string;
  qty: number;
}

/** 已确认打包的快递包裹（含明细） */
export interface PackedShipmentDetail extends PackedShipment {
  spec: string;
  unit: string;
  weight: string;
  items: PackedShipmentItem[];
  /** 包裹库存（通常为 1）；0 表示已装车出库 */
  bundle_qty_on_hand: number;
  /** 是否已完成装车出库 */
  loaded: boolean;
}

/** 打包列表行（含云端在途状态） */
export interface PackedShipmentListRow extends PackedShipmentDetail {
  cloud_status: 'in_transit' | 'hub_received' | 'completed' | 'cancelled' | 'split_at_hub' | null;
  display_status: 'pending_load' | 'loaded' | 'arrived' | 'completed';
}

/** 装车出库追溯信息 */
export interface TruckLoadInfo {
  outboundDate: string;
  destination: string;
  operator: string;
  created_at: string;
}

/** 追踪快递查询结果 */
export interface TrackOrderResult {
  query: string;
  matchType: 'express' | 'inbound' | 'package';
  detail: InventoryItemDetail;
  /** 入库单所属 PKG（非包装号本身时） */
  parentPack: PackedShipmentDetail | null;
  truckLoad: TruckLoadInfo | null;
  recentMovements: StockMovement[];
}

/** 商品库订单详情（查看用） */
export interface InventoryItemDetail extends InventoryItem {
  recipient_phone: string;
  packaging: string;
  /** 若为打包生成的包裹，附带打包明细 */
  pack: PackedShipmentDetail | null;
}
