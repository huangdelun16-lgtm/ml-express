import type { OrderBarcodeData } from '../components/OrderBarcodeModal';

export type PrintPreviewMode = 'express' | 'package';

/** 设置页打印预览 — 快递明细（入库单）示例 */
export const PRINT_PREVIEW_SAMPLE: OrderBarcodeData = {
  productName: 'Sample',
  barcode: 'MDY060400290726',
  inputBarcode: '67499191994',
  kind: 'inbound',
};

/** 设置页打印预览 — 包装号示例 */
export const PRINT_PREVIEW_PACK_SAMPLE: OrderBarcodeData = {
  productName: 'Sample Pack',
  barcode: 'RUI26MDY20002',
  kind: 'pack',
};
