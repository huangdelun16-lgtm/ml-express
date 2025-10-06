import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryStoreService, DeliveryStore } from '../services/supabase';

const DeliveryStoreManagement: React.FC = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await deliveryStoreService.getAllStores();
      setStores(data);
    } catch (error) {
      console.error('加载快递店失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
      padding: '20px',
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        color: 'white'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>快递店管理</h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.85 }}>管理配送网点、自提点和分拣中心</p>
        </div>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '10px 18px',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          ← 返回仪表板
        </button>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white'
      }}>
        <h2 style={{ marginBottom: '20px' }}>快递店列表</h2>
        {loading ? (
          <p>加载中...</p>
        ) : stores.length === 0 ? (
          <p style={{ opacity: 0.7 }}>暂无快递店数据</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stores.map((store) => (
              <div
                key={store.id}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{store.store_name}</h3>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: store.status === 'active' ? 'rgba(72, 187, 120, 0.3)' : 'rgba(160, 174, 192, 0.3)',
                    fontSize: '0.8rem'
                  }}>
                    {store.status === 'active' ? '营业中' : '暂停营业'}
                  </span>
                </div>
                <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>{store.address}</p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', opacity: 0.7 }}>
                  <span>📞 {store.phone}</span>
                  <span>👤 {store.manager_name}</span>
                  <span>⏰ {store.operating_hours}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryStoreManagement;
