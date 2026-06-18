import React from 'react';
import '../styles/crossBorderLogistics.css';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 30];

type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isEn?: boolean;
};

export function paginateSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPagesFor(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

const CblTablePagination: React.FC<Props> = ({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  isEn = false,
}) => {
  const totalPages = totalPagesFor(totalItems, pageSize);
  const safePage = Math.min(Math.max(1, page), totalPages);

  if (totalItems <= pageSize && !onPageSizeChange) return null;

  return (
    <div className="cbl-pagination">
      <span className="cbl-pagination__info">
        {isEn
          ? `${totalItems} row(s) · page ${safePage}/${totalPages}`
          : `共 ${totalItems} 条 · 第 ${safePage}/${totalPages} 页`}
      </span>
      <div className="cbl-pagination__controls">
        {onPageSizeChange ? (
          <label className="cbl-pagination__size">
            <span>{isEn ? 'Per page' : '每页'}</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className="cbl-pagination__btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          {isEn ? 'Prev' : '上一页'}
        </button>
        <button
          type="button"
          className="cbl-pagination__btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          {isEn ? 'Next' : '下一页'}
        </button>
      </div>
    </div>
  );
};

export default CblTablePagination;
