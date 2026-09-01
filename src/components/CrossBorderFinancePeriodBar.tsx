import React from 'react';
import type { FinancePeriodKind } from '../utils/yangonFinancePeriod';
import type { InventoryTransitStore } from '../services/inventoryConsoleService';

type Props = {
  kind: FinancePeriodKind;
  date: string;
  storeCode: string;
  stores: InventoryTransitStore[];
  isEn: boolean;
  exporting?: boolean;
  onKindChange: (kind: FinancePeriodKind) => void;
  onDateChange: (date: string) => void;
  onStoreCodeChange: (code: string) => void;
  onExport: () => void;
};

function toMonthValue(date: string): string {
  return date.slice(0, 7);
}

const CrossBorderFinancePeriodBar: React.FC<Props> = ({
  kind,
  date,
  storeCode,
  stores,
  isEn,
  exporting,
  onKindChange,
  onDateChange,
  onStoreCodeChange,
  onExport,
}) => {
  return (
    <div className="cbl-period-bar">
      <div className="cbl-period-bar__kinds" role="group" aria-label={isEn ? 'Period' : '期间'}>
        {(['day', 'month', 'year'] as FinancePeriodKind[]).map((item) => (
          <button
            key={item}
            type="button"
            className={`cbl-period-bar__kind${kind === item ? ' cbl-period-bar__kind--on' : ''}`}
            onClick={() => onKindChange(item)}
          >
            {item === 'day' ? (isEn ? 'Day' : '日') : item === 'month' ? (isEn ? 'Month' : '月') : isEn ? 'Year' : '年'}
          </button>
        ))}
      </div>
      {kind === 'day' ? (
        <input
          type="date"
          className="cbl-period-bar__input"
          value={date.slice(0, 10)}
          onChange={(e) => onDateChange(e.target.value)}
        />
      ) : null}
      {kind === 'month' ? (
        <input
          type="month"
          className="cbl-period-bar__input"
          value={toMonthValue(date)}
          onChange={(e) => onDateChange(`${e.target.value}-01`)}
        />
      ) : null}
      {kind === 'year' ? (
        <input
          type="number"
          className="cbl-period-bar__input"
          min={2020}
          max={2100}
          value={date.slice(0, 4)}
          onChange={(e) => onDateChange(`${e.target.value}-01-01`)}
        />
      ) : null}
      <select
        className="cbl-period-bar__input"
        value={storeCode}
        onChange={(e) => onStoreCodeChange(e.target.value)}
      >
        <option value="">{isEn ? 'All stations' : '全部站点'}</option>
        {stores.map((store) => (
          <option key={store.id} value={store.store_code}>
            {store.store_code} · {store.store_name}
          </option>
        ))}
      </select>
      <span className="cbl-period-bar__tz">Asia/Yangon</span>
      <button
        type="button"
        className="cbl-btn cbl-btn--light cbl-btn--sm"
        onClick={onExport}
        disabled={Boolean(exporting)}
      >
        {exporting ? (isEn ? 'Exporting…' : '导出中…') : isEn ? 'Export CSV' : '导出 CSV'}
      </button>
    </div>
  );
};

export default CrossBorderFinancePeriodBar;
