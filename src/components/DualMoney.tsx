import { formatCnyAmount, mmkToCny } from '../utils/crossBorderFx';

export function formatMmK(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

export default function DualMoney({
  mmk,
  rate,
  cny,
  prefix = '',
}: {
  mmk?: number | null;
  rate: number | null;
  cny?: number | null;
  prefix?: string;
}) {
  const value = mmk ?? 0;
  const converted = cny !== undefined ? cny : mmkToCny(value, rate);
  if (converted == null) {
    return (
      <span className="cbl-money">
        {prefix}
        {formatMmK(value)} <span className="cbl-money-ccy">MMK</span>
      </span>
    );
  }
  return (
    <span className="cbl-money cbl-money--dual">
      <span className="cbl-money-main">
        {prefix}
        {formatCnyAmount(converted)} <span className="cbl-money-ccy">CNY</span>
      </span>
      <span className="cbl-money-sub">{formatMmK(value)} MMK</span>
    </span>
  );
}
