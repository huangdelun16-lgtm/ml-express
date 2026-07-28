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

export function listItemOrderBarcodeData(
  item: {
    name: string;
    barcode: string;
    input_barcode?: string;
    destination?: string;
    final_destination?: string;
    customer_name?: string;
    recipient_name?: string;
  },
  isPack: boolean,
): OrderBarcodeData {
  if (isPack) {
    return packOrderBarcodeData({
      name: item.name,
      barcode: item.barcode,
      destination: item.destination || item.final_destination,
      customerName: item.customer_name || item.recipient_name,
    });
  }
  return inboundOrderBarcodeData({
    name: item.name,
    barcode: item.barcode,
    input_barcode: item.input_barcode,
    destination: item.destination || item.final_destination,
    customer_name: item.customer_name || item.recipient_name,
  });
}
