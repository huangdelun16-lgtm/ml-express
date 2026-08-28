import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { globalSearch, SearchHit } from '../services/adminInsightsService';

const TYPE_LABEL: Record<string, string> = {
  package: '运单',
  user: '用户',
  store: '店铺',
  courier: '骑手',
};

export const ADMIN_SEARCH_EVENT = 'ml-admin-open-search';

export function openAdminGlobalSearch() {
  window.dispatchEvent(new Event(ADMIN_SEARCH_EVENT));
}

/**
 * Ctrl/⌘ + K 全局搜索，跳转同城订单 / 用户管理 / 商家管理 等（带 URL 参数）
 */
const AdminGlobalSearch: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number>();

  const runSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    try {
      const data = await globalSearch(term);
      setHits(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQ('');
      setHits([]);
    }
  }, [open]);

  useEffect(() => {
    window.clearTimeout(timerRef.current);
    if (!open) return;
    timerRef.current = window.setTimeout(() => {
      void runSearch(q);
    }, 320);
    return () => window.clearTimeout(timerRef.current);
  }, [q, open, runSearch]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(ADMIN_SEARCH_EVENT, onOpen);
    return () => window.removeEventListener(ADMIN_SEARCH_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return;
      const path = window.location.pathname || '';
      if (!path.startsWith('/admin') || path === '/admin/login') return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!location.pathname.startsWith('/admin') || location.pathname === '/admin/login') {
    return null;
  }

  if (!open) return null;

  return (
    <div
      className="admin-search"
      role="dialog"
      aria-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="admin-search__panel">
        <div className="admin-search__head">
          <div className="admin-search__hint">全局搜索 · Ctrl / ⌘ + K</div>
          <input
            ref={inputRef}
            className="admin-search__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="运单号、电话、中转码、店铺名、骑手名…"
          />
        </div>
        <div className="admin-search__list">
          {loading && <div className="admin-search__empty">搜索中…</div>}
          {!loading && q.trim().length >= 2 && !hits.length && (
            <div className="admin-search__empty">无匹配结果</div>
          )}
          {hits.map((h) => (
            <button
              key={`${h.type}-${h.id}-${h.path}`}
              type="button"
              className="admin-search__hit"
              onClick={() => {
                setOpen(false);
                navigate(h.path);
              }}
            >
              <div className="admin-search__type">{TYPE_LABEL[h.type] || h.type}</div>
              <div className="admin-search__title">{h.title}</div>
              {h.subtitle && <div className="admin-search__sub">{h.subtitle}</div>}
            </button>
          ))}
        </div>
        <div className="admin-search__foot">Esc 关闭</div>
      </div>
    </div>
  );
};

export default AdminGlobalSearch;
