import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchInventoryConsoleOrdersByPack,
  type InventoryOrderRow,
  type PackGlance,
} from '../services/inventoryConsoleService';
import { filterOrders } from '../utils/crossBorderConsoleSearch';
import { INVENTORY_CONSOLE_LIST_LIMIT } from '../services/inventoryConsoleService';
import CblSearchCombobox from './CblSearchCombobox';
import TransportOrderList from './TransportOrderList';
import type { CblSearchOption } from '../utils/cblSearchCombobox';
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

function formatFee(fee: number | null | undefined): string {
  if (fee == null || !Number.isFinite(fee)) return '—';
  return `${Math.round(fee).toLocaleString('en-US')} MMK`;
}

function formatExportCost(cost: PackGlance['exportCost'], isEn: boolean): string {
  if (!cost) return isEn ? 'Not filled' : '未填';
  if (cost.payCurrency === 'MMK') {
    return `${Math.round(cost.totalMmk).toLocaleString('en-US')} MMK`;
  }
  const total = Number(cost.totalCny) || 0;
  const text = `¥${total.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (cost.unitPriceCny > 0) return `${text} · ¥${cost.unitPriceCny}/Kg`;
  return text;
}

const PackOrdersModal: React.FC<Props> = ({ open, pack, isEn, language, onClose }) => {
  const [orders, setOrders] = useState<InventoryOrderRow[]>([]);
  const [glance, setGlance] = useState<PackGlance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!open || !pack?.pack_barcode) {
      setOrders([]);
      setGlance(null);
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
        setGlance(result.packGlance ?? null);
        setTruncated(Boolean(result.ordersTruncated) || result.recentOrders.length >= INVENTORY_CONSOLE_LIST_LIMIT);
      })
      .catch((err) => {
        if (cancelled) return;
        setOrders([]);
        setGlance(null);
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
  const cargoLabel = useMemo(() => {
    const counted = orders.reduce((sum, order) => sum + (Number(order.qty) || 0), 0);
    const pieces = glance?.pieceCount ?? (counted > 0 ? counted : null);
    const weight = String(glance?.weightLabel || '').trim();
    const pieceText = pieces && pieces > 0 ? `${pieces} ${isEn ? 'pcs' : '件'}` : '';
    return [pieceText, weight].filter(Boolean).join(' · ');
  }, [glance?.pieceCount, glance?.weightLabel, orders, isEn]);
  const tripLabel = String(glance?.tripNumber || pack?.trip_number || '').trim();
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
          <dl className="cbl-pack-orders-modal__facts">
            <div>
              <dt>{isEn ? 'Pieces and weight' : '件数和重量'}</dt>
              <dd>{loading ? '…' : cargoLabel || '—'}</dd>
            </div>
            <div>
              <dt>{isEn ? 'Trip' : '车次'}</dt>
              <dd>{loading ? '…' : tripLabel || '—'}</dd>
            </div>
            <div>
              <dt>{isEn ? 'Truck fee' : '车费'}</dt>
              <dd>{loading ? '…' : formatFee(glance?.transportFee)}</dd>
            </div>
            <div>
              <dt>{isEn ? 'Export cost' : '出口成本'}</dt>
              <dd>{loading ? '…' : formatExportCost(glance?.exportCost ?? null, isEn)}</dd>
            </div>
          </dl>
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
            <TransportOrderList
              orders={visibleOrders}
              isEn={isEn}
              language={language}
              showPack={false}
            />
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
