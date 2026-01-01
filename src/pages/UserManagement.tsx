import React, { useState, useEffect } from 'react';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { SkeletonTable } from '../components/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { supabase, auditLogService, deliveryStoreService, adminAccountService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';

// 使用 require 并放在所有 import 之后，修复 ESLint 的 import/first 报错
const ReactWindow = require('react-window');

const AutoSizerComponent = AutoSizer as any;

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

// 虚拟列表行组件 - 用户
const UserRow = ({ index, style, ...data }: any) => {
  const { 
    filteredUsers, 
    selectedUsers, 
    handleSelectUser, 
    isMobile, 
    handleEditUser, 
    updateUserStatus, 
    handleDeleteUser 
  } = data;
  
  const user = filteredUsers[index];
  if (!user) return null;
  
  const isSelected = selectedUsers.has(user.id);
  
  return (
    <div style={{ ...style, paddingBottom: '15px', boxSizing: 'border-box' }}>
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
          height: '100%',
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
              <span style={{ fontWeight: 700, color: '#3498db' }}>{user.total_orders}</span>
            </p>
            <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>累计消费:</span>
              <span style={{ fontWeight: 700, color: '#2ecc71' }}>{user.total_spent.toLocaleString()} MMK</span>
            </p>
            <p style={{ color: 'white', margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>综合评分:</span>
              <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>⭐ {user.rating.toFixed(1)}</span>
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

// 虚拟列表行组件 - 快递员
const CourierRow = ({ index, style, ...data }: any) => {
  const { 
    filteredCouriers, 
    isMobile, 
    handleEditCourier, 
    handleCourierStatusChange, 
    handleDeleteCourier 
  } = data;
  
  const courier = filteredCouriers[index];
  if (!courier) return null;
  
  return (
    <div style={{ ...style, paddingBottom: '20px', boxSizing: 'border-box' }}>
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
          height: '100%',
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
              <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>星级评价</p>
                <p style={{ margin: 0, color: '#fbbf24', fontSize: '1.4rem', fontWeight: 900 }}>⭐ {courier.rating}</p>
              </div>
            </div>
          </div>

          {/* 状态与操作 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: isMobile ? 'flex-start' : 'flex-end' }}>
            <div style={{ 
              background: courier.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
              color: courier.status === 'active' ? '#10b981' : '#f87171', 
              padding: '8px 20px', 
              borderRadius: '14px', 
              fontSize: '0.9rem', 
              fontWeight: 800,
              border: `1px solid ${courier.status === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 10px currentColor' }}></span>
              {courier.status === 'active' ? '在线中' : courier.status === 'inactive' ? '休假中' : '忙碌中'}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => handleEditCourier(courier)} 
                title="编辑业务信息"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', border: 'none', width: '42px', height: '42px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}
              >✏️</button>
              <button 
                onClick={() => handleCourierStatusChange(courier.id, courier.status === 'active' ? 'inactive' : 'active')} 
                title={courier.status === 'active' ? '停用账号' : '启用账号'}
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', width: '42px', height: '42px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}
              >{courier.status === 'active' ? '💤' : '⚡'}</button>
              <button 
                onClick={() => handleDeleteCourier(courier.id)} 
                title="永久删除"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white', border: 'none', width: '42px', height: '42px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}
              >🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 虚拟列表行组件 - 合伙店铺
const StoreRow = ({ index, style, ...data }: any) => {
  const { partnerStores, isMobile } = data;
  const store = partnerStores[index];
  if (!store) return null;
  
  return (
    <div style={{ ...style, paddingBottom: '15px', boxSizing: 'border-box' }}>
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
          height: '100%',
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
  // const [showUserForm, setShowUserForm] = useState(false);
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
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
                         
    // 根据当前标签页过滤类型
    let matchesType = true;
    if (activeTab === 'customer_list') {
      matchesType = user.user_type === 'customer';
    } else if (activeTab === 'admin_list') {
      matchesType = user.user_type === 'admin';
    }
    
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

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

      // 3. 合并数据，优先使用 admin_accounts 中的管理员数据
      // 过滤掉 users 表中可能存在的旧管理员数据（如果需要）或者直接合并
      // 这里我们选择直接合并，但确保 ID 唯一
      const allUsers = [...(usersData || []), ...adminUsers];
      
      // 去重（以防万一 ID 冲突）
      const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.id, item])).values());

      setUsers(uniqueUsers);
    } catch (error) {
      console.error('加载用户数据失败:', error);
      setUsers(getMockUsers());
    } finally {
      setLoading(false);
    }
  };

  // 模拟用户数据 - 已删除测试数据
  const getMockUsers = (): User[] => [];

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `USR${String(users.length + 1).padStart(3, '0')}`;
    const newUser: User = {
      id: newId,
      ...userForm,
      email: userForm.email.trim() || '', // 如果邮箱为空，设置为空字符串
      registration_date: new Date().toLocaleDateString('zh-CN'),
      last_login: '从未登录',
      total_orders: 0,
      total_spent: 0,
      rating: 0,
      register_region: userForm.register_region // 明确包含注册地区
    };

    try {
      const { error } = await supabase
        .from('users')
        .insert([newUser]);
      
      if (error) {
        console.error('创建用户失败:', error);
        window.alert(`创建用户失败: ${error.message}`);
        // 添加到本地状态
        setUsers([newUser, ...users]);
      } else {
        await loadUsers();
        window.alert('用户创建成功！');
      }
      
      setShowAddUserForm(false);
      setUserForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        password: '123456',
        user_type: 'customer',
        status: 'active',
        register_region: 'mandalay',
        notes: ''
      });
    } catch (error) {
      console.error('创建用户异常:', error);
      window.alert(`创建用户异常: ${error instanceof Error ? error.message : '未知错误'}`);
      setUsers([newUser, ...users]);
      setShowAddUserForm(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
      password: '',  // 编辑时不显示密码，留空表示不修改
      user_type: user.user_type || 'customer',
      status: user.status || 'active',
      register_region: user.register_region || 'mandalay',
      notes: user.notes || ''
    });
    // setShowUserForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // 如果密码为空，则不更新密码字段
    const updateData: any = { ...userForm };
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    }

    const updatedUser = { ...editingUser, ...updateData };

    try {
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);
      
      if (error) {
        console.error('更新用户失败:', error);
        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      } else {
        await loadUsers();
        window.alert('用户更新成功！');
      }
      
      setShowAddUserForm(false);
      setEditingUser(null);
      setUserForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        password: '123456',
        user_type: 'customer',
        status: 'active',
        register_region: 'mandalay',
        notes: ''
      });
    } catch (error) {
      console.error('更新用户异常:', error);
      window.alert(`更新用户异常: ${error instanceof Error ? error.message : '未知错误'}`);
      setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      setShowAddUserForm(false);
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('确定要删除这个用户吗？')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error('删除用户失败:', error);
        setUsers(users.filter(u => u.id !== userId));
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('删除用户异常:', error);
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);
      
      if (error) {
        console.error('更新用户状态失败:', error);
        setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('更新用户状态异常:', error);
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    }
  };

  // --- 快递员管理相关函数 ---

  useEffect(() => {
    if (activeTab === 'courier_management') {
      loadCouriers();
    } else if (activeTab === 'partner_store') {
      loadPartnerStores();
    } else if (activeTab === 'customer_list' || activeTab === 'admin_list') {
      loadUsers();
    }
  }, [activeTab]);

  const loadPartnerStores = async () => {
    try {
      setLoadingStores(true);
      const data = await deliveryStoreService.getAllStores();
      setPartnerStores(data || []);
    } catch (error) {
      console.error('加载合伙店铺异常:', error);
      setPartnerStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const loadCouriers = async () => {
    try {
      setCourierLoading(true);
      // 1. 获取所有账号系统中的账号
      const accounts = await adminAccountService.getAllAccounts();
      
      // 2. 过滤出职位为 "骑手" 或 "骑手队长" 的账号
      const riderAccounts = accounts.filter(acc => 
        acc.position === '骑手' || acc.position === '骑手队长'
      );

      // 3. 获取快递员表中的实时数据（如总配送量、评分等）
      const { data: realTimeData, error: rtError } = await supabase
        .from('couriers')
        .select('*');

      if (rtError) {
        console.warn('获取快递员实时数据失败:', rtError);
      }

      // 4. 以账号系统为准，合并实时数据
      const combinedCouriers: Courier[] = riderAccounts.map(acc => {
        // 通过手机号或员工编号匹配
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
      console.error('加载快递员数据失败:', error);
      setCouriers([]);
    } finally {
      setCourierLoading(false);
    }
  };

  const generateEmployeeId = (regionId: string, position: string, role: string): string => {
    const region = REGIONS.find(r => r.id === regionId);
    const regionPrefix = region ? region.prefix : 'MDY';
    let positionType = '';
    if (position.includes('骑手') || position === '骑手') {
      positionType = 'RIDER';
    } else if (role === 'finance' || position.includes('财务')) {
      positionType = 'ACCOUNT';
    } else if (role === 'manager' || position.includes('经理')) {
      positionType = 'MANAGER';
    } else if (role === 'admin' || position.includes('管理员')) {
      positionType = 'ADMIN';
    } else {
      positionType = 'STAFF';
    }
    
    const filteredCouriers = couriers.filter(c => {
      const idPrefix = `${regionPrefix}-${positionType}`;
      return c.employee_id && c.employee_id.startsWith(idPrefix);
    });
    
    const nextNumber = (filteredCouriers.length + 1).toString().padStart(3, '0');
    return `${regionPrefix}-${positionType}-${nextNumber}`;
  };

  const handleCourierFormChange = (field: string, value: any) => {
    setCourierForm(prev => {
      const newData = { ...prev, [field]: value };
      if ((field === 'region' || field === 'position' || field === 'role') && 
          newData.region && newData.position && newData.role) {
        const autoId = generateEmployeeId(newData.region, newData.position, newData.role);
        return { ...newData, employee_id: autoId };
      }
      return newData;
    });
  };

  const handleImportFromAccounts = async () => {
    if (!window.confirm('确定要从账号系统导入骑手吗？\n\n将自动导入职位为"骑手"或"骑手队长"的员工账号。')) {
      return;
    }

    setImporting(true);
    try {
      const { data: riderAccounts, error: queryError } = await supabase
        .from('admin_accounts')
        .select('*')
        .in('position', ['骑手', '骑手队长'])
        .eq('status', 'active');

      if (queryError) {
        console.error('查询骑手账号失败:', queryError);
        alert('查询失败，请检查数据库连接');
        return;
      }

      if (!riderAccounts || riderAccounts.length === 0) {
        alert('未找到骑手账号\n\n请先在"系统设置 → 账号管理"中创建职位为"骑手"或"骑手队长"的账号');
        return;
      }

      const existingCouriers = couriers.map(c => c.phone);
      
      const newCouriers = riderAccounts
        .filter(account => !existingCouriers.includes(account.phone))
        .map(account => ({
          id: `COU${Date.now()}${Math.floor(Math.random() * 1000)}`,
          name: account.employee_name,
          phone: account.phone,
          vehicle_type: account.position === '骑手队长' ? 'car' : 'motorcycle',
          status: 'active',
          rating: 5.0
        }));

      if (newCouriers.length === 0) {
        alert('所有骑手账号已存在，无需重复导入');
        return;
      }

      const { error: insertError } = await supabase
        .from('couriers')
        .insert(newCouriers);

      if (insertError) {
        console.error('导入快递员失败:', insertError);
        alert(`导入失败: ${insertError.message}`);
        return;
      }

      const currentUser = localStorage.getItem('currentUser') || 'admin';
      const currentUserName = localStorage.getItem('currentUserName') || '管理员';
      await auditLogService.log({
        user_id: currentUser,
        user_name: currentUserName,
        action_type: 'create',
        module: 'couriers',
        action_description: `从账号系统导入 ${newCouriers.length} 名骑手`,
        new_value: JSON.stringify(newCouriers.map(c => c.name))
      });

      alert(`✅ 导入成功！\n\n共导入 ${newCouriers.length} 名骑手`);
      await loadCouriers();
      
    } catch (error) {
      console.error('导入骑手异常:', error);
      alert('导入失败，请稍后重试');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `COU${String(couriers.length + 1).padStart(3, '0')}`;
    const newCourier: Courier = {
      id: newId,
      ...courierForm,
      join_date: new Date().toLocaleDateString('zh-CN'),
      last_active: '从未上线',
      total_deliveries: 0,
      rating: 0
    };

    try {
      const { data, error } = await supabase
        .from('couriers')
        .insert([newCourier])
        .select()
        .single();
      
      if (error) throw error;
      
      setCouriers([data, ...couriers]);
      
      setCourierForm({
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
        role: 'operator',
        region: 'yangon'
      });
      setCourierSubTab('list');
    } catch (error) {
      console.error('创建快递员异常:', error);
      alert('创建失败');
    }
  };

  const handleEditCourier = (courier: Courier) => {
    setEditingCourier(courier);
    setCourierForm({
      name: courier.name,
      phone: courier.phone,
      email: courier.email,
      address: courier.address,
      vehicle_type: courier.vehicle_type,
      license_number: courier.license_number,
      status: courier.status as any,
      notes: courier.notes,
      employee_id: courier.employee_id || '',
      department: courier.department || '',
      position: courier.position || '',
      role: (courier.role as any) || 'operator',
      region: (courier.region as any) || 'yangon'
    });
    setCourierSubTab('create');
  };

  const handleUpdateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourier) return;

    // 以账号系统为准进行更新
    const updateData: any = {
      employee_name: courierForm.name,
      phone: courierForm.phone,
      email: courierForm.email,
      address: courierForm.address,
      notes: courierForm.notes,
      status: courierForm.status,
      position: courierForm.position,
      role: courierForm.role,
      region: courierForm.region
    };

    try {
      // 1. 更新账号表 (admin_accounts)
      const success = await adminAccountService.updateAccount(editingCourier.id, updateData);
      
      if (!success) throw new Error('更新账号系统失败');

      // 2. 同步更新快递员表 (couriers) - 用于保存车辆和驾驶证等特殊信息
      await supabase
        .from('couriers')
        .update({
          name: courierForm.name,
          phone: courierForm.phone,
          vehicle_type: courierForm.vehicle_type,
          license_number: courierForm.license_number,
          status: courierForm.status,
          address: courierForm.address
        })
        .eq('id', editingCourier.id);
      
      window.alert('信息更新成功！');
      await loadCouriers();
      setEditingCourier(null);
      setCourierSubTab('list');
    } catch (error) {
      console.error('更新快递员异常:', error);
      alert('更新失败，请重试');
    }
  };

  const handleDeleteCourier = async (courierId: string) => {
    if (!window.confirm('确定要删除这个快递员吗？这将同时删除其登录账号！')) return;
    
    try {
      // 1. 从账号系统删除 (admin_accounts)
      const success = await adminAccountService.deleteAccount(courierId);
      
      if (!success) {
        // 如果删除失败，可能是因为该 ID 在 admin_accounts 中不存在，尝试直接从 couriers 删除
        console.warn('账号系统删除失败，尝试直接从快递员表删除');
      }

      // 2. 从快递员表删除 (couriers)
      await supabase
        .from('couriers')
        .delete()
        .eq('id', courierId);
      
      window.alert('删除成功');
      await loadCouriers();
    } catch (error) {
      console.error('删除快递员异常:', error);
      alert('删除失败');
    }
  };

  const handleCourierStatusChange = async (courierId: string, newStatus: string) => {
    try {
      // 1. 同步更新账号表状态
      await adminAccountService.updateAccountStatus(courierId, newStatus as any);

      // 2. 同步更新快递员表状态
      await supabase
        .from('couriers')
        .update({ 
          status: newStatus,
          last_active: new Date().toLocaleString('zh-CN')
        })
        .eq('id', courierId);
      
      await loadCouriers();
    } catch (error) {
      console.error('更新状态异常:', error);
    }
  };

  const getCourierStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#27ae60';
      case 'inactive': return '#e74c3c';
      case 'busy': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const filteredCouriers = couriers.filter(courier => {
    const matchesSearch = courier.name.toLowerCase().includes(courierSearchTerm.toLowerCase()) ||
                         courier.phone.includes(courierSearchTerm) ||
                         courier.email.toLowerCase().includes(courierSearchTerm.toLowerCase());
    const matchesStatus = courierStatusFilter === 'all' || courier.status === courierStatusFilter;
    const matchesVehicle = vehicleFilter === 'all' || courier.vehicle_type === vehicleFilter;
    
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: isMobile ? '12px' : '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '5%',
        width: '200px',
        height: '200px',
        background: 'rgba(192, 192, 192, 0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '5%',
        width: '150px',
        height: '150px',
        background: 'rgba(192, 192, 192, 0.1)',
        borderRadius: '50%',
        filter: 'blur(30px)'
      }}></div>

      {/* 头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        color: 'white',
        position: 'relative',
        zIndex: 1
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            {language === 'zh' ? '用户管理' : language === 'en' ? 'User Management' : 'အသုံးပြုသူစီမံခန့်ခွဲမှု'}
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            {language === 'zh' ? '管理客户、快递员和管理员账户' : 
             language === 'en' ? 'Manage customer, courier and admin accounts' : 
             'ဖောက်သည်၊ စာပို့သမားနှင့် စီမံခန့်ခွဲသူအကောင့်များကို စီမံခန့်ခွဲပါ'}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ← 返回管理后台
        </button>
      </div>

      {/* 标签页 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '30px',
        position: 'relative',
        zIndex: 1,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('customer_list')}
          style={{
            background: activeTab === 'customer_list' ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))' : 'rgba(0, 0, 0, 0.2)',
            color: 'white',
            border: activeTab === 'customer_list' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'customer_list' ? '600' : '400',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'customer_list' ? '0 4px 15px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          客户列表
        </button>
        <button
          onClick={() => setActiveTab('admin_list')}
          style={{
            background: activeTab === 'admin_list' ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))' : 'rgba(0, 0, 0, 0.2)',
            color: 'white',
            border: activeTab === 'admin_list' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'admin_list' ? '600' : '400',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'admin_list' ? '0 4px 15px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          管理员列表
        </button>
        <button
          onClick={() => setActiveTab('partner_store')}
          style={{
            background: activeTab === 'partner_store' ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))' : 'rgba(0, 0, 0, 0.2)',
            color: 'white',
            border: activeTab === 'partner_store' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'partner_store' ? '600' : '400',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'partner_store' ? '0 4px 15px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          合伙店铺
        </button>
        <button
          onClick={() => setActiveTab('courier_management')}
          style={{
            background: activeTab === 'courier_management' ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.1))' : 'rgba(0, 0, 0, 0.2)',
            color: 'white',
            border: activeTab === 'courier_management' ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'courier_management' ? '600' : '400',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'courier_management' ? '0 4px 15px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          快递员管理
        </button>
      </div>

      {/* 用户列表 (客户/管理员) */}
      {(activeTab === 'customer_list' || activeTab === 'admin_list') && !editingUser && !showAddUserForm && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '15px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* 统计信息 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'rgba(52, 152, 219, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(52, 152, 219, 0.3)'
            }}>
              <h3 style={{ color: '#3498db', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                {users.filter(u => u.user_type === 'customer').length}
              </h3>
              <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>客户总数</p>
            </div>
            <div style={{
              background: 'rgba(155, 89, 182, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(155, 89, 182, 0.3)'
            }}>
              <h3 style={{ color: '#9b59b6', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                {couriers.length}
              </h3>
              <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>快递员总数</p>
            </div>
            <div style={{
              background: 'rgba(39, 174, 96, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(39, 174, 96, 0.3)'
            }}>
              <h3 style={{ color: '#27ae60', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                {users.filter(u => u.status === 'active').length}
              </h3>
              <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>活跃用户</p>
            </div>
            <div style={{
              background: 'rgba(230, 126, 34, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(230, 126, 34, 0.3)'
            }}>
              <h3 style={{ color: '#e67e22', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                {users.reduce((sum, u) => sum + (u.total_orders || 0), 0)}
              </h3>
              <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>总订单数</p>
            </div>
          </div>

          {/* 搜索和过滤 */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '24px',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder={activeTab === 'customer_list' ? "🔍 搜索客户姓名、电话..." : "🔍 搜索管理员..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(5px)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '14px 20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                cursor: 'pointer',
                backdropFilter: 'blur(5px)'
              }}
            >
              <option value="all">📊 所有状态</option>
              <option value="active">✅ 活跃</option>
              <option value="inactive">💤 非活跃</option>
              <option value="suspended">🚫 已暂停</option>
            </select>

            <div style={{ flex: 1 }}></div>

            {/* 批量操作按钮 */}
            {selectedUsers.size > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={isBatchDeleting}
                style={{
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: isBatchDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: isBatchDeleting ? 0.7 : 1
                }}
                onMouseOver={(e) => !isBatchDeleting && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !isBatchDeleting && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isBatchDeleting ? '⏳ 删除中...' : `🗑️ 批量删除 (${selectedUsers.size})`}
              </button>
            )}
            
            {activeTab === 'customer_list' && (
              <button
                onClick={() => {
                  setShowAddUserForm(true);
                  setEditingUser(null);
                  setUserForm({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    password: '123456',
                    user_type: 'customer',
                    status: 'active',
                    register_region: 'mandalay',
                    notes: ''
                  });
                }}
                style={{
                  background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(39, 174, 96, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.3)';
                }}
              >
                ➕ 新增用户
              </button>
            )}
            <button
              onClick={handleSelectAll}
              style={{
                background: selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 
                  ? 'rgba(52, 152, 219, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: selectedUsers.size === filteredUsers.length && filteredUsers.length > 0
                  ? '1px solid #3498db'
                  : '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 
                  ? 'rgba(52, 152, 219, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)'}
            >
              {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? '☒ 取消全选' : '☐ 全选'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
              <p>加载中...</p>
            </div>
          ) : (
            <div style={{
              height: '75vh',
              width: '100%',
              position: 'relative'
            }}>
              {filteredUsers.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: 'white', 
                  padding: '5rem 2rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '20px',
                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(5px)'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.8 }}>🔍</div>
                  <h3 style={{ fontSize: '1.5rem', margin: '0 0 10px 0', fontWeight: 600 }}>未找到匹配用户</h3>
                  <p style={{ fontSize: '1.1rem', margin: 0, opacity: 0.6 }}>请尝试调整搜索关键词或筛选条件</p>
                </div>
              ) : (
                <AutoSizerComponent>
                  {({ height, width }: any) => (
                    <ListComponent
                      height={height}
                      itemCount={filteredUsers.length}
                      itemSize={isMobile ? 540 : 480}
                      width={width}
                      itemData={{
                        filteredUsers,
                        selectedUsers,
                        handleSelectUser,
                        isMobile,
                        handleEditUser,
                        updateUserStatus,
                        handleDeleteUser
                      }}
                    >
                      {UserRow}
                    </ListComponent>
                  )}
                </AutoSizerComponent>
              )}
            </div>
          )}
        </div>
      )}

      {/* 创建/编辑用户表单 */}
      {(editingUser || showAddUserForm) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            borderRadius: '20px',
            padding: isMobile ? '24px' : '40px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh', // 限制最大高度
            overflowY: 'auto', // 允许垂直滚动
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            scrollbarWidth: 'none', // Firefox隐藏滚动条
            msOverflowStyle: 'none' // IE/Edge隐藏滚动条
          }}>
            <style dangerouslySetInnerHTML={{__html: `
              div::-webkit-scrollbar { 
                display: none; 
              }
            `}} />
            {/* 装饰背景 */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(30px)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '50%',
              filter: 'blur(20px)'
            }}></div>

            <h2 style={{ 
              color: 'white', 
              textAlign: 'center', 
              marginBottom: '30px', 
              fontSize: '1.8rem', 
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              position: 'relative',
              zIndex: 1
            }}>
              {editingUser ? '编辑用户' : '新增用户'}
            </h2>
            
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'grid',
                gap: '20px',
                marginBottom: '30px'
              }}>
                {/* 基本信息 */}
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px' }}>
                  <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                    👤 基本信息
                  </h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <input
                      type="text"
                      placeholder="姓名"
                      value={userForm.name}
                      onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <input
                      type="tel"
                      placeholder="电话"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <input
                      type="email"
                      placeholder="邮箱（可选，如果没有gmail可留空）"
                      value={userForm.email}
                      onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <textarea
                      placeholder="地址（可选）"
                      value={userForm.address}
                      onChange={(e) => setUserForm({...userForm, address: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        height: '100px',
                        resize: 'vertical',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>📍 注册地区</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {REGIONS.map(region => (
                          <button
                            key={region.id}
                            type="button"
                            onClick={() => setUserForm({...userForm, register_region: region.id})}
                            style={{
                              padding: '10px 18px',
                              borderRadius: '10px',
                              border: '1px solid ' + (userForm.register_region === region.id ? '#3498db' : 'rgba(255, 255, 255, 0.2)'),
                              background: userForm.register_region === region.id ? 'rgba(52, 152, 219, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                              color: userForm.register_region === region.id ? '#3498db' : 'white',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: userForm.register_region === region.id ? 'bold' : 'normal',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {region.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder={editingUser ? "密码（留空则不修改）" : "密码（默认：123456）"}
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* 账户设置 */}
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '15px' }}>
                  <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                    ⚙️ 账户设置
                  </h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {/* 仅在编辑模式且非普通用户时显示用户类型选择，否则默认为客户 */}
                    {editingUser && userForm.user_type !== 'customer' ? (
                      <select
                        value={userForm.user_type}
                        onChange={(e) => setUserForm({...userForm, user_type: e.target.value as 'customer' | 'courier' | 'admin'})}
                        style={{
                          width: '100%',
                          padding: '14px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '10px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          color: 'white',
                          fontSize: '1rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="customer">Member</option>
                        <option value="courier">Courier</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                       <div style={{
                         padding: '14px',
                         border: '1px solid rgba(255, 255, 255, 0.1)',
                         borderRadius: '10px',
                         background: 'rgba(255, 255, 255, 0.05)',
                         color: 'rgba(255, 255, 255, 0.7)',
                         fontSize: '1rem',
                         display: 'flex',
                         alignItems: 'center',
                         gap: '10px'
                       }}>
                         <span>👤 用户类型:</span>
                         <span style={{ color: 'white', fontWeight: 'bold' }}>Member</span>
                       </div>
                    )}
                    
                    <select
                      value={userForm.status}
                      onChange={(e) => setUserForm({...userForm, status: e.target.value as 'active' | 'inactive' | 'suspended'})}
                      style={{
                        width: '100%',
                        padding: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="active">✅ 活跃</option>
                      <option value="inactive">💤 非活跃</option>
                      <option value="suspended">🚫 已暂停</option>
                    </select>
                    <textarea
                      placeholder="备注"
                      value={userForm.notes}
                      onChange={(e) => setUserForm({...userForm, notes: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        color: 'white',
                        height: '80px',
                        resize: 'vertical',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 提交按钮 */}
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setShowAddUserForm(false);
                    setUserForm({
                      name: '',
                      phone: '',
                      email: '',
                      address: '',
                      password: '123456',
                      user_type: 'customer',
                      status: 'active',
                      register_region: 'mandalay',
                      notes: ''
                    });
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '14px 40px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(5px)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 60px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(0, 114, 255, 0.3)',
                    transition: 'all 0.3s ease',
                    flex: '1',
                    maxWidth: '200px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 114, 255, 0.5)';
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 114, 255, 0.3)';
                    e.currentTarget.style.filter = 'brightness(1)';
                  }}
                >
                  {editingUser ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 合伙店铺列表 */}
      {activeTab === 'partner_store' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '15px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{ color: 'white', margin: 0 }}>合伙店铺 ({partnerStores.length})</h2>
             {/* 未来可以添加创建店铺按钮 */}
          </div>

          {loadingStores ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>加载中...</div>
          ) : partnerStores.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
               暂无合伙店铺数据
            </div>
          ) : (
            <div style={{ height: '70vh', width: '100%' }}>
              <AutoSizerComponent>
                {({ height, width }: any) => (
                  <ListComponent
                    height={height}
                    itemCount={partnerStores.length}
                    itemSize={isMobile ? 260 : 220}
                    width={width}
                    itemData={{
                      partnerStores,
                      isMobile
                    }}
                  >
                    {StoreRow}
                  </ListComponent>
                )}
              </AutoSizerComponent>
            </div>
          )}
        </div>
      )}

      {/* 快递员管理 */}
      {activeTab === 'courier_management' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(25px)',
          borderRadius: '24px',
          padding: isMobile ? '16px' : '32px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* 内部标签页 - 高级视觉版 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '20px'
          }}>
            <button
              onClick={() => setCourierSubTab('list')}
              style={{
                background: courierSubTab === 'list' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: courierSubTab === 'list' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              📋 快递员列表
            </button>
            {editingCourier && (
              <button
                onClick={() => setCourierSubTab('create')}
                style={{
                  background: courierSubTab === 'create' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: courierSubTab === 'create' ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none'
                }}
              >
                ✏️ 编辑快递员信息
              </button>
            )}
          </div>

          {courierSubTab === 'list' && (
            <div>
              {/* 统计卡片 - 视觉升级 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: '20px',
                marginBottom: '32px'
              }}>
                 {[
                   { label: '总数', value: couriers.length, color: '#3b82f6', icon: '👥' },
                   { label: '活跃', value: couriers.filter(c => c.status === 'active').length, color: '#10b981', icon: '🟢' },
                   { label: '总配送', value: couriers.reduce((s, c) => s + c.total_deliveries, 0), color: '#f59e0b', icon: '📦' },
                   { label: '平均评分', value: (couriers.reduce((s, c) => s + c.rating, 0) / couriers.length || 0).toFixed(1), color: '#8b5cf6', icon: '⭐' }
                 ].map((stat, i) => (
                   <div key={i} style={{ 
                     background: 'rgba(15, 32, 60, 0.4)', 
                     padding: '24px 16px', 
                     borderRadius: '20px', 
                     textAlign: 'center', 
                     border: `1px solid ${stat.color}33`,
                     boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                     transition: 'transform 0.3s ease'
                   }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{stat.icon}</div>
                      <h3 style={{ color: stat.color, margin: '0 0 4px 0', fontSize: '1.8rem', fontWeight: 800 }}>{stat.value}</h3>
                      <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{stat.label}</p>
                   </div>
                 ))}
              </div>

              {/* 筛选 - 视觉升级 */}
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                marginBottom: '24px', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                background: 'rgba(0, 0, 0, 0.2)', 
                padding: '20px', 
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ position: 'relative', flex: '1 1 300px' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                  <input 
                    type="text" 
                    placeholder="搜索姓名、电话、工号..." 
                    value={courierSearchTerm}
                    onChange={(e) => setCourierSearchTerm(e.target.value)}
                    style={{ 
                      padding: '14px 14px 14px 40px', 
                      borderRadius: '12px', 
                      border: '1px solid rgba(255,255,255,0.2)', 
                      background: 'rgba(15, 32, 60, 0.5)', 
                      color: 'white', 
                      width: '100%',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s'
                    }}
                  />
                </div>
                <select 
                  value={courierStatusFilter}
                  onChange={(e) => setCourierStatusFilter(e.target.value)}
                  style={{ 
                    padding: '14px 20px', 
                    borderRadius: '12px', 
                    background: 'rgba(15, 32, 60, 0.5)', 
                    color: 'white', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontSize: '1rem', 
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="all" style={{ color: '#000' }}>📊 所有状态</option>
                  <option value="active" style={{ color: '#000' }}>✅ 活跃</option>
                  <option value="inactive" style={{ color: '#000' }}>💤 非活跃</option>
                  <option value="busy" style={{ color: '#000' }}>📦 忙碌</option>
                </select>
                <select 
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  style={{ 
                    padding: '14px 20px', 
                    borderRadius: '12px', 
                    background: 'rgba(15, 32, 60, 0.5)', 
                    color: 'white', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    fontSize: '1rem', 
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="all" style={{ color: '#000' }}>🚗 所有车辆</option>
                  <option value="motorcycle" style={{ color: '#000' }}>🏍️ 摩托车</option>
                  <option value="car" style={{ color: '#000' }}>🚗 汽车</option>
                  <option value="bicycle" style={{ color: '#000' }}>🚲 自行车</option>
                  <option value="truck" style={{ color: '#000' }}>🚚 卡车</option>
                  <option value="tricycle" style={{ color: '#000' }}>🛺 三轮车</option>
                  <option value="small_truck" style={{ color: '#000' }}>🚛 小卡车</option>
                </select>
              </div>

              {/* 列表 - 现代悬浮卡片设计 */}
              {courierLoading ? (
                <div style={{ color: 'white', textAlign: 'center', padding: '60px' }}>加载中...</div>
              ) : filteredCouriers.length === 0 ? (
                <div style={{ 
                  color: 'white', 
                  textAlign: 'center', 
                  padding: '80px 20px', 
                  background: 'rgba(255,255,255,0.03)', 
                  borderRadius: '20px',
                  border: '1px dashed rgba(255,255,255,0.1)'
                }}>没有找到匹配的快递员</div>
              ) : (
                <div style={{ height: '75vh', width: '100%' }}>
                  <AutoSizerComponent>
                    {({ height, width }: any) => (
                      <ListComponent
                        height={height}
                        itemCount={filteredCouriers.length}
                        itemSize={isMobile ? 650 : 350}
                        width={width}
                        itemData={{
                          filteredCouriers,
                          isMobile,
                          handleEditCourier,
                          handleCourierStatusChange,
                          handleDeleteCourier
                        }}
                      >
                        {CourierRow}
                      </ListComponent>
                    )}
                  </AutoSizerComponent>
                </div>
              )}
            </div>
          )}

          {courierSubTab === 'create' && (
             <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '16px', 
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}>
                    ✏️
                  </div>
                  <h2 style={{ color: 'white', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>编辑快递员业务信息</h2>
                </div>

                <form onSubmit={editingCourier ? handleUpdateCourier : handleCreateCourier}>
                   <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
                      
                      {/* 只读的核心信息（由账号系统决定） */}
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', gridColumn: '1 / -1' }}>
                        <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#90cdf4', fontWeight: 700 }}>以下信息由账号系统决定，无法在此修改：</p>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '4px' }}>姓名</label>
                            <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>{courierForm.name}</p>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '4px' }}>电话</label>
                            <p style={{ margin: 0, color: 'white', fontWeight: 600 }}>{courierForm.phone}</p>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '4px' }}>员工编号</label>
                            <p style={{ margin: 0, color: '#48bb78', fontWeight: 800, fontFamily: 'monospace' }}>{courierForm.employee_id}</p>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '4px' }}>所属地区</label>
                            <p style={{ margin: 0, color: '#93c5fd', fontWeight: 700 }}>
                              {(() => {
                                const r = REGIONS.find(reg => reg.id === courierForm.region || reg.prefix === courierForm.region);
                                return r ? `${r.name} (${r.prefix})` : (courierForm.region || '-');
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 可编辑的业务信息 */}
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', color: 'white', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 700 }}>📦 业务属性配置</label>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', paddingLeft: '4px' }}>配送车辆类型</label>
                        <select 
                          value={courierForm.vehicle_type} 
                          onChange={e => setCourierForm({...courierForm, vehicle_type: e.target.value})} 
                          style={{ 
                            padding: '14px', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(255,255,255,0.2)', 
                            background: 'rgba(15, 32, 60, 0.6)', 
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none'
                          }}
                        >
                           <option value="motorcycle">🏍️ 摩托车</option>
                           <option value="car">🚗 汽车</option>
                           <option value="bicycle">🚲 自行车</option>
                           <option value="truck">🚚 卡车</option>
                           <option value="tricycle">🛺 三轮车</option>
                           <option value="small_truck">🚛 小卡车</option>
                        </select>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', paddingLeft: '4px' }}>驾驶证/营业执照号</label>
                        <input 
                          placeholder="请输入证件号码" 
                          value={courierForm.license_number} 
                          onChange={e => setCourierForm({...courierForm, license_number: e.target.value})} 
                          required 
                          style={{ 
                            padding: '14px', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(255,255,255,0.2)', 
                            background: 'rgba(15, 32, 60, 0.6)', 
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none'
                          }} 
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', paddingLeft: '4px' }}>业务备注</label>
                        <textarea 
                          placeholder="例如：熟悉曼德勒北区路线、持有特种车辆驾驶证..." 
                          value={courierForm.notes} 
                          onChange={e => setCourierForm({...courierForm, notes: e.target.value})} 
                          rows={4} 
                          style={{ 
                            width: '100%', 
                            padding: '14px', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(255,255,255,0.2)', 
                            background: 'rgba(15, 32, 60, 0.6)', 
                            color: 'white', 
                            resize: 'vertical',
                            fontSize: '1rem',
                            outline: 'none',
                            lineHeight: 1.6
                          }} 
                        />
                      </div>
                   </div>

                   <div style={{ textAlign: 'center', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                      <button 
                        type="submit" 
                        style={{ 
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                          color: 'white', 
                          border: 'none', 
                          padding: '14px 40px', 
                          borderRadius: '12px', 
                          cursor: 'pointer', 
                          fontWeight: 'bold', 
                          fontSize: '1.1rem', 
                          boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.3s ease' 
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.filter = 'brightness(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.filter = 'brightness(1)';
                        }}
                      >
                         ✅ 保存业务信息
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setEditingCourier(null); setCourierSubTab('list'); }} 
                        style={{ 
                          background: 'rgba(255,255,255,0.1)', 
                          color: 'white', 
                          border: '1px solid rgba(255,255,255,0.2)', 
                          padding: '14px 40px', 
                          borderRadius: '12px', 
                          cursor: 'pointer', 
                          fontSize: '1.1rem',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      >
                         取消
                      </button>
                   </div>
                </form>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
