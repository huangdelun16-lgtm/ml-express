import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchInventoryConsoleOrdersByPack,
  type InventoryOrderRow,
} from '../services/inventoryConsoleService';
import { filterOrders } from '../utils/crossBorderConsoleSearch';
import { INVENTORY_CONSOLE_LIST_LIMIT } from '../services/inventoryConsoleService';
import CblSearchCombobox from './CblSearchCombobox';
import CblContactActions from './CblContactActions';
import type { CblSearchOption } from '../utils/cblSearchCombobox';
import {
  orderTrackingStatusBadgeClass,
  orderTrackingStatusLabel,
} from '../utils/inventoryOrderTracking';
import '../styles/crossBorderLogistics.css';

export type PackOrdersTarget = {
  pack_barcode: string;
  pack_name?: string | null;
  trip_number?: string | null;
  routeLabel?: string | null;
};

type Props = {
  open: boolean;
  pack: PackOrdersTarget | null;
  isEn: boolean;
  language: string;
  onClose: () => void;
};

function formatDateTime(value?: string | null, lang: string = 'zh'): string {
  if (!value) return '—';
  try {
    const loc = lang === 'en' ? 'en-US' : 'zh-CN';
    return new Date(value).toLocaleString(loc, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function notifyLabel(order: InventoryOrderRow, isEn: boolean, language: string): string {
  if (order.arrival_notified_at) return formatDateTime(order.arrival_notified_at, language);
  if (order.status === 'hub_received' || order.hub_received_at) {
    return isEn ? 'Not notified' : '未通知';
  }
  return '—';
}

function signedLabel(order: InventoryOrderRow, isEn: boolean, language: string): string {
  if (order.customer_signed_at) return formatDateTime(order.customer_signed_at, language);
  if (order.status === 'hub_received' || order.hub_received_at) {
    return isEn ? 'Awaiting pickup' : '待签收';
  }
  return '—';
}

const PackOrdersModal: React.FC<Props> = ({ open, pack, isEn, language, onClose }) => {
  const [orders, setOrders] = useState<InventoryOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!open || !pack?.pack_barcode) {
      setOrders([]);
      setError('');
      setSearch('');
      setTruncated(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    void fetchInventoryConsoleOrdersByPack(pack.pack_barcode)
      .then((result) => {
        if (cancelled) return;
        setOrders(result.recentOrders);
        setTruncated(Boolean(result.ordersTruncated) || result.recentOrders.length >= INVENTORY_CONSOLE_LIST_LIMIT);
      })
      .catch((err) => {
        if (cancelled) return;
        setOrders([]);
        setTruncated(false);
        setError(err instanceof Error ? err.message : isEn ? 'Failed to load' : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, pack?.pack_barcode, isEn]);

  const visibleOrders = useMemo(() => filterOrders(orders, search), [orders, search]);
  const searchOptions = useMemo((): CblSearchOption[] => {
    return orders.map((order) => ({
      id: order.id,
      label: order.order_barcode || order.express_barcode || '—',
      detail: [order.express_barcode, order.recipient_name || order.order_name, order.recipient_phone]
        .map((part) => String(part || '').trim())
        .filter((part) => part && part !== '—')
        .filter((part, index, all) => all.indexOf(part) === index)
        .join(' · '),
      value: order.order_barcode || order.express_barcode || order.recipient_name || '',
    }));
  }, [orders]);

  if (!open || !pack) return null;

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="cbl-pricing-modal cbl-pack-orders-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbl-pack-orders-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cbl-pricing-modal__head">
          <div>
            <h2 id="cbl-pack-orders-title" className="cbl-pricing-modal__title">
              {isEn ? 'Orders in pack' : '包内订单'}
            </h2>
            <p className="cbl-pricing-modal__sub">
              {pack.pack_barcode}
              {pack.pack_name ? ` · ${pack.pack_name}` : ''}
              {pack.trip_number ? ` · ${pack.trip_number}` : ''}
              {pack.routeLabel ? ` · ${pack.routeLabel}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="cbl-pricing-modal__close"
            onClick={onClose}
            aria-label={isEn ? 'Close' : '关闭'}
          >
            ✕
          </button>
        </header>

        <div className="cbl-pack-orders-modal__body">
          <p className="cbl-pack-orders-modal__hint">
            {isEn
              ? 'Headquarters view only. Customer pickup and arrival notify stay on Inventory App.'
              : '总部只看，不代客户签收、不代发到站通知。签收与通知以站点 Inventory App 为准。'}
          </p>
          <CblSearchCombobox
            value={search}
            onChange={setSearch}
            options={searchOptions}
            placeholder={
              isEn
                ? 'Search order, express, name or phone'
                : '搜索订单条码、快递单、姓名或电话'
            }
            emptyText={isEn ? 'No matching orders' : '没有匹配的订单'}
            count={search.trim() ? visibleOrders.length : orders.length}
            isEn={isEn}
            variant="light"
          />
          {truncated ? (
            <p className="cbl-truncation-hint cbl-truncation-hint--light">
              {isEn
                ? `Showing the latest ${INVENTORY_CONSOLE_LIST_LIMIT} orders in this pack.`
                : `该包装号仅显示最近 ${INVENTORY_CONSOLE_LIST_LIMIT} 笔订单。`}
            </p>
          ) : null}

          {error ? <div className="cbl-pricing-modal__alert">{error}</div> : null}

          {loading ? (
            <div className="cbl-empty">{isEn ? 'Loading orders…' : '正在加载包内订单…'}</div>
          ) : visibleOrders.length ? (
            <div className="cbl-table-wrap">
              <table className="cbl-table">
                <thead>
                  <tr>
                    <th>{isEn ? 'Order' : '订单条码'}</th>
                    <th>{isEn ? 'Customer' : '客户'}</th>
                    <th>{isEn ? 'Phone' : '电话'}</th>
                    <th>{isEn ? 'Destination' : '目的地'}</th>
                    <th>{isEn ? 'Status' : '状态'}</th>
                    <th>{isEn ? 'Notify' : '通知'}</th>
                    <th>{isEn ? 'Signed' : '签收'}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div style={{ fontWeight: 650 }}>{order.order_barcode || '—'}</div>
                        {order.express_barcode ? (
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            {order.express_barcode}
                          </div>
                        ) : null}
                      </td>
                      <td>{order.recipient_name || order.order_name || '—'}</td>
                      <td>
                        <CblContactActions
                          phone={order.recipient_phone}
                          isEn={isEn}
                          message={
                            isEn
                              ? `Hello, this is ML Express regarding ${order.order_barcode || 'your shipment'}.`
                              : `您好，我是 ML Express，关于快件 ${order.order_barcode || ''}。`
                          }
                        />
                      </td>
                      <td>{order.destination_code || '—'}</td>
                      <td>
                        <span className={orderTrackingStatusBadgeClass(order.status)}>
                          {orderTrackingStatusLabel(order.status, isEn)}
                        </span>
                      </td>
                      <td>{notifyLabel(order, isEn, language)}</td>
                      <td>{signedLabel(order, isEn, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cbl-empty">
              {search.trim()
                ? isEn
                  ? 'No matching orders in this pack.'
                  : '该包装号下没有匹配的订单。'
                : isEn
                  ? 'No orders found for this pack.'
                  : '该包装号下暂无订单。'}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PackOrdersModal;
