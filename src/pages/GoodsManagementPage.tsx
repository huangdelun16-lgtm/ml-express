import { useNavigate } from 'react-router-dom';
import InventoryHubPanel from '../components/InventoryHubPanel';

/** 功能菜单「货物管理」：独立全屏 admin 模块。 */
export default function GoodsManagementPage() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        background: '#0b1220',
        color: '#f8fafc',
      }}
    >
      <div
        style={{
          borderBottom: '1px solid rgba(148,163,184,0.14)',
          background: 'linear-gradient(180deg, #111827 0%, #0b1220 100%)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            style={{
              border: '1px solid rgba(148,163,184,0.28)',
              background: 'rgba(15,23,42,0.45)',
              color: '#e2e8f0',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.85)' }}>Admin</span>
            <span style={{ color: 'rgba(148,163,184,0.45)' }}>/</span>
            <strong style={{ fontSize: 14, letterSpacing: '-0.01em' }}>货物管理</strong>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 8px 32px' }}>
        <InventoryHubPanel onClose={() => navigate('/admin/dashboard')} />
      </div>
    </div>
  );
}
