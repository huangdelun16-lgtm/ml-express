import type { FinanceLedgerCategory } from '../types/financeLedger';
import type { FinanceLedgerEntry } from '../types/financeLedger';
import type { OrderTrackingStatus, PkgTrackingStatus } from '../types/tracking';
import { extractDestinationCode } from '../utils/inboundBarcode';
import { packDestinationFromBarcode } from '../utils/packageNumber';
import type { InventoryStoreSession } from '../services/authService';
import { resolveItemDestinationCode } from '../utils/itemDestination';
import {
  isItemCustomerProfileLocked,
  type ItemCustomerProfileEditRef,
} from '../utils/itemCustomerProfileEdit';
import {
  canEditOwnedRecord,
  ownershipLabelFromKey,
  resolveOwnerKeyForListItem,
  toComparableOwnerKey,
} from '../utils/storeOwnership';
import { fmt } from './format';
import type { TranslationDict } from './translations';

export function formatTimeAgo(
  iso: string,
  t: TranslationDict,
): { primary: string; secondary: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { primary: iso, secondary: '' };
  }
  const now = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  const full = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return { primary: t.common.timeJustNow, secondary: full };
  if (diffMin < 60) {
    return { primary: fmt(t.common.timeMinutesAgo, { n: diffMin }), secondary: full };
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return { primary: fmt(t.common.timeHoursAgo, { n: diffHr }), secondary: full };
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return { primary: fmt(t.common.timeDaysAgo, { n: diffDay }), secondary: full };
  }
  return { primary: full, secondary: '' };
}

export function getPkgStatusLabel(t: TranslationDict, status: PkgTrackingStatus): string {
  return t.tracking.pkgStatus[status];
}

export function getOrderStatusLabel(t: TranslationDict, status: OrderTrackingStatus): string {
  return t.tracking.orderStatus[status];
}

export function getLedgerCategoryLabel(t: TranslationDict, category: FinanceLedgerCategory): string {
  return t.ledgerCategory[category];
}

export function getEditDeniedMessage(
  t: TranslationDict,
  ownerRef: string | null | undefined,
): string {
  const ownerKey = toComparableOwnerKey(ownerRef);
  if (!ownerKey) {
    return t.serviceErrors.editDeniedUnknownOwner;
  }
  const label = ownershipLabelFromKey(ownerKey);
  return fmt(t.serviceErrors.editDeniedOtherStore, { owner: label });
}

export function getItemCustomerProfileEditDeniedMessage(
  t: TranslationDict,
  item: ItemCustomerProfileEditRef,
  store?: InventoryStoreSession | null,
  hubCode?: string,
): string {
  if (isItemCustomerProfileLocked(item)) {
    return t.items.cannotEditHubReceived;
  }
  if (store) {
    const ownerKey = resolveOwnerKeyForListItem(item);
    const hub = hubCode?.trim().toUpperCase();
    const destKey = resolveItemDestinationCode(item);
    const hasDestAccess = Boolean(hub && destKey && destKey === hub);
    if (canEditOwnedRecord(store, ownerKey) || hasDestAccess) {
      return t.items.cannotEditHubReceived;
    }
    return getEditDeniedMessage(t, ownerKey);
  }
  return t.items.cannotEditBody;
}

/** 到站扫码查不到包裹时的说明文案 */
export function formatPkgNotFoundHint(
  t: TranslationDict,
  packBarcode: string,
  hubCode: string,
): string {
  const h = t.hubReceiveHints;
  const packDest = packDestinationFromBarcode(packBarcode);
  const hub = hubCode.trim().toUpperCase();
  const lines = [h.title, '', h.stepsLead, h.step1, h.step2, h.step3, h.step4];
  if (packDest && hub && packDest !== hub) {
    lines.push('', fmt(h.destMismatch, { packDest, hub }));
  } else if (packDest) {
    lines.push('', fmt(h.destOnly, { packDest }));
  }
  lines.push('', h.resyncTip);
  return lines.join('\n');
}

