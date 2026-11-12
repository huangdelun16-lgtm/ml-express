import type { InventoryOrderRow } from '../services/inventoryConsoleService';
import CblContactActions from './CblContactActions';
import {
  orderTrackingStatusBadgeClass,
  orderTrackingStatusLabel,
} from '../utils/inventoryOrderTracking';

type PackTarget = {
  pack_barcode: string;
};

type Props = {
  orders: InventoryOrderRow[];
  isEn: boolean;
  language: string;
  onOpenPack?: (target: PackTarget) => void;
  showPack?: boolean;
};

function sameText(left?: string | null, right?: string | null): boolean {
  const a = String(left || '').trim();
  const b = String(right || '').trim();
  return Boolean(a) && a.toUpperCase() === b.toUpperCase();
}

function formatStamp(value?: string | null, language = 'zh'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(language === 'en' ? 'en-US' : 'zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function hubCode(order: InventoryOrderRow): string {
  return String(order.hub_received_by_store_code || '').trim();
}

function hubName(order: InventoryOrderRow): string {
  const code = hubCode(order);
  const name = String(order.hub_received_by_store_name || '').trim();
  if (!name || sameText(name, code)) return '';
  return name;
}

export default function TransportOrderList({
  orders,
  isEn,
  language,
  onOpenPack,
  showPack = true,
}: Props) {
  return (
    <div className="cbl-table-wrap">
      <table className="cbl-table cbl-table--orders">
        <thead>
          <tr>
            <th>{isEn ? 'Order' : '订单'}</th>
            <th>{isEn ? 'Customer' : '客户'}</th>
            <th>{isEn ? 'Destination' : '目的地'}</th>
            <th>{isEn ? 'Final hub' : '终点站'}</th>
            {showPack ? <th>{isEn ? 'Pack' : '包装'}</th> : null}
            <th>{isEn ? 'Pieces' : '件数'}</th>
            <th>{isEn ? 'Trip' : '车次'}</th>
            <th>{isEn ? 'Arrived' : '到站时间'}</th>
            <th>{isEn ? 'Signed' : '签收时间'}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const arrivedAt = order.hub_arrived_at || order.hub_received_at;
            const station = hubCode(order);
            const stationName = hubName(order);
            return (
              <tr key={order.id}>
                <td>
                  <div className="cbl-order-id">{order.order_barcode || '—'}</div>
                  {order.express_barcode ? (
                    <div className="cbl-order-sub">{order.express_barcode}</div>
                  ) : null}
                  <div className="cbl-order-badges">
                    <span className={orderTrackingStatusBadgeClass(order.status)}>
                      {orderTrackingStatusLabel(order.status, isEn)}
                    </span>
                  </div>
                </td>
                <td>
                  <div>{order.recipient_name || '—'}</div>
                  {order.recipient_phone ? (
                    <CblContactActions
                      phone={order.recipient_phone}
                      isEn={isEn}
                      message={
                        isEn
                          ? `Hello, this is ML Express regarding ${order.order_barcode || 'your shipment'}.`
                          : `您好，我是 ML Express，关于快件 ${order.order_barcode || ''}。`
                      }
                    />
                  ) : null}
                </td>
                <td>{order.destination_code || '—'}</td>
                <td>
                  <div>{station || '—'}</div>
                  {stationName ? <div className="cbl-order-sub">{stationName}</div> : null}
                </td>
                {showPack ? (
                  <td>
                    {order.pack_barcode && onOpenPack ? (
                      <button
                        type="button"
                        className="cbl-customer-name-btn"
                        data-cbl-tip={isEn ? 'See the orders in this pack' : '查看这个包裹里的订单'}
                        onClick={() => onOpenPack({ pack_barcode: order.pack_barcode })}
                      >
                        <span className="cbl-code">{order.pack_barcode}</span>
                      </button>
                    ) : (
                      order.pack_barcode || '—'
                    )}
                  </td>
                ) : null}
                <td>{order.qty > 0 ? order.qty : '—'}</td>
                <td>{String(order.trip_number || '').trim() || '—'}</td>
                <td className="cbl-order-time">{formatStamp(arrivedAt, language)}</td>
                <td className="cbl-order-time">
                  {formatStamp(order.customer_signed_at, language)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
