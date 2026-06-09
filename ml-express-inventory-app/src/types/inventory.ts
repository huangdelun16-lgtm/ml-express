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
  /** 最近一次入库登记的收件人姓名（列表查询时填充） */
  customer_name?: string;
  /** 最近一次入库登记的目的地（列表查询时填充） */
  destination?: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
}

export interface PackedShipment {
  id: string;
  bundle_item_id: string;
  bundle_barcode: string;
  bundle_name: string;
  operator: string;
  note: string;
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
  qty: number;
}

/** 已确认打包的快递包裹（含明细） */
export interface PackedShipmentDetail extends PackedShipment {
  spec: string;
  unit: string;
  weight: string;
  items: PackedShipmentItem[];
}

/** 商品库订单详情（查看用） */
export interface InventoryItemDetail extends InventoryItem {
  recipient_phone: string;
  packaging: string;
  /** 若为打包生成的包裹，附带打包明细 */
  pack: PackedShipmentDetail | null;
}
