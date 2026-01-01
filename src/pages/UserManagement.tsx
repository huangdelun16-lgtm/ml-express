import React, { useState, useEffect, useMemo } from 'react';
import { SkeletonTable } from '../components/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { supabase, auditLogService, deliveryStoreService, adminAccountService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';

// 用户数据类型定义
interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password?: string;
  user_type: 'customer' | 'courier' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  registration_date: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
  rating: number;
  notes?: string;
  register_region?: string;
  created_at?: string;
  updated_at?: string;
}

interface Courier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  vehicle_type: string;
  license_number: string;
  status: string;
  join_date: string;
  last_active: string;
  total_deliveries: number;
  rating: number;
  notes: string;
  employee_id?: string;
  department?: string;
  position?: string;
  role?: string;
  region?: string;
  created_at?: string;
  updated_at?: string;
}

const REGIONS = [
  { id: 'mandalay', name: '曼德勒', prefix: 'MDY' },
  { id: 'maymyo', name: '彬乌伦', prefix: 'POL' },
  { id: 'yangon', name: '仰光', prefix: 'YGN' },
  { id: 'naypyidaw', name: '内比都', prefix: 'NPW' },
  { id: 'taunggyi', name: '东枝', prefix: 'TGI' },
  { id: 'lashio', name: '腊戌', prefix: 'LSO' },
  { id: 'muse', name: '木姐', prefix: 'MUSE' }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return '#27ae60';
    case 'inactive': return '#f39c12';
    case 'suspended': return '#e74c3c';
    default: return '#95a5a6';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return '活跃';
    case 'inactive': return '非活跃';
    case 'suspended': return '已暂停';
    default: return status;
  }
};

const getUserTypeText = (type: string) => {
  switch (type) {
    case 'customer': return 'Member';
    case 'courier': return 'Courier';
    case 'admin': return 'Admin';
    default: return type;
  }
};

const getUserTypeColor = (type: string) => {
  switch (type) {
    case 'customer': return '#3498db';
    case 'courier': return '#9b59b6';
    case 'admin': return '#e67e22';
    default: return '#95a5a6';
  }
};

const getVehicleIcon = (type: string) => {
  switch (type) {
    case 'motorcycle': return '🏍️';
    case 'car': return '🚗';
    case 'bicycle': return '🚲';
    case 'truck': return '🚚';
    case 'tricycle': return '🛺';
    case 'small_truck': return '🚛';
    default: return '🚚';
  }
};

