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
  balance?: number; // 🚀 新增：账户余额
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

const getUserTypeText = (user: any) => {
  if (user.user_type === 'admin') return 'Admin';
  if (user.user_type === 'courier') return 'Courier';
  if (user.user_type === 'partner') return 'PARTNER';
  
  // 对于客户类型进行细分
  if (user.balance > 0 || user.user_type === 'vip') {
    return 'VIP';
  }
  return 'MEMBER';
};

const getUserTypeColor = (user: any) => {
  if (user.user_type === 'admin') return '#e67e22';
  if (user.user_type === 'courier') return '#9b59b6';
  if (user.user_type === 'partner') return '#3498db';
  
  if (user.balance > 0 || user.user_type === 'vip') {
    return 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)';
  }
  return '#7f8c8d'; // 普通 Member 灰色
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
const UserRow = ({ user, selectedUsers, handleSelectUser, isMobile, handleEditUser, updateUserStatus, handleDeleteUser, handleOpenRecharge }: any) => {
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
              {/* 🚀 新增：余额标签 */}
              <div style={{
                background: 'rgba(46, 204, 113, 0.15)',
                color: '#2ecc71',
                padding: '2px 10px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                border: '1px solid rgba(46, 204, 113, 0.3)',
                marginLeft: '5px'
              }}>
                💰 {user.balance?.toLocaleString() || 0} MMK
              </div>
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
              background: getUserTypeColor(user),
              color: 'white',
              padding: '5px 15px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              boxShadow: (user.balance > 0 || user.user_type === 'vip') ? '0 4px 10px rgba(251, 191, 36, 0.3)' : 'none'
            }}>
              {getUserTypeText(user)}
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
          {/* 🚀 新增：Credit 充值按钮 */}
          <button
            onClick={() => handleOpenRecharge(user)}
            style={{
              background: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(243, 156, 18, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(243, 156, 18, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(243, 156, 18, 0.3)';
            }}
          >
            💰 Credit 充值
          </button>

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

// 列表行组件 - 合伙店铺
const StoreRow = ({ store, isMobile }: any) => {
  if (!store) return null;
  
  return (
    <div style={{ paddingBottom: '20px', boxSizing: 'border-box' }}>
      <div 
        key={store.id} 
        style={{
          background: 'linear-gradient(145deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(15px)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px) scale(1.01)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.2)';
        }}
      >
        {/* 背景装饰光晕 */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          background: store.status === 'active' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(148, 163, 184, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 2fr 1fr', gap: '32px', alignItems: 'center' }}>
          {/* 店铺名称与状态 */}
          <div style={{ borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)', paddingRight: isMobile ? 0 : '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '16px', 
                background: 'rgba(255,255,255,0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>🏪</div>
              <div>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.5px' }}>{store.store_name}</h3>
              </div>
            </div>
            <div style={{ 
              background: store.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)',
              color: store.status === 'active' ? '#4ade80' : '#94a3b8',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: `1px solid ${store.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`
            }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: store.status === 'active' ? '#22c55e' : '#94a3b8',
                boxShadow: store.status === 'active' ? '0 0 10px #22c55e' : 'none'
              }}></span>
              {store.status === 'active' ? '正在营业' : '暂停营业'}
            </div>
          </div>

          {/* 店铺详细信息 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📞</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>联系电话</p>
                <p style={{ margin: 0, color: 'white', fontWeight: 600, fontSize: '1rem' }}>{store.phone || '尚未绑定'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📍</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>详细地址</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', lineHeight: '1.5' }}>{store.address || '尚未填写地址'}</p>
              </div>
            </div>
          </div>

          {/* 店铺代码 */}
          <div style={{ 
            background: 'rgba(0,0,0,0.2)', 
            padding: '20px', 
            borderRadius: '20px', 
            textAlign: 'center', 
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>店铺专属代码</p>
            <span style={{ 
              fontFamily: 'monospace', 
              color: '#60a5fa', 
              fontSize: '1.4rem', 
              fontWeight: 900, 
              letterSpacing: '2px',
              textShadow: '0 0 15px rgba(96, 165, 250, 0.3)'
            }}>{store.store_code || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'customer_list' | 'admin_list' | 'partner_store' | 'courier_management'>('customer_list');

  // 列表行组件 - 快递员 (移动到内部以确保闭包正确)
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

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.5fr 1fr 1.2fr', gap: '32px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditCourier(courier);
                }}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '12px', 
                  border: '1px solid #3498db', 
                  background: 'rgba(52, 152, 219, 0.15)', 
                  color: '#3498db', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.15)'}
              >✏️ 编辑资料</button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCourierStatusChange(courier.id, courier.status === 'active' ? 'inactive' : 'active');
                }}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '12px', 
                  border: '1px solid #e67e22', 
                  background: 'rgba(230, 126, 34, 0.15)', 
                  color: '#e67e22', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(230, 126, 34, 0.3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(230, 126, 34, 0.15)'}
              >{courier.status === 'active' ? '🚫 停用账号' : '✅ 启用账号'}</button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCourier(courier.id);
                }}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '12px', 
                  border: '1px solid #e74c3c', 
                  background: 'rgba(231, 76, 60, 0.15)', 
                  color: '#e74c3c', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(231, 76, 60, 0.15)'}
              >🗑️ 永久删除</button>
            </div>
          </div>
        </div>
      </div>
    );
  };
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
  const [showAddCourierForm, setShowAddCourierForm] = useState(false);
  
  // 🚀 新增：充值功能状态
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeUser, setRechargeUser] = useState<User | null>(null);
  const [isRecharging, setIsRecharging] = useState(false);
  
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

  // 🚀 新增：充值处理逻辑
  const handleOpenRecharge = (user: User) => {
    setRechargeUser(user);
    setShowRechargeModal(true);
  };

  const handleRecharge = async (amount: number) => {
    if (!rechargeUser) return;
    
    if (!window.confirm(`确定要为用户 "${rechargeUser.name}" 充值 ${amount.toLocaleString()} MMK 吗？`)) {
      return;
    }

    try {
      setIsRecharging(true);
      const currentBalance = rechargeUser.balance || 0;
      const newBalance = currentBalance + amount;

      const { error } = await supabase
        .from('users')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', rechargeUser.id);

      if (error) {
        console.error('充值失败:', error);
        window.alert('充值失败，请重试');
      } else {
        // 记录审计日志
        await auditLogService.log({
          user_id: 'admin',
          user_name: '管理员',
          action_type: 'update',
          module: 'users',
          target_id: rechargeUser.id,
          target_name: rechargeUser.name,
          action_description: `充值余额: ${amount} MMK, 新余额: ${newBalance} MMK`
        });

        await loadUsers();
        setShowRechargeModal(false);
        setRechargeUser(null);
        window.alert('充值成功！');
      }
    } catch (error) {
      console.error('充值异常:', error);
      window.alert('操作出错');
    } finally {
      setIsRecharging(false);
    }
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

  const handleEditCourier = (courier: Courier) => {
    console.log('🚀 准备编辑快递员:', courier.name, courier.id);
    if (!courier) return;
    
    try {
      setEditingCourier(courier);
      setCourierForm({
        name: courier.name || '',
        phone: courier.phone || '',
        email: courier.email || '',
        address: courier.address || '',
        vehicle_type: (courier.vehicle_type as any) || 'motorcycle',
        license_number: courier.license_number || '',
        status: (courier.status as any) || 'active',
        notes: courier.notes || '',
        employee_id: courier.employee_id || '',
        department: courier.department || '',
        position: courier.position || '',
        role: (courier.role as any) || 'operator',
        region: courier.region || 'yangon'
      });
      setShowAddCourierForm(true);
      console.log('✅ 快递员编辑模态框已开启');
    } catch (err) {
      console.error('开启编辑模态框失败:', err);
    }
  };

  const handleUpdateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourier) return;

    try {
      // 1. 更新账号系统 (admin_accounts)
      const adminUpdateData = {
        employee_name: courierForm.name,
        phone: courierForm.phone,
        email: courierForm.email,
        address: courierForm.address,
        notes: courierForm.notes,
        employee_id: courierForm.employee_id,
        department: courierForm.department,
        position: courierForm.position,
        role: courierForm.role,
        region: courierForm.region,
        status: courierForm.status
      };

      const { error: adminError } = await supabase
        .from('admin_accounts')
        .update(adminUpdateData)
        .eq('id', editingCourier.id);

      if (adminError) throw adminError;

      // 2. 同步更新快递员表 (couriers)
      const courierUpdateData = {
        name: courierForm.name,
        phone: courierForm.phone,
        email: courierForm.email,
        address: courierForm.address,
        vehicle_type: courierForm.vehicle_type,
        license_number: courierForm.license_number,
        status: courierForm.status,
        notes: courierForm.notes,
        employee_id: courierForm.employee_id,
        region: courierForm.region
      };

      await supabase
        .from('couriers')
        .update(courierUpdateData)
        .eq('employee_id', editingCourier.employee_id);

      window.alert('资料更新成功！');
      setShowAddCourierForm(false);
      setEditingCourier(null);
      await loadCouriers();
    } catch (error: any) {
      console.error('更新快递员资料失败:', error);
      window.alert(`更新失败: ${error.message}`);
    }
  };

  const handleCourierStatusChange = async (courierId: string, newStatus: any) => {
    console.log('🔄 更改快递员状态:', courierId, newStatus);
    if (!courierId) {
      window.alert('错误：无效的快递员ID');
      return;
    }
    try {
      const { error } = await supabase
        .from('admin_accounts')
        .update({ status: newStatus })
        .eq('id', courierId);
      
      if (!error) {
        await loadCouriers();
        window.alert('状态已更新');
      } else {
        console.error('更新状态失败:', error);
        window.alert('状态更新失败: ' + error.message);
      }
    } catch (error) {
      console.error('更新状态异常');
    }
  };

  const handleDeleteCourier = async (courierId: string) => {
    console.log('🗑️ 删除快递员:', courierId);
    if (!courierId) {
      window.alert('错误：无效的快递员ID');
      return;
    }
    if (!window.confirm('确定要永久删除这个快递员账号吗？此操作将移除该账号的所有访问权限！')) return;
    try {
      // 1. 从账号系统删除 (admin_accounts)
      const { error: adminError } = await supabase
        .from('admin_accounts')
        .delete()
        .eq('id', courierId);
      
      // 2. 从快递员表删除 (couriers)
      const { error: courierError } = await supabase
        .from('couriers')
        .delete()
        .eq('id', courierId);

      if (!adminError || !courierError) {
        await loadCouriers();
        window.alert('账号已从权限系统和快递员库中删除');
      } else {
        console.error('删除失败:', adminError || courierError);
        window.alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('删除账号异常');
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
                <UserRow 
                  key={user.id} 
                  user={user} 
                  selectedUsers={selectedUsers} 
                  handleSelectUser={handleSelectUser} 
                  isMobile={isMobile} 
                  handleEditUser={handleEditUser} 
                  updateUserStatus={updateUserStatus} 
                  handleDeleteUser={handleDeleteUser}
                  handleOpenRecharge={handleOpenRecharge} 
                />
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
                <CourierRow 
                  key={courier.id} 
                  courier={courier} 
                  isMobile={isMobile} 
                  handleEditCourier={handleEditCourier} 
                  handleCourierStatusChange={handleCourierStatusChange} 
                  handleDeleteCourier={handleDeleteCourier} 
                />
              ))}
            </div>
          </div>
        )}

        {showAddCourierForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '30px', fontSize: '1.8rem', fontWeight: 800 }}>编辑快递员资料</h2>
              <form onSubmit={handleUpdateCourier}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>姓名</label>
                    <input type="text" value={courierForm.name} onChange={e => setCourierForm({...courierForm, name: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>电话</label>
                    <input type="tel" value={courierForm.phone} onChange={e => setCourierForm({...courierForm, phone: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>员工编号</label>
                    <input type="text" value={courierForm.employee_id} onChange={e => setCourierForm({...courierForm, employee_id: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>车辆类型</label>
                    <select value={courierForm.vehicle_type} onChange={e => setCourierForm({...courierForm, vehicle_type: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }}>
                      <option value="motorcycle">🏍️ 摩托车</option>
                      <option value="car">🚗 汽车</option>
                      <option value="truck">🚚 卡车</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>车牌号</label>
                    <input type="text" value={courierForm.license_number} onChange={e => setCourierForm({...courierForm, license_number: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>注册地址</label>
                    <textarea value={courierForm.address} onChange={e => setCourierForm({...courierForm, address: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '80px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>保存修改</button>
                  <button type="button" onClick={() => setShowAddCourierForm(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>取消</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🚀 新增：充值模态框 */}
        {showRechargeModal && rechargeUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(15px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', 
              padding: '40px', 
              borderRadius: '32px', 
              width: '100%', 
              maxWidth: '500px', 
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowRechargeModal(false)}
                style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>

              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>💳</div>
                <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>账户充值</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '10px' }}>为用户 <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{rechargeUser.name}</span> 选择充值金额</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                {[10000, 50000, 100000, 300000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => handleRecharge(amount)}
                    disabled={isRecharging}
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      fontSize: '1.1rem',
                      fontWeight: '800',
                      cursor: isRecharging ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => {
                      if (!isRecharging) {
                        e.currentTarget.style.background = '#fbbf24';
                        e.currentTarget.style.color = '#1e3c72';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isRecharging) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {amount.toLocaleString()} MMK
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowRechargeModal(false)}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  background: 'rgba(255,255,255,0.1)', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  color: 'white', 
                  fontSize: '1rem', 
                  fontWeight: 'bold', 
                  cursor: 'pointer' 
                }}
              >返回列表</button>

              {isRecharging && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
