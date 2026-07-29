import type { OrderBarcodeData } from '../components/OrderBarcodeModal';

/** 设置页打印预览使用的示例标签（与实际订单标签格式一致） */
export const PRINT_PREVIEW_SAMPLE: OrderBarcodeData = {
  productName: 'Sample',
  barcode: 'MDY060400290726',
  inputBarcode: '67499191994',
  kind: 'inbound',
};