/** 到站扫码入库单/快递单查不到时的说明 */
export function formatOrderNotFoundHint(
  t: TranslationDict,
  scanCode: string,
  hubCode: string,
): string {
  const h = t.orderReceiveHints;
  const dest = extractDestinationCode(scanCode);
  const hub = hubCode.trim().toUpperCase();
  const lines = [h.title, '', h.scanHint, '', h.stepsLead, h.step1, h.step2, h.step3];
  if (dest && hub && dest !== hub) {
    lines.push('', fmt(h.destMismatch, { dest, hub }));
  }
  lines.push('', h.manualTip);
  return lines.join('\n');
}

export function getLedgerAmountDisplay(t: TranslationDict, entry: FinanceLedgerEntry): string {
  if (entry.category === 'transport_cost') {
    if (entry.paid || entry.amountDisplay === '已支付') {
      return t.crossBorderFinance.ledgerTransportPaid;
    }
    const fee = entry.transportFee ?? 0;
    if (fee <= 0 || entry.amountDisplay === '待登记车费') {
      return t.crossBorderFinance.ledgerTransportFeePending;
    }
  }
  return entry.amountDisplay;
}

export function getTransportFeeDisplay(t: TranslationDict, raw: string | undefined | null): string {
  if (!raw?.trim()) return t.hubReceive.feeNotRegistered;
  const n = Number(raw.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return t.hubReceive.feeNotRegistered;
  return `${n % 1 === 0 ? n : n.toFixed(2)} MMK`;
}

export function getPaymentLabelDisplay(t: TranslationDict, raw?: string | null): string {
  const value = String(raw ?? '').trim();
  if (value === '到付' || /^cod$/i.test(value)) return t.stockIn.cod;
  if (value === '预付' || /^prepaid$/i.test(value)) return t.stockIn.prepaid;
  return value;
}

export const LEDGER_CATEGORY_STYLE: Record<
  FinanceLedgerCategory,
  { icon: string; accent: string; tint: string; pillBg: string }
> = {
  order_income_cod: {
    icon: '💵',
    accent: '#34d399',
    tint: 'rgba(52,211,153,0.12)',
    pillBg: 'rgba(52,211,153,0.18)',
  },
  order_prepaid: {
    icon: '✓',
    accent: '#60a5fa',
    tint: 'rgba(96,165,250,0.12)',
    pillBg: 'rgba(96,165,250,0.18)',
  },
  order_collected: {
    icon: '✅',
    accent: '#2dd4bf',
    tint: 'rgba(45,212,191,0.12)',
    pillBg: 'rgba(45,212,191,0.18)',
  },
  transport_cost: {
    icon: '🚚',
    accent: '#f87171',
    tint: 'rgba(248,113,113,0.12)',
    pillBg: 'rgba(248,113,113,0.18)',
  },
  manual_income: {
    icon: '📈',
    accent: '#34d399',
    tint: 'rgba(52,211,153,0.12)',
    pillBg: 'rgba(52,211,153,0.18)',
  },
  manual_expense: {
    icon: '📉',
    accent: '#f87171',
    tint: 'rgba(248,113,113,0.12)',
    pillBg: 'rgba(248,113,113,0.18)',
  },
  stock_op: {
    icon: '📋',
    accent: '#94a3b8',
    tint: 'rgba(148,163,184,0.1)',
    pillBg: 'rgba(148,163,184,0.15)',
  },
  agency_remit: {
    icon: '⇄',
    accent: '#f59e0b',
    tint: 'rgba(245,158,11,0.12)',
    pillBg: 'rgba(245,158,11,0.18)',
  },
};

export function getExceptionTypeLabel(t: TranslationDict, type: string): string {
  if (type === 'damage') return t.exception.typeDamage;
  if (type === 'shortage') return t.exception.typeShortage;
  if (type === 'excess') return t.exception.typeExcess;
  if (type === 'lost') return t.exception.typeLost;
  if (type === 'wrong_item') return t.exception.typeWrongItem;
  if (type === 'return_origin') return t.exception.typeReturnOrigin;
  return type;
}

export function getExceptionStatusLabel(t: TranslationDict, status: string): string {
  if (status === 'open') return t.exception.statusOpen;
  if (status === 'resolved') return t.exception.statusResolved;
  if (status === 'cancelled') return t.exception.statusCancelled;
  return status;
}
