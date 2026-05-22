import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SkeletonTable } from '../components/SkeletonLoader';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  user_type: 'customer' | 'courier' | 'admin' | 'merchant' | 'vip';
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

interface RechargeRequest {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  proof_url: string;
  notes?: string;
  created_at: string;
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
  if (user.user_type === 'merchant') return 'MERCHANTS';
  if (user.user_type === 'courier') return 'Courier';
  if (user.user_type === 'admin') return 'Admin';
  
  // 对于客户类型进行细分
  if (user.balance > 0 || user.user_type === 'vip') {
    return 'VIP';
  }
  return 'MEMBER';
};

const getUserTypeColor = (user: any) => {
  if (user.user_type === 'admin') return '#e67e22';
  if (user.user_type === 'courier') return '#9b59b6';
  if (user.user_type === 'merchant') return '#3498db';
  
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
const UserRow = ({ 
  user, 
  selectedUsers, 
  handleSelectUser, 
  isMobile, 
  handleEditUser, 
  updateUserStatus, 
  handleDeleteUser, 
  handleOpenRecharge, 
  pendingRecharge,
  handleApproveRecharge,
  handleRejectRecharge 
}: any) => {
  if (!user) return null;
  
  const isSelected = selectedUsers.has(user.id);
  const hasPendingRecharge = !!pendingRecharge;
  
  return (
    <div style={{ paddingBottom: '15px', boxSizing: 'border-box' }}>
      <div 
        key={user.id} 
        style={{
          background: isSelected ? 'rgba(52, 152, 219, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: isMobile ? '20px' : '28px',
          border: hasPendingRecharge ? '2px solid #e74c3c' : (isSelected ? '2px solid #3498db' : '1px solid rgba(255, 255, 255, 0.12)'), // 🚀 充值中变红框
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          backdropFilter: 'blur(12px)',
          boxShadow: hasPendingRecharge ? '0 0 20px rgba(231, 76, 60, 0.4)' : (isSelected ? '0 12px 30px rgba(52, 152, 219, 0.25)' : '0 6px 12px rgba(0, 0, 0, 0.15)'), // 🚀 充值中发红光
          cursor: 'pointer',
          boxSizing: 'border-box',
          animation: hasPendingRecharge ? 'pulse-border 2s infinite' : 'none' // 🚀 充值中呼吸效果
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).parentElement?.tagName !== 'BUTTON') {
            handleSelectUser(user.id);
          }
        }}
      >
        {/* 🚀 新增：充值警报器 */}
        {hasPendingRecharge && (
          <div style={{
            position: 'absolute',
            top: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            color: 'white',
            padding: '6px 20px',
            borderRadius: '30px',
            fontSize: '0.9rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 25px rgba(231, 76, 60, 0.8)',
            zIndex: 100,
            border: '2px solid rgba(255,255,255,0.3)',
            animation: 'pulse-scale 1.5s infinite'
          }}>
            <span style={{ fontSize: '1.2rem', animation: 'blink 0.6s infinite alternate' }}>🚨</span>
            <span style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>客户正在充值</span>
          </div>
        )}

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
          {/* 🚀 新增：快捷处理充值申请按钮 */}
          {pendingRecharge && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => handleApproveRecharge(pendingRecharge)}
                style={{
                  background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
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
                  boxShadow: '0 4px 12px rgba(46, 204, 113, 0.4)',
                  animation: 'blink 1s infinite alternate'
                }}
              >
                ✅ 同意充值 ({pendingRecharge.amount.toLocaleString()} MMK)
              </button>
              
              {/* 查看凭证小图 */}
              <a href={pendingRecharge.proof_url} target="_blank" rel="noreferrer">
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #2ecc71',
                  background: '#000'
                }}>
                  <img src={pendingRecharge.proof_url} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </a>

              <button
                onClick={() => handleRejectRecharge(pendingRecharge)}
                style={{
                  background: 'rgba(231, 76, 60, 0.2)',
                  color: '#e74c3c',
                  border: '1px solid rgba(231, 76, 60, 0.3)',
                  padding: '10px 15px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                拒绝
              </button>
            </div>
          )}

          {/* 🚀 仅非管理员账号显示 Credit 充值按钮 */}
          {user.user_type !== 'admin' && (
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
          )}

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
            onClick={() => updateUserStatus(user, user.status === 'active' ? 'inactive' : 'active')}
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
            onClick={() => updateUserStatus(user, 'suspended')}
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
            type="button"
            onClick={() => handleDeleteUser(user)}
            style={{
              marginLeft: 'auto',
              background: 'rgba(231, 76, 60, 0.15)',
              color: '#fecaca',
              border: '1px solid rgba(231, 76, 60, 0.45)',
              padding: '10px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '700',
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

// 列表行组件 - 商家店铺
const StoreRow = ({ store, isMobile, pendingRecharge }: any) => {
  if (!store) return null;
  
  const hasPendingRecharge = !!pendingRecharge;
  
  return (
    <div style={{ paddingBottom: '20px', boxSizing: 'border-box' }}>
      <div 
        key={store.id} 
        style={{
          background: 'linear-gradient(145deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
          borderRadius: '24px',
          padding: '28px',
          border: hasPendingRecharge ? '2px solid #e74c3c' : '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(15px)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: hasPendingRecharge ? '0 0 20px rgba(231, 76, 60, 0.4)' : '0 12px 36px rgba(0,0,0,0.2)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          animation: hasPendingRecharge ? 'pulse-border 2s infinite' : 'none'
        }}
        onMouseEnter={(e) => {
          if (!hasPendingRecharge) {
            e.currentTarget.style.transform = 'translateY(-5px) scale(1.01)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!hasPendingRecharge) {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,0.2)';
          }
        }}
      >
        {/* 🚀 新增：充值警报器 */}
        {hasPendingRecharge && (
          <div style={{
            position: 'absolute',
            top: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            color: 'white',
            padding: '6px 20px',
            borderRadius: '30px',
            fontSize: '0.9rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 25px rgba(231, 76, 60, 0.8)',
            zIndex: 100,
            border: '2px solid rgba(255,255,255,0.3)',
            animation: 'pulse-scale 1.5s infinite'
          }}>
            <span style={{ fontSize: '1.2rem', animation: 'blink 0.6s infinite alternate' }}>🚨</span>
            <span style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>商户正在充值</span>
          </div>
        )}

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
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();

  // 🚀 新增：注入动画样式
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes blink {
        0%, 100% { opacity: 1; transform: scale(1.2); }
        50% { opacity: 0.5; transform: scale(1); }
      }
      @keyframes pulse-border {
        0% { border-color: rgba(231, 76, 60, 0.5); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
        70% { border-color: rgba(231, 76, 60, 1); box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
        100% { border-color: rgba(231, 76, 60, 0.5); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const [activeTab, setActiveTab] = useState<'customer_list' | 'admin_list' | 'merchant_store' | 'courier_management' | 'recharge_requests'>('customer_list');
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);

  const [loadingRequests, setLoadingRequests] = useState(false);

  // 🚀 新增：通知和警报逻辑
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevPendingCountRef = useRef<number>(0);
  const lastVoiceBroadcastRef = useRef<number>(0); // 🚀 新增：记录上次语音播报时间
  const [hasNewRequest, setHasNewRequest] = useState(false);
  const activeTabRef = useRef(activeTab);

  // 同步 activeTab 到 ref
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // 🚀 新增：语音播报函数
  const speakNotification = (text: string) => {
    if ('speechSynthesis' in window) {
      // 停止当前的，防止堆叠
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // 修复 Chrome 兼容性问题：有时需要再次触发
      window.speechSynthesis.speak(utterance);
      lastVoiceBroadcastRef.current = Date.now();
      console.log('🗣️ 正在播报:', text);
    }
  };

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
  const [pendingRechargeRequests, setPendingRechargeRequests] = useState<Record<string, RechargeRequest>>({}); // 🚀 存储每个用户的待处理充值申请详情
  const [loading, setLoading] = useState(true);
  const [merchantStores, setMerchantStores] = useState<any[]>([]);
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
  useEffect(() => {
    const q = searchParams.get('q');
    const tab = searchParams.get('tab');
    if (q) setSearchTerm(q);
    if (
      tab &&
      ['customer_list', 'admin_list', 'merchant_store', 'courier_management', 'recharge_requests'].includes(tab)
    ) {
      setActiveTab(
        tab as 'customer_list' | 'admin_list' | 'merchant_store' | 'courier_management' | 'recharge_requests'
      );
    }
  }, [searchParams]);
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

  // 🚀 新增：统计数据状态
  const [summaryStats, setSummaryStats] = useState({
    // 客户统计
    totalCustomers: 0,
    vipCustomers: 0,
    activeCustomers: 0,
    totalSpent: 0,
    // 管理员统计
    totalAdmins: 0,
    activeAdmins: 0,
    superAdmins: 0,
    recentLogins: 0,
    // 快递员统计
    totalCouriers: 0,
    activeCouriers: 0,
    totalDeliveries: 0,
    avgRating: 0,
    // 店铺统计
    totalStores: 0,
    activeStores: 0,
    totalCOD: 0,
    // 全局统计
    totalOrders: 0
  });

  const loadSummaryStats = async () => {
    try {
      console.log('📊 正在加载统计数据...');
      
      // 1. 获取客户统计 - 分开获取以确定哪个失败
      const { data: customers, error: custError } = await supabase
        .from('users')
        .select('status, balance, total_spent, user_type');
      
      if (custError) {
        console.error('❌ 获取客户表失败 (users):', custError.message, custError.details);
        // 如果是 400 错误，说明表结构不对
        if (custError.code === '42703' || custError.message.includes('column')) {
          console.warn('⚠️ 数据库缺少必要字段 (balance 或 total_spent)，请运行 fix-users-table-columns.sql');
        }
      }
      
      // 2. 获取管理员统计
      const { data: admins, error: adminError } = await supabase
        .from('admin_accounts')
        .select('status, role, last_login, position');
      
      if (adminError) console.error('❌ 获取管理员表失败:', adminError.message);
      
      // 3. 获取快递员统计
      const { data: couriersData, error: courierError } = await supabase
        .from('couriers')
        .select('status, total_deliveries, rating');
      
      if (courierError) console.error('❌ 获取快递员表失败:', courierError.message);
      
      // 4. 获取店铺统计
      const { data: stores, error: storeError } = await supabase
        .from('delivery_stores')
        .select('status');
      
      if (storeError) console.error('❌ 获取店铺表失败:', storeError.message);
      
      // 5. 获取订单总数
      const { count: orderCount, error: orderError } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true });
      
      if (orderError) console.error('❌ 获取订单表失败:', orderError.message);

      const stats = {
        totalCustomers: customers?.filter(u => u.user_type === 'customer' || u.user_type === 'vip').length || 0,
        vipCustomers: customers?.filter(u => (u.user_type === 'customer' || u.user_type === 'vip') && ((u.balance || 0) > 0 || u.user_type === 'vip')).length || 0,
        activeCustomers: customers?.filter(u => (u.user_type === 'customer' || u.user_type === 'vip') && u.status === 'active').length || 0,
        totalSpent: customers?.reduce((sum, u) => sum + (Number(u.total_spent) || 0), 0) || 0,
        
        totalAdmins: admins?.length || 0,
        activeAdmins: admins?.filter(a => a.status === 'active').length || 0,
        superAdmins: admins?.filter(a => a.role === 'admin').length || 0,
        recentLogins: admins?.filter(a => a.last_login && new Date(a.last_login).toDateString() === new Date().toDateString()).length || 0,
        
        totalCouriers: admins?.filter(a => a.position === '骑手' || a.position === '骑手队长').length || 0,
        activeCouriers: admins?.filter(a => (a.position === '骑手' || a.position === '骑手队长') && a.status === 'active').length || 0,
        totalDeliveries: couriersData?.reduce((sum, c) => sum + (c.total_deliveries || 0), 0) || 0,
        avgRating: couriersData?.length ? (couriersData.reduce((sum, c) => sum + (c.rating || 0), 0) / couriersData.length) : 5.0,
        
        totalStores: stores?.length || 0,
        activeStores: stores?.filter(s => s.status === 'active').length || 0,
        totalCOD: 0, 
        
        totalOrders: orderCount || 0
      };

      setSummaryStats(stats);
    } catch (err) {
      console.error('❌ 加载统计数据异常:', err);
    }
  };

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

  // 批量删除：按用户类型分别删除 users 或 admin_accounts
  const handleBatchDelete = async () => {
    if (selectedUsers.size === 0) return;

    if (!window.confirm(`确定要删除选中的 ${selectedUsers.size} 个用户吗？此操作不可恢复！`)) return;

    try {
      setIsBatchDeleting(true);
      const idList = Array.from(selectedUsers);
      const targets = idList.map((id) => users.find((u) => u.id === id)).filter((u): u is User => Boolean(u));

      let failures = 0;
      const errors: string[] = [];

      for (const u of targets) {
        if (u.user_type === 'admin') {
          const del =
            String(u.id).startsWith('ADM-') && String(u.id).length > 4
              ? await supabase.from('admin_accounts').delete().eq('employee_id', String(u.id).slice(4)).select('id')
              : await supabase.from('admin_accounts').delete().eq('id', u.id).select('id');
          if (del.error) {
            failures++;
            errors.push(`${u.name}: ${del.error.message}`);
          } else if (!del.data?.length) {
            failures++;
            errors.push(`${u.name}: 未找到后台账号记录`);
          }
        } else {
          await supabase.from('recharge_requests').delete().eq('user_id', u.id);
          const { error, data } = await supabase.from('users').delete().eq('id', u.id).select('id');
          if (error) {
            failures++;
            errors.push(`${u.name}: ${error.message}`);
          } else if (!data?.length) {
            failures++;
            errors.push(`${u.name}: 未找到 users 记录`);
          }
        }
      }

      await loadUsers();
      setSelectedUsers(new Set());

      if (failures > 0) {
        window.alert(
          `完成部分删除。失败 ${failures} 条（可能受数据库外键或其它关联限制）。\n\n` + errors.slice(0, 5).join('\n'),
        );
      } else {
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
    user_type: 'customer' as 'customer' | 'courier' | 'admin' | 'merchant' | 'vip',
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

  // 🚀 核心优化：增加自动轮询，实时检测充值申请
  useEffect(() => {
    // 首次加载
    loadUsers();
    
    // 计数器用于 1 分钟自动刷新
    let refreshCounter = 0;

    // 每 10 秒轮询一次充值申请
    const timer = setInterval(() => {
      console.log('🔄 正在自动检测充值状态...');
      refreshCounter += 10;

      // 每 60 秒强制刷新一次列表
      if (refreshCounter >= 60) {
        console.log('⏱️ 1分钟自动刷新列表...');
        refreshCounter = 0;
        loadUsers(); // 刷新用户列表和统计
        if (activeTabRef.current === 'recharge_requests') {
          loadRechargeRequests(); // 刷新充值申请列表
        }
      }
      
      supabase
        .from('recharge_requests')
        .select('*')
        .eq('status', 'pending')
        .then(({ data }) => {
          if (data) {
            const requestsMap: Record<string, RechargeRequest> = {};
            data.forEach(req => {
              requestsMap[req.user_id] = req;
            });
            setPendingRechargeRequests(requestsMap);

            // 🚀 触发报警音：如果当前待审核数量 > 之前记录的数量
            const currentCount = data.length;
            if (currentCount > prevPendingCountRef.current) {
              console.log('🚨 检测到新充值申请:', currentCount);
              alertAudioRef.current?.play().catch(e => console.log('音频播放失败:', e));
              
              // 立即进行一次语音播报
              speakNotification('你有新的充值 请审核');
              setHasNewRequest(true);
              
              // 自动刷新当前列表（如果在充值页面）
              if (activeTabRef.current === 'recharge_requests') {
                loadRechargeRequests();
              }
            } else if (currentCount > 0) {
              // 🚀 周期性语音提醒：如果仍有待处理申请，每 30 秒播报一次
              const now = Date.now();
              if (now - lastVoiceBroadcastRef.current >= 30000) {
                console.log('📢 30秒周期性播报提醒...');
                speakNotification('你有新的充值 请审核');
              }
            } else if (currentCount === 0) {
              setHasNewRequest(false);
            }
            prevPendingCountRef.current = currentCount;
          }
        });
    }, 10000);

    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    try {
      setLoading(true);
      loadSummaryStats(); // 🚀 同时刷新统计
      
      // 1. 获取普通用户（客户）
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) throw usersError;
      
      // 🚀 新增：获取所有待审核的充值申请
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('recharge_requests')
        .select('*')
        .eq('status', 'pending');
      
      if (!pendingError && pendingRequests) {
        const requestsMap: Record<string, RechargeRequest> = {};
        pendingRequests.forEach(req => {
          requestsMap[req.user_id] = req;
        });
        setPendingRechargeRequests(requestsMap);
      }

      // 2. 获取所有管理端账号并整合进管理员列表
      const adminAccounts = await adminAccountService.getAllAccounts();
      const adminUsers = adminAccounts
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
          notes: acc.notes || `职位: ${acc.position || '员工'} | 角色: ${acc.role}`,
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
    
    // 🚀 优化：只发送必要的字段
    const newUser = {
      id: newId,
      name: userForm.name,
      phone: userForm.phone,
      email: userForm.email.trim() || '',
      address: userForm.address,
      password: userForm.password || '123456',
      user_type: userForm.user_type,
      status: userForm.status,
      register_region: userForm.register_region,
      notes: userForm.notes,
      registration_date: new Date().toLocaleDateString('zh-CN'),
      last_login: '从未登录',
      total_orders: 0,
      total_spent: 0,
      rating: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('users').insert([newUser]);
      if (error) {
        console.error('❌ 创建用户详细错误:', error.message, error.details, error.hint);
        window.alert(`创建用户失败: ${error.message}`);
      } else {
        await loadUsers();
        window.alert('用户创建成功！');
        setShowAddUserForm(false);
      }
    } catch (error: any) {
      console.error('❌ 创建用户异常:', error);
      window.alert(`创建用户异常: ${error.message || '未知错误'}`);
    }
  };

  const handleEditUser = (user: User) => {
    console.log('🚀 开始编辑用户:', user);
    setEditingUser(user);
    const formData = {
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
      password: '',
      user_type: user.user_type || 'customer',
      status: user.status || 'active',
      register_region: user.register_region || 'mandalay',
      notes: user.notes || ''
    };
    console.log('📋 准备填充表单数据:', formData);
    setUserForm(formData);
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

    if (editingUser.user_type === 'admin') {
      window.alert(
        '当前条目为后台「员工/管理员」账号，数据保存在「账户管理」中。\n\n请前往：控制台 → 系统设置 → 账户管理 进行修改。',
      );
      return;
    }

    // 🚀 优化：清理更新数据，只发送数据库支持且必要的字段
    // 排除前端本地计算的字段 (如 registration_date, last_login, total_orders 等)
    const updateData: any = {
      name: userForm.name,
      phone: userForm.phone,
      email: userForm.email,
      address: userForm.address,
      user_type: userForm.user_type,
      status: userForm.status,
      register_region: userForm.register_region,
      notes: userForm.notes,
      updated_at: new Date().toISOString()
    };

    // 只有在填写了密码时才更新密码
    if (userForm.password && userForm.password.trim() !== '') {
      updateData.password = userForm.password;
    }

    console.log('📡 正在更新用户数据:', updateData);

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id)
        .select();

      if (error) {
        console.error('❌ 更新用户详细错误:', error.message, error.details, error.hint);
        window.alert(`更新用户失败: ${error.message}${error.hint ? '\n提示: ' + error.hint : ''}`);
      } else {
        console.log('✅ 用户更新成功:', data);
        await loadUsers();
        window.alert('用户更新成功！');
        setShowAddUserForm(false);
        setEditingUser(null);
      }
    } catch (error: any) {
      console.error('❌ 更新用户异常:', error);
      window.alert(`更新用户异常: ${error.message || '未知错误'}`);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`确定要删除用户「${user.name}」吗？此操作不可恢复。`)) return;
    try {
      if (user.user_type === 'admin') {
        const del =
          String(user.id).startsWith('ADM-') && String(user.id).length > 4
            ? await supabase.from('admin_accounts').delete().eq('employee_id', String(user.id).slice(4)).select('id')
            : await supabase.from('admin_accounts').delete().eq('id', user.id).select('id');
        if (del.error) {
          window.alert(`删除管理员失败：${del.error.message}${del.error.hint ? '\n提示：' + del.error.hint : ''}`);
          return;
        }
        if (!del.data?.length) {
          window.alert('未删除任何记录：未在「账户管理」中找到对应后台账号。');
          return;
        }
      } else {
        await supabase.from('recharge_requests').delete().eq('user_id', user.id);
        const { error, data } = await supabase.from('users').delete().eq('id', user.id).select('id');
        if (error) {
          window.alert(
            `删除失败：${error.message}${error.details ? '\n' + error.details : ''}${error.hint ? '\n提示：' + error.hint : ''}`,
          );
          return;
        }
        if (!data?.length) {
          window.alert('未删除任何记录：该用户可能已不存在，或数据在非 users 表中。');
          return;
        }
      }
      await loadUsers();
      window.alert('删除成功');
    } catch (error: unknown) {
      console.error('删除用户异常:', error);
      window.alert(error instanceof Error ? error.message : '删除异常');
    }
  };

  const updateUserStatus = async (user: User, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      if (user.user_type === 'admin') {
        const up =
          String(user.id).startsWith('ADM-') && String(user.id).length > 4
            ? await supabase.from('admin_accounts').update({ status: newStatus }).eq('employee_id', String(user.id).slice(4))
            : await supabase.from('admin_accounts').update({ status: newStatus }).eq('id', user.id);
        if (up.error) {
          window.alert('更新状态失败：' + up.error.message);
          return;
        }
      } else {
        const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', user.id);
        if (error) {
          window.alert('更新状态失败：' + error.message);
          return;
        }
      }
      await loadUsers();
    } catch (error) {
      console.error('更新状态异常', error);
      window.alert('更新状态异常');
    }
  };

  const loadMerchantStores = async () => {
    try {
      setLoadingStores(true);
      const data = await deliveryStoreService.getAllStores();
      setMerchantStores(data || []);
    } catch (error) {
      setMerchantStores([]);
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

  const loadRechargeRequests = async () => {
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from('recharge_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRechargeRequests(data || []);
    } catch (error) {
      console.error('加载充值申请失败:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRecharge = async (request: RechargeRequest) => {
    if (!window.confirm(`确定要通过该充值申请吗？\n用户: ${request.user_name}\n金额: ${request.amount.toLocaleString()} MMK`)) return;

    try {
      setLoadingRequests(true);
      
      // 1. 获取当前用户余额
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', request.user_id)
        .single();
      
      if (userError) throw userError;

      const newBalance = (userData.balance || 0) + request.amount;

      // 2. 更新用户余额
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', request.user_id);
      
      if (updateError) throw updateError;

      // 3. 更新申请状态
      const { error: requestError } = await supabase
        .from('recharge_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', request.id);
      
      if (requestError) throw requestError;

      // 4. 记录日志
      await auditLogService.log({
        user_id: 'admin',
        user_name: '管理员',
        action_type: 'update',
        module: 'users',
        target_id: request.user_id,
        target_name: request.user_name,
        action_description: `通过充值申请: ${request.amount} MMK, 新余额: ${newBalance} MMK`
      });

      window.alert('充值已到账！');
      await loadRechargeRequests();
      await loadUsers(); // 🚀 同时也刷新用户列表，更新余额显示和警报消失
    } catch (error: any) {
      console.error('审批失败:', error);
      window.alert(`操作失败: ${error.message}`);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleRejectRecharge = async (request: RechargeRequest) => {
    const reason = window.prompt('请输入拒绝原因:');
    if (reason === null) return;

    try {
      setLoadingRequests(true);
      const { error } = await supabase
        .from('recharge_requests')
        .update({ 
          status: 'rejected', 
          notes: `拒绝原因: ${reason}`,
          updated_at: new Date().toISOString() 
        })
        .eq('id', request.id);
      
      if (error) throw error;

      window.alert('申请已拒绝');
      await loadRechargeRequests();
      await loadUsers(); // 🚀 同时也刷新用户列表
    } catch (error: any) {
      window.alert(`操作失败: ${error.message}`);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'courier_management') loadCouriers();
    else if (activeTab === 'merchant_store') loadMerchantStores();
    else if (activeTab === 'recharge_requests') loadRechargeRequests();
    else loadUsers();
  }, [activeTab]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #0a0f1c 0%, #0f172a 35%, #152f4a 70%, #1a2744 100%)',
        padding: isMobile ? '14px 12px 48px' : '36px 28px 56px',
        color: 'white',
        fontFamily: "'PingFang SC', 'Segoe UI', system-ui, sans-serif",
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 70% 45% at 0% -10%, rgba(59, 130, 246, 0.14), transparent 50%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(16, 185, 129, 0.08), transparent 45%)',
          zIndex: 0,
        }}
      />
      {/* 🚀 新增全局动画样式 */}
      <style>{`
        @keyframes blink {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes pulse-scale {
          0% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.05); }
          100% { transform: translateX(-50%) scale(1); }
        }
        @keyframes pulse-border {
          0% { border-color: rgba(231, 76, 60, 0.4); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
          70% { border-color: rgba(231, 76, 60, 1); box-shadow: 0 0 0 15px rgba(231, 76, 60, 0); }
          100% { border-color: rgba(231, 76, 60, 0.4); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
        }
      `}</style>
      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '36px',
            flexWrap: 'wrap',
            gap: '20px',
            paddingBottom: '24px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(186, 230, 253, 0.85)',
                marginBottom: '10px',
              }}
            >
              ML EXPRESS · ADMIN
            </div>
            <h1
              style={{
                fontSize: isMobile ? '1.85rem' : '2.6rem',
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(100deg, #f8fafc 0%, #93c5fd 50%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              用户管理
            </h1>
            <p style={{ opacity: 0.88, fontSize: '1.05rem', marginTop: '12px', marginBottom: 0, maxWidth: 560, lineHeight: 1.55 }}>
              管理客户、商户、快递员与管理员；删除与状态已按数据源自动同步到「用户表」或「后台账户表」。
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              color: '#e2e8f0',
              border: '1px solid rgba(148, 163, 184, 0.35)',
              padding: '12px 22px',
              borderRadius: '14px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            ← 返回管理后台
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {['customer_list', 'admin_list', 'merchant_store', 'courier_management', 'recharge_requests'].map(tab => {
            const isRechargeTab = tab === 'recharge_requests';
            const hasPending = Object.keys(pendingRechargeRequests).length > 0;

            return (
              <button
                type="button"
                key={tab}
                onClick={() => {
                  setActiveTab(tab as any);
                  if (isRechargeTab) setHasNewRequest(false);
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '14px',
                  border:
                    isRechargeTab && hasPending
                      ? '2px solid #f87171'
                      : activeTab === tab
                        ? '1px solid rgba(96, 165, 250, 0.55)'
                        : '1px solid rgba(148, 163, 184, 0.2)',
                  background:
                    activeTab === tab
                      ? 'linear-gradient(145deg, rgba(37, 99, 235, 0.35) 0%, rgba(30, 41, 59, 0.9) 100%)'
                      : 'rgba(15, 23, 42, 0.55)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? '700' : '500',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow:
                    isRechargeTab && hasPending
                      ? '0 0 20px rgba(248, 113, 113, 0.25)'
                      : activeTab === tab
                        ? '0 8px 24px rgba(0, 0, 0, 0.22)'
                        : 'none',
                  animation: isRechargeTab && hasPending ? 'pulse-border 2s infinite' : 'none',
                }}
              >
                {isRechargeTab && hasPending && (
                  <span style={{ animation: 'blink 0.6s infinite alternate' }}>🚨</span>
                )}
                {tab === 'customer_list' ? '客户列表' : 
                 tab === 'admin_list' ? '管理员列表' : 
                 tab === 'merchant_store' ? 'MERCHANTS' : 
                 tab === 'courier_management' ? '快递员管理' : 
                 '充值申请审核'}
              </button>
            );
          })}
        </div>

        {(activeTab === 'customer_list' || activeTab === 'admin_list' || activeTab === 'merchant_store' || activeTab === 'courier_management') && !showAddUserForm && (
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', borderRadius: '15px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: '30px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '15px' }}>
              {activeTab === 'customer_list' ? (
                <>
                  <div style={{ background: 'rgba(52, 152, 219, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#3498db', margin: '0 0 5px 0' }}>{summaryStats.totalCustomers}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>客户总数</p>
                  </div>
                  <div style={{ background: 'rgba(241, 196, 15, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#f1c40f', margin: '0 0 5px 0' }}>{summaryStats.vipCustomers}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>VIP 会员</p>
                  </div>
                  <div style={{ background: 'rgba(46, 204, 113, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#2ecc71', margin: '0 0 5px 0' }}>{summaryStats.activeCustomers}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>活跃客户</p>
                  </div>
                  <div style={{ background: 'rgba(230, 126, 34, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#e67e22', margin: '0 0 5px 0' }}>{summaryStats.totalOrders}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>总订单数</p>
                  </div>
                </>
              ) : activeTab === 'admin_list' ? (
                <>
                  <div style={{ background: 'rgba(52, 152, 219, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#3498db', margin: '0 0 5px 0' }}>{summaryStats.totalAdmins}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>管理账号总数</p>
                  </div>
                  <div style={{ background: 'rgba(46, 204, 113, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#2ecc71', margin: '0 0 5px 0' }}>{summaryStats.activeAdmins}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>活跃账号</p>
                  </div>
                  <div style={{ background: 'rgba(155, 89, 182, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#9b59b6', margin: '0 0 5px 0' }}>{summaryStats.superAdmins}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>超级管理员</p>
                  </div>
                  <div style={{ background: 'rgba(230, 126, 34, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#e67e22', margin: '0 0 5px 0' }}>{summaryStats.recentLogins}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>今日活跃</p>
                  </div>
                </>
              ) : activeTab === 'merchant_store' ? (
                <>
                  <div style={{ background: 'rgba(52, 152, 219, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#3498db', margin: '0 0 5px 0' }}>{summaryStats.totalStores}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>店铺总数</p>
                  </div>
                  <div style={{ background: 'rgba(46, 204, 113, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#2ecc71', margin: '0 0 5px 0' }}>{summaryStats.activeStores}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>正在营业</p>
                  </div>
                  <div style={{ background: 'rgba(231, 76, 60, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#e74c3c', margin: '0 0 5px 0' }}>{summaryStats.totalStores - summaryStats.activeStores}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>休息中</p>
                  </div>
                  <div style={{ background: 'rgba(230, 126, 34, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#e67e22', margin: '0 0 5px 0' }}>{summaryStats.totalOrders}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>总订单数</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(155, 89, 182, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#9b59b6', margin: '0 0 5px 0' }}>{summaryStats.totalCouriers}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>快递员总数</p>
                  </div>
                  <div style={{ background: 'rgba(46, 204, 113, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#2ecc71', margin: '0 0 5px 0' }}>{summaryStats.activeCouriers}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>活跃骑手</p>
                  </div>
                  <div style={{ background: 'rgba(241, 196, 15, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#f1c40f', margin: '0 0 5px 0' }}>{summaryStats.totalDeliveries}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>配送总数</p>
                  </div>
                  <div style={{ background: 'rgba(52, 152, 219, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ color: '#3498db', margin: '0 0 5px 0' }}>{summaryStats.avgRating.toFixed(1)}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>平均评分</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {(activeTab === 'customer_list' || activeTab === 'admin_list') && !showAddUserForm && (
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', borderRadius: '15px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
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
                  pendingRecharge={pendingRechargeRequests[user.id]}
                  handleApproveRecharge={handleApproveRecharge}
                  handleRejectRecharge={handleRejectRecharge}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recharge_requests' && (
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', borderRadius: '15px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: 'white', margin: 0 }}>💰 充值申请审核</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => {
                    // 🚀 核心：用户必须点击一次来“解锁”浏览器的语音引擎
                    speakNotification('声音提醒功能已开启');
                    window.alert('✅ 声音播报已激活！\n\n系统现在将自动检测充值申请，并每隔 30 秒为您进行语音提醒。请确保您的设备没有开启静音模式。');
                  }} 
                  style={{ 
                    background: 'rgba(46, 204, 113, 0.2)', 
                    color: '#2ecc71', 
                    border: '1px solid rgba(46, 204, 113, 0.4)', 
                    padding: '8px 16px', 
                    borderRadius: '10px', 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 4px 15px rgba(46, 204, 113, 0.2)'
                  }}
                >
                  🔔 开启语音提醒
                </button>
                <button onClick={loadRechargeRequests} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer' }}>🔄 刷新列表</button>
              </div>
            </div>

            {loadingRequests ? (
              <SkeletonTable rows={5} />
            ) : rechargeRequests.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: '20px' }}>📋</span>
                <p style={{ fontSize: '1.2rem' }}>暂无充值申请记录</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {rechargeRequests.map(request => (
                  <div key={request.id} style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '24px',
                    border: request.status === 'pending' ? '2px solid #e74c3c' : '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1.5fr 1.5fr',
                    gap: '20px',
                    alignItems: 'center',
                    boxShadow: request.status === 'pending' ? '0 0 15px rgba(231, 76, 60, 0.2)' : 'none',
                    animation: request.status === 'pending' ? 'pulse-border 2s infinite' : 'none',
                    position: 'relative'
                  }}>
                    {/* 🚀 新增：待审核项的闪烁警报 */}
                    {request.status === 'pending' && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '20px',
                        background: '#e74c3c',
                        color: 'white',
                        padding: '2px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        animation: 'pulse-scale 1.5s infinite',
                        zIndex: 10
                      }}>
                        <span style={{ animation: 'blink 0.6s infinite alternate' }}>🚨</span> 新申请
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.5rem' }}>👤</span>
                        <div>
                          <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{request.user_name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{request.user_id}</div>
                        </div>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                        ⏰ {new Date(request.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '4px' }}>充值金额</div>
                      <div style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: '900' }}>{request.amount.toLocaleString()} MMK</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '8px' }}>汇款凭证</div>
                      <a href={request.proof_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
                        <div style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '2px solid rgba(255,255,255,0.1)',
                          background: '#000'
                        }}>
                          <img src={request.proof_url} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </a>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ 
                        textAlign: 'center',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        background: request.status === 'pending' ? 'rgba(241, 196, 15, 0.2)' : 
                                   request.status === 'completed' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                        color: request.status === 'pending' ? '#f1c40f' : 
                               request.status === 'completed' ? '#2ecc71' : '#e74c3c',
                        border: `1px solid ${request.status === 'pending' ? '#f1c40f44' : 
                                             request.status === 'completed' ? '#2ecc7144' : '#e74c3c44'}`
                      }}>
                        {request.status === 'pending' ? '⏳ 待审核' : 
                         request.status === 'completed' ? '✅ 已通过' : '❌ 已拒绝'}
                      </div>

                      {request.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => handleApproveRecharge(request)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#2ecc71', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>通过</button>
                          <button onClick={() => handleRejectRecharge(request)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#e74c3c', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>拒绝</button>
                        </div>
                      ) : (
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center' }}>
                          {request.notes || '无备注'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'merchant_store' && (
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', borderRadius: '15px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr' }}>
              {merchantStores.map(store => (
                <StoreRow 
                  key={store.id} 
                  store={store} 
                  isMobile={isMobile} 
                  pendingRecharge={pendingRechargeRequests[store.id] || (store.user_id && pendingRechargeRequests[store.user_id])}
                />
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

        {showAddUserForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '30px', fontSize: '1.8rem', fontWeight: 800 }}>{editingUser ? '编辑用户资料' : '新增用户账号'}</h2>
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>姓名</label>
                    <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>电话</label>
                    <input type="tel" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>邮箱</label>
                    <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>登录密码 {editingUser && '(留空表示不修改)'}</label>
                    <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder={editingUser ? '••••••' : '默认密码 123456'} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }} />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>注册领区</label>
                    <select value={userForm.register_region} onChange={e => setUserForm({...userForm, register_region: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }}>
                      {REGIONS.map(region => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>用户类型</label>
                    <select value={userForm.user_type} onChange={e => setUserForm({...userForm, user_type: e.target.value as any})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }}>
                      <option value="customer">👤 普通客户</option>
                      <option value="vip">👑 VIP 会员</option>
                      <option value="merchant">🏪 商家/合伙人</option>
                      <option value="admin">🔐 管理员</option>
                      <option value="courier">🛵 快递员</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>账号状态</label>
                    <select value={userForm.status} onChange={e => setUserForm({...userForm, status: e.target.value as any})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white' }}>
                      <option value="active">✅ 活跃</option>
                      <option value="inactive">💤 非活跃</option>
                      <option value="suspended">🚫 已暂停</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>联系地址</label>
                    <textarea value={userForm.address} onChange={e => setUserForm({...userForm, address: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '80px' }} />
                  </div>
                  <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>备注信息</label>
                    <textarea value={userForm.notes} onChange={e => setUserForm({...userForm, notes: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(0,0,0,0.2)', color: 'white', minHeight: '60px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#27ae60', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>{editingUser ? '保存修改' : '确认创建'}</button>
                  <button type="button" onClick={() => { setShowAddUserForm(false); setEditingUser(null); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>取消</button>
                </div>
              </form>
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
      {/* 🚀 警报提示音 */}
      <audio 
        ref={alertAudioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" 
        preload="auto"
      />
    </div>
  );
};

export default UserManagement;
