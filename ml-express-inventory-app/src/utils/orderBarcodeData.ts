import type { OrderBarcodeData } from '../components/OrderBarcodeModal';
import { packDestinationFromBarcode } from './packageNumber';

export type PackBarcodePayload = {
  name: string;
  barcode: string;
  spec?: string;
  unit?: string;
  weight?: string;
  destination?: string;
  customerName?: string;
};

export function inboundOrderBarcodeData(item: {
  name: string;
  barcode: string;
  input_barcode?: string;
  destination?: string;
  customer_name?: string;
}): OrderBarcodeData {
  return {
    productName: item.name,
    barcode: item.barcode,
    inputBarcode: item.input_barcode?.trim() || undefined,
    destination: item.destination?.trim() || undefined,
    customerName: item.customer_name?.trim() || undefined,
    kind: 'inbound',
  };
}

export function packOrderBarcodeData(payload: PackBarcodePayload): OrderBarcodeData {
  const dest = payload.destination || packDestinationFromBarcode(payload.barcode);
  return {
    productName: payload.name,
    barcode: payload.barcode,
    destination: dest || undefined,
    customerName: payload.customerName,
    kind: 'pack',
  };
}