// 列表行组件 - 用户
const UserRow = ({ user, selectedUsers, handleSelectUser, isMobile, handleEditUser, updateUserStatus, handleDeleteUser }: any) => {
  if (!user) return null;
  
  const isSelected = selectedUsers.has(user.id);
  
  return (
    <div style={{ paddingBottom: '15px', boxSizing: 'border-box' }}>
      <div 
        key={user.id} 
        style={{
          background: isSelected ? 'rgba(52, 152, 219, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: isMobile ? '20px' : '28px',
          border: isSelected ? '2px solid #3498db' : '1px solid rgba(255, 255, 255, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          backdropFilter: 'blur(12px)',
          boxShadow: isSelected ? '0 12px 30px rgba(52, 152, 219, 0.25)' : '0 6px 12px rgba(0, 0, 0, 0.15)',
          cursor: 'pointer',
          boxSizing: 'border-box'
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).parentElement?.tagName !== 'BUTTON') {
            handleSelectUser(user.id);
          }
        }}
      >
        {/* Checkbox Badge */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            handleSelectUser(user.id);
          }}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
            background: isSelected ? '#3498db' : 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
        >
          {isSelected && <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>✓</span>}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '15px',
          paddingRight: '40px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>
                {user.name}
              </h3>
              <span style={{ 
                background: 'rgba(255,255,255,0.1)', 
                padding: '2px 8px', 
                borderRadius: '6px', 
                fontSize: '0.75rem', 
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'monospace'
              }}>
                {user.id}
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.85rem' }}>
              📅 注册: {user.registration_date} | 🔑 最后登录: {user.last_login}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {user.register_region && (
              <div style={{
                background: 'rgba(52, 152, 219, 0.2)',
                color: '#3498db',
                padding: '5px 15px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                border: '1px solid rgba(52, 152, 219, 0.3)'
              }}>
                📍 {REGIONS.find(r => r.id === user.register_region)?.name || user.register_region}
              </div>
            )}
            <div style={{
              background: getUserTypeColor(user.user_type),
              color: 'white',
              padding: '5px 15px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}>
              {getUserTypeText(user.user_type)}
            </div>
            <div style={{
              background: getStatusColor(user.status),
              color: 'white',
              padding: '5px 15px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}>
              {getStatusText(user.status)}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
          background: 'rgba(0,0,0,0.15)',
          padding: '20px',
          borderRadius: '15px'
        }}>
          <div>
            <h4 style={{ color: '#3498db', margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>📞 联系信息</h4>
            <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>电话:</span>
              <span style={{ fontWeight: 600 }}>{user.phone}</span>
            </p>
            <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>邮箱:</span>
              <span style={{ opacity: 0.9 }}>{user.email || '未绑定'}</span>
            </p>
            <p style={{ color: 'white', margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>地址:</span>
              <span style={{ opacity: 0.8, lineHeight: '1.4' }}>{user.address || '未填写'}</span>
            </p>
          </div>
          <div>
            <h4 style={{ color: '#f1c40f', margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>📊 业务统计</h4>
            <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>订单总数:</span>
              <span style={{ fontWeight: 700, color: '#3498db' }}>{user.total_orders || 0}</span>
            </p>
            <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>累计消费:</span>
              <span style={{ fontWeight: 700, color: '#2ecc71' }}>{user.total_spent?.toLocaleString() || 0} MMK</span>
            </p>
            <p style={{ color: 'white', margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>综合评分:</span>
              <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>⭐ {user.rating?.toFixed(1) || 5.0}</span>
            </p>
          </div>
          <div>
            <h4 style={{ color: '#e67e22', margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>📝 内部备注</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.9rem', lineHeight: '1.6', fontStyle: user.notes ? 'normal' : 'italic' }}>
              {user.notes || '暂无备注信息'}
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handleEditUser(user)}
            style={{
              background: 'rgba(52, 152, 219, 0.2)',
              color: '#3498db',
              border: '1px solid rgba(52, 152, 219, 0.3)',
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ✏️ 编辑资料
          </button>
          <button
            onClick={() => updateUserStatus(user.id, user.status === 'active' ? 'inactive' : 'active')}
            style={{
              background: user.status === 'active' ? 'rgba(243, 156, 18, 0.2)' : 'rgba(39, 174, 96, 0.2)',
              color: user.status === 'active' ? '#f39c12' : '#2ecc71',
              border: '1px solid ' + (user.status === 'active' ? 'rgba(243, 156, 18, 0.3)' : 'rgba(39, 174, 96, 0.3)'),
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {user.status === 'active' ? '🚫 停用账户' : '✅ 启用账户'}
          </button>
          <button
            onClick={() => updateUserStatus(user.id, 'suspended')}
            style={{
              background: 'rgba(231, 76, 60, 0.15)',
              color: '#e74c3c',
              border: '1px solid rgba(231, 76, 60, 0.25)',
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⚠️ 暂停服务
          </button>
          <button
            onClick={() => handleDeleteUser(user.id)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              border: 'none',
              padding: '10px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.3s ease'
            }}
          >
            🗑️ 删除账户
          </button>
        </div>
      </div>
    </div>
  );
};

// 列表行组件 - 快递员
const CourierRow = ({ courier, isMobile, handleEditCourier, handleCourierStatusChange, handleDeleteCourier }: any) => {
  if (!courier) return null;
  
  return (
    <div style={{ paddingBottom: '20px', boxSizing: 'border-box' }}>
      <div 
        key={courier.id} 
        style={{ 
          background: 'linear-gradient(145deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)', 
          padding: '28px', 
          borderRadius: '24px', 
          border: '1px solid rgba(255, 255, 255, 0.15)', 
          backdropFilter: 'blur(15px)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* 背景光晕装饰 */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '50%',
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.5fr 1fr 1fr', gap: '32px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* 个人信息栏 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '18px', 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.4) 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '2rem',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                {getVehicleIcon(courier.vehicle_type)}
              </div>
              <div>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.5px' }}>{courier.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 700, fontFamily: 'monospace', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                    #{courier.employee_id || '-'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{courier.position || '骑手'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'white', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'rgba(255,255,255,0.1)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>📞</span> 
                <span style={{ fontWeight: 600 }}>{courier.phone}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ background: 'rgba(255,255,255,0.05)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>📧</span> 
                <span>{courier.email || '未设置邮箱'}</span>
              </div>
            </div>
          </div>
          
          {/* 区域与地址 */}
          <div style={{ paddingLeft: isMobile ? 0 : '20px', borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ color: '#60a5fa', fontSize: '1.1rem' }}>📍</span>
              <span style={{ color: '#93c5fd', fontSize: '1.1rem', fontWeight: 700 }}>
                {(() => {
                  const r = REGIONS.find(reg => reg.id === courier.region || reg.prefix === courier.region);
                  return r ? `${r.name} (${r.prefix})` : (courier.region || '-');
                })()}
              </span>
            </div>
            <p style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              {courier.address || '暂无详细地址'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.5)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                📅 入职: {courier.join_date}
              </span>
            </div>
          </div>

          {/* 业务数据 */}
          <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>配送成就</p>
                <p style={{ margin: 0, color: '#f59e0b', fontSize: '1.8rem', fontWeight: 900 }}>{courier.total_deliveries}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>综合评分</p>
                <p style={{ margin: 0, color: '#fbbf24', fontSize: '1.4rem', fontWeight: 900 }}>⭐ {courier.rating?.toFixed(1) || 5.0}</p>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleEditCourier(courier)}
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #3498db', background: 'rgba(52, 152, 219, 0.1)', color: '#3498db', cursor: 'pointer', fontWeight: 600 }}
            >编辑资料</button>
            <button
              onClick={() => handleCourierStatusChange(courier.id, courier.status === 'active' ? 'inactive' : 'active')}
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e67e22', background: 'rgba(230, 126, 34, 0.1)', color: '#e67e22', cursor: 'pointer', fontWeight: 600 }}
            >{courier.status === 'active' ? '停用账号' : '启用账号'}</button>
            <button
              onClick={() => handleDeleteCourier(courier.id)}
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #e74c3c', background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', cursor: 'pointer', fontWeight: 600 }}
            >永久删除</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 列表行组件 - 合伙店铺
const StoreRow = ({ store, isMobile }: any) => {
  if (!store) return null;
  
  return (
    <div style={{ paddingBottom: '15px', boxSizing: 'border-box' }}>
      <div 
        key={store.id} 
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
            🏪 {store.store_name}
          </h3>
          <span style={{ 
            background: store.status === 'active' ? 'rgba(39, 174, 96, 0.9)' : 'rgba(149, 165, 166, 0.9)', 
            color: 'white', 
            padding: '6px 12px', 
            borderRadius: '20px', 
            fontSize: '0.85rem',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {store.status === 'active' ? '营业中' : '休息'}
          </span>
        </div>
        
        <div style={{ color: 'white', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem' }}>📞</span>
            <span style={{ fontWeight: 500 }}>{store.contact_phone || '无电话'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem' }}>📍</span>
            <span style={{ lineHeight: '1.5', opacity: 0.9 }}>{store.address || '无地址'}</span>
          </div>
          {store.store_code && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ opacity: 0.7 }}>代码:</span>
              <span style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', letterSpacing: '1px' }}>{store.store_code}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'customer_list' | 'admin_list' | 'partner_store' | 'courier_management'>('customer_list');
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerStores, setPartnerStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // 快递员管理状态
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierLoading, setCourierLoading] = useState(true);
  const [courierSubTab, setCourierSubTab] = useState<'list' | 'create'>('list');
  const [courierSearchTerm, setCourierSearchTerm] = useState('');
  const [courierStatusFilter, setCourierStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [importing, setImporting] = useState(false);
  const [courierForm, setCourierForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicle_type: 'motorcycle',
    license_number: '',
    status: 'active',
    notes: '',
    employee_id: '',
    department: '',
    position: '',
    role: 'operator' as 'admin' | 'manager' | 'operator' | 'finance',
    region: 'yangon'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  
  // 批量操作状态
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // 批量选择处理
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // 批量删除处理
  const handleBatchDelete = async () => {
    if (selectedUsers.size === 0) return;
    
    if (!window.confirm(`确定要删除选中的 ${selectedUsers.size} 个用户吗？此操作不可恢复！`)) return;

    try {
      setIsBatchDeleting(true);
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', Array.from(selectedUsers));

      if (error) {
        console.error('批量删除失败:', error);
        window.alert('批量删除失败，请重试');
      } else {
        await loadUsers();
        setSelectedUsers(new Set());
        window.alert('批量删除成功');
      }
    } catch (error) {
      console.error('批量删除异常:', error);
      window.alert('操作出错');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    password: '123456',  // 默认密码
    user_type: 'customer' as 'customer' | 'courier' | 'admin',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    register_region: 'mandalay',
    notes: ''
  });

  // 过滤用户
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.phone?.includes(searchTerm) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase());
                           
      let matchesType = true;
      if (activeTab === 'customer_list') {
        matchesType = user.user_type === 'customer';
      } else if (activeTab === 'admin_list') {
        matchesType = user.user_type === 'admin';
      }
      
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [users, searchTerm, activeTab, filterStatus]);

  // 加载用户数据
  useEffect(() => {
    loadUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    try {
      setLoading(true);
      // 1. 获取普通用户（客户）
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;

      // 2. 获取系统管理员账号
      const adminAccounts = await adminAccountService.getAllAccounts();
      const adminUsers = adminAccounts
        .filter(acc => acc.role === 'admin')
        .map(acc => ({
          id: acc.id || `ADM-${acc.employee_id}`,
          name: acc.employee_name || acc.username,
          phone: acc.phone,
          email: acc.email,
          address: acc.address || '',
          user_type: 'admin' as const,
          status: acc.status,
          registration_date: acc.created_at ? new Date(acc.created_at).toLocaleDateString('zh-CN') : '未知',
          last_login: acc.last_login ? new Date(acc.last_login).toLocaleString('zh-CN') : '从未登录',
          total_orders: 0,
          total_spent: 0,
          rating: 0,
          notes: acc.notes,
          created_at: acc.created_at
        }));

      const allUsers = [...(usersData || []), ...adminUsers];
      const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `USR${String(Date.now()).slice(-6)}`;
    const newUser: User = {
      id: newId,
      ...userForm,
      email: userForm.email.trim() || '',
      registration_date: new Date().toLocaleDateString('zh-CN'),
      last_login: '从未登录',
      total_orders: 0,
      total_spent: 0,
      rating: 0,
      register_region: userForm.register_region
    };

    try {
      const { error } = await supabase.from('users').insert([newUser]);
      if (error) {
        window.alert(`创建用户失败: ${error.message}`);
      } else {
        await loadUsers();
        window.alert('用户创建成功！');
        setShowAddUserForm(false);
      }
    } catch (error) {
      window.alert('创建用户异常');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
      password: '',
      user_type: user.user_type || 'customer',
      status: user.status || 'active',
      register_region: user.register_region || 'mandalay',
      notes: user.notes || ''
    });
    setShowAddUserForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updateData: any = { ...userForm };
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    }

    try {
      const { error } = await supabase.from('users').update(updateData).eq('id', editingUser.id);
      if (error) {
        window.alert('更新用户失败');
      } else {
        await loadUsers();
        window.alert('用户更新成功！');
        setShowAddUserForm(false);
        setEditingUser(null);
      }
    } catch (error) {
      window.alert('更新用户异常');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('确定要删除这个用户吗？')) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (!error) await loadUsers();
    } catch (error) {
      console.error('删除用户异常');
    }
  };

  const updateUserStatus = async (userId: string, newStatus: any) => {
    try {
      const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
      if (!error) await loadUsers();
    } catch (error) {
      console.error('更新状态异常');
    }
  };

  const loadPartnerStores = async () => {
    try {
      setLoadingStores(true);
      const data = await deliveryStoreService.getAllStores();
      setPartnerStores(data || []);
    } catch (error) {
      setPartnerStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const loadCouriers = async () => {
    try {
      setCourierLoading(true);
      const accounts = await adminAccountService.getAllAccounts();
      const riderAccounts = accounts.filter(acc => acc.position === '骑手' || acc.position === '骑手队长');
      const { data: realTimeData } = await supabase.from('couriers').select('*');

      const combinedCouriers: Courier[] = riderAccounts.map(acc => {
        const rtInfo = realTimeData?.find(c => c.phone === acc.phone || c.employee_id === acc.employee_id);
        return {
          id: acc.id || '',
          name: acc.employee_name,
          phone: acc.phone,
          email: acc.email,
          address: acc.address || '',
          vehicle_type: rtInfo?.vehicle_type || (acc.position === '骑手队长' ? 'car' : 'motorcycle'),
          license_number: rtInfo?.license_number || '',
          status: acc.status,
          join_date: acc.hire_date || (acc.created_at ? new Date(acc.created_at).toLocaleDateString('zh-CN') : '未知'),
          last_active: rtInfo?.last_active || '从未上线',
          total_deliveries: rtInfo?.total_deliveries || 0,
          rating: rtInfo?.rating || 5.0,
          notes: acc.notes || '',
          employee_id: acc.employee_id,
          department: acc.department,
          position: acc.position,
          role: acc.role,
          region: acc.region,
          created_at: acc.created_at,
          updated_at: acc.updated_at
        };
      });
      setCouriers(combinedCouriers);
    } catch (error) {
      setCouriers([]);
    } finally {
      setCourierLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'courier_management') loadCouriers();
    else if (activeTab === 'partner_store') loadPartnerStores();
    else loadUsers();
  }, [activeTab]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', padding: isMobile ? '10px' : '40px', color: 'white', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 800, margin: 0, letterSpacing: '-1px' }}>用户管理</h1>
            <p style={{ opacity: 0.7, fontSize: '1.1rem', marginTop: '5px' }}>管理客户、快递员和管理员账户</p>
          </div>
          <button onClick={() => navigate('/admin/dashboard')} style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem', backdropFilter: 'blur(10px)', transition: 'all 0.3s ease' }}>← 返回管理后台</button>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
          {['customer_list', 'admin_list', 'partner_store', 'courier_management'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: activeTab === tab ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)', color: 'white', cursor: 'pointer', fontWeight: activeTab === tab ? '600' : '400', transition: 'all 0.3s ease' }}>
              {tab === 'customer_list' ? '客户列表' : tab === 'admin_list' ? '管理员列表' : tab === 'partner_store' ? '合伙店铺' : '快递员管理'}
            </button>
          ))}
        </div>

        {(activeTab === 'customer_list' || activeTab === 'admin_list') && !showAddUserForm && (
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', borderRadius: '15px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(52, 152, 219, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                <h3 style={{ color: '#3498db', margin: '0 0 5px 0' }}>{users.filter(u => u.user_type === 'customer').length}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>客户总数</p>
              </div>
              <div style={{ background: 'rgba(155, 89, 182, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                <h3 style={{ color: '#9b59b6', margin: '0 0 5px 0' }}>{couriers.length}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>快递员总数</p>
              </div>
              <div style={{ background: 'rgba(39, 174, 96, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                <h3 style={{ color: '#27ae60', margin: '0 0 5px 0' }}>{users.filter(u => u.status === 'active').length}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>活跃用户</p>
              </div>
              <div style={{ background: 'rgba(230, 126, 34, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                <h3 style={{ color: '#e67e22', margin: '0 0 5px 0' }}>{users.reduce((s, u) => s + (u.total_orders || 0), 0)}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>总订单数</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '24px', alignItems: 'center' }}>
              <input type="text" placeholder="🔍 搜索客户姓名、电话..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ flex: 1, padding: '14px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)', color: 'white' }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '14px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(0, 0, 0, 0.4)', color: 'white' }}>
                <option value="all">📊 所有状态</option>
                <option value="active">✅ 活跃</option>
                <option value="inactive">💤 非活跃</option>
                <option value="suspended">🚫 已暂停</option>
              </select>
              <button onClick={() => setShowAddUserForm(true)} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '14px 24px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>＋ 新增用户</button>
              <button onClick={handleSelectAll} style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '14px 24px', borderRadius: '12px', cursor: 'pointer' }}>{selectedUsers.size === filteredUsers.length ? '取消全选' : '▢ 全选'}</button>
            </div>

            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr' }}>
              {filteredUsers.map((user, index) => (
                <UserRow key={user.id} user={user} selectedUsers={selectedUsers} handleSelectUser={handleSelectUser} isMobile={isMobile} handleEditUser={handleEditUser} updateUserStatus={updateUserStatus} handleDeleteUser={handleDeleteUser} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'partner_store' && (
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', borderRadius: '15px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr' }}>
              {partnerStores.map(store => (
                <StoreRow key={store.id} store={store} isMobile={isMobile} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'courier_management' && (
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', borderRadius: '15px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr' }}>
              {couriers.map(courier => (
                <CourierRow key={courier.id} courier={courier} isMobile={isMobile} handleEditCourier={loadCouriers} handleCourierStatusChange={updateUserStatus} handleDeleteCourier={handleDeleteUser} />
              ))}
            </div>
          </div>
        )}

        {showAddUserForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: '#1e3c72', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '600px' }}>
              <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '30px' }}>{editingUser ? '编辑用户' : '新增用户'}</h2>
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                  <input type="text" placeholder="姓名" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: 'none' }} />
                  <input type="tel" placeholder="电话" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: 'none' }} />
                  <input type="email" placeholder="邮箱" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: 'none' }} />
                  <input type="password" placeholder="密码" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: 'none' }} />
                  <textarea placeholder="地址" value={userForm.address} onChange={e => setUserForm({...userForm, address: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: 'none', minHeight: '100px' }} />
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold' }}>确定</button>
                  <button type="button" onClick={() => setShowAddUserForm(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#e74c3c', color: 'white', fontWeight: 'bold' }}>取消</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
