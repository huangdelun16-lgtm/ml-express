import React from 'react';
import '../styles/crossBorderLogistics.css';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 30];

type Props = {
  page: number;
  pageSize: number;
  totalItems: number;
  /** totalItems < 0 时没有精确总数，用 hasMore 决定能否下一页。 */
  hasMore?: boolean;
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
  hasMore = false,
  onPageChange,
  onPageSizeChange,
  isEn = false,
}) => {
  const unknownTotal = totalItems < 0;
  const totalPages = unknownTotal ? page + (hasMore ? 1 : 0) : totalPagesFor(totalItems, pageSize);
  const safePage = unknownTotal ? Math.max(1, page) : Math.min(Math.max(1, page), totalPages);
  const nextDisabled = unknownTotal ? !hasMore : safePage >= totalPages;

  if (!unknownTotal && totalItems <= pageSize && !onPageSizeChange) return null;

  return (
    <div className="cbl-pagination">
      <span className="cbl-pagination__info">
        {unknownTotal
          ? isEn
            ? `Page ${safePage}`
            : `第 ${safePage} 页`
          : isEn
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
          disabled={nextDisabled}
          onClick={() => onPageChange(safePage + 1)}
        >
          {isEn ? 'Next' : '下一页'}
        </button>
      </div>
    </div>
  );
};

export default CblTablePagination;
