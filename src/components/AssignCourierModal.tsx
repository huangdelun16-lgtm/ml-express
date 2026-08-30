import React, { useMemo } from 'react';
import {
  packageHasCod,
  resolvePackageCodAmount,
} from '../utils/packageCodAmount';
import {
  centroidOfPackages,
  rankCouriersForAssign,
  type RankableCourier,
  type RankedCourier,
} from '../utils/batchAssign';
import '../styles/adminAssignCourier.css';

type AssignableTarget = {
  id: string;
  sender_name?: string | null;
  sender_address?: string | null;
  sender_latitude?: number | null;
  sender_longitude?: number | null;
  receiver_name?: string | null;
  receiver_address?: string | null;
  delivery_speed?: string | null;
  courier?: string | null;
  status?: string | null;
  cod_amount?: number | null;
  description?: string | null;
};

type Props<T extends RankableCourier> = {
  packages: AssignableTarget[];
  couriers: T[];
  busy?: boolean;
  onClose: () => void;
  onPick: (courier: RankedCourier<T>) => void;
};

function statusLabel(status?: string | null): string {
  switch (String(status ?? '').toLowerCase()) {
    case 'online':
    case 'active':
      return '在线';
    case 'busy':
      return '忙碌';
    case 'offline':
    case 'inactive':
      return '离线';
    default:
      return '未知';
  }
}

function statusColor(status?: string | null): string {
  switch (String(status ?? '').toLowerCase()) {
    case 'online':
    case 'active':
      return '#10b981';
    case 'busy':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}

function asCodPackage(pkg: AssignableTarget): Pick<
  { description?: string; cod_amount?: number },
  'description' | 'cod_amount'
> {
  return {
    description: pkg.description ?? undefined,
    cod_amount: pkg.cod_amount ?? undefined,
  };
}

function riderClass(index: number, status?: string | null): string {
  const s = String(status ?? '').toLowerCase();
  if (index === 0) return 'admin-assign-modal__rider admin-assign-modal__rider--top';
  if (s === 'busy') return 'admin-assign-modal__rider admin-assign-modal__rider--busy';
  if (s === 'online' || s === 'active') {
    return 'admin-assign-modal__rider admin-assign-modal__rider--online';
  }
  return 'admin-assign-modal__rider';
}

export function AssignCourierModal<T extends RankableCourier>({
  packages,
  couriers,
  busy = false,
  onClose,
  onPick,
}: Props<T>) {
  const origin = useMemo(() => centroidOfPackages(packages), [packages]);
  const ranked = useMemo(
    () => rankCouriersForAssign(couriers, origin),
    [couriers, origin],
  );
  const first = packages[0];
  const isBatch = packages.length > 1;
  const codCount = packages.filter((pkg) => packageHasCod(asCodPackage(pkg))).length;
  const codTotal = packages.reduce((sum, pkg) => sum + resolvePackageCodAmount(asCodPackage(pkg)), 0);

  if (!first) return null;

  return (
    <div className="admin-assign-modal" role="dialog" aria-modal="true" aria-labelledby="admin-assign-title">
      <div className="admin-assign-modal__panel">
        <h2 id="admin-assign-title" className="admin-assign-modal__title">
          {isBatch ? `批量派单 · ${packages.length} 件` : `选择快递员 - ${first.id}`}
        </h2>

        <div className="admin-assign-modal__summary">
          {isBatch ? (
            <>
              <p>
                <strong>已选单号：</strong>
                <span className="admin-assign-modal__ids">
                  {packages.map((pkg) => pkg.id).join('、')}
                </span>
              </p>
              {origin ? (
                <p>推荐依据：选中单取件坐标中点，近的、手头单少的排前面</p>
              ) : (
                <p>选中单暂无取件坐标，按手头单量推荐</p>
              )}
            </>
          ) : (
            <>
              <p>
                <strong>寄件地址：</strong>
                {first.sender_address || '—'}
              </p>
              <p>
                <strong>收件地址：</strong>
                {first.receiver_address || '—'}
              </p>
            </>
          )}
          {codCount > 0 && (
            <p className="admin-assign-modal__cod">
              COD 代收款：{codCount} 件 · {codTotal.toLocaleString()} MMK
            </p>
          )}
        </div>

        {ranked.length === 0 ? (
          <div className="admin-assign-modal__empty">当前没有可派的在线骑手</div>
        ) : (
          ranked.map((courier, index) => (
            <button
              key={courier.id}
              type="button"
              className={riderClass(index, courier.status)}
              disabled={busy}
              onClick={() => onPick(courier)}
            >
              {index === 0 && <div className="admin-assign-modal__badge">智能推荐（最近 / 最闲）</div>}
              <div className="admin-assign-modal__rider-row">
                <div>
                  <h3 className="admin-assign-modal__name">
                    {courier.name}
                    {courier.distance != null && (
                      <span>距离 {courier.distance.toFixed(2)} km</span>
                    )}
                  </h3>
                  {courier.phone ? (
                    <p className="admin-assign-modal__meta">
                      <a href={`tel:${courier.phone}`} onClick={(e) => e.stopPropagation()}>
                        {courier.phone}
                      </a>
                    </p>
                  ) : null}
                  <div className="admin-assign-modal__stats">
                    <span>当前 {courier.currentPackages || 0} 件</span>
                    {isBatch ? <span>派完约 {(courier.currentPackages || 0) + packages.length} 件</span> : null}
                    {'todayDeliveries' in courier && (
                      <span>今日 {Number((courier as { todayDeliveries?: number }).todayDeliveries || 0)}</span>
                    )}
                  </div>
                </div>
                <span
                  className="admin-assign-modal__status"
                  style={{ background: statusColor(courier.status) }}
                >
                  {busy ? '派单中…' : statusLabel(courier.status)}
                </span>
              </div>
            </button>
          ))
        )}

        <button type="button" className="admin-assign-modal__cancel" disabled={busy} onClick={onClose}>
          {busy ? '派单中…' : '取消'}
        </button>
      </div>
    </div>
  );
}
