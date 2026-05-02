import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { globalSearch, SearchHit } from '../services/adminInsightsService';

const TYPE_LABEL: Record<string, string> = {
  package: '运单',
  user: '用户',
  store: '店铺',
  courier: '骑手',
};

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
      role="dialog"
      aria-modal
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(8, 20, 40, 0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        paddingLeft: 16,
        paddingRight: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'linear-gradient(165deg, #1a365d 0%, #2c5282 100%)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.12)',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>全局搜索 · Ctrl / ⌘ + K</div>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="运单号、电话、中转码、店铺名、骑手名…"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.25)',
              color: '#fff',
              fontSize: 16,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
          {loading && <div style={{ padding: 20, opacity: 0.85 }}>搜索中…</div>}
          {!loading && q.trim().length >= 2 && !hits.length && <div style={{ padding: 20, opacity: 0.8 }}>无匹配结果</div>}
          {hits.map((h) => (
            <button
              key={`${h.type}-${h.id}-${h.path}`}
              type="button"
              onClick={() => {
                setOpen(false);
                navigate(h.path);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 12, color: '#90cdf4', marginBottom: 4 }}>{TYPE_LABEL[h.type] || h.type}</div>
              <div style={{ fontWeight: 700 }}>{h.title}</div>
              {h.subtitle && <div style={{ fontSize: 13, opacity: 0.88, marginTop: 4 }}>{h.subtitle}</div>}
            </button>
          ))}
        </div>
        <div style={{ padding: '10px 16px', fontSize: 11, opacity: 0.7, borderTop: '1px solid rgba(255,255,255,0.08)' }}>Esc 关闭</div>
      </div>
    </div>
  );
};

export default AdminGlobalSearch;
