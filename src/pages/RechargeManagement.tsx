import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, rechargeService, RechargeRequest, auditLogService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import { errorHandler } from '../services/errorHandler';

// 🚀 新增：地区定义
const REGIONS = [
  { id: 'mandalay', name: '曼德勒', nameEn: 'Mandalay' },
  { id: 'yangon', name: '仰光', nameEn: 'Yangon' },
  { id: 'maymyo', name: '彬乌伦', nameEn: 'Pyin Oo Lwin' },
  { id: 'naypyidaw', name: '内比都', nameEn: 'Naypyidaw' },
  { id: 'taunggyi', name: '东枝', nameEn: 'Taunggyi' },
  { id: 'lashio', name: '腊戌', nameEn: 'Lashio' },
  { id: 'muse', name: '木姐', nameEn: 'Muse' }
];

const RechargeManagement: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  
  // 🚀 修改：日期筛选改为单日，移除 VIP 筛选状态
  const [selectedDate, setSelectedDate] = useState('');

  // 获取当前登录管理员信息
  const currentAdmin = sessionStorage.getItem('currentUserName') || '系统管理员';
  const currentAdminId = sessionStorage.getItem('currentUser') || 'admin';

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rechargeService.getAllRequests();
      setRequests(data);
    } catch (error) {
      errorHandler.handleError(error, '加载充值申请失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const timer = setInterval(loadRequests, 30000);
    return () => clearInterval(timer);
  }, [loadRequests]);

  const handleApprove = async (request: RechargeRequest) => {
    if (!window.confirm(`确定要通过该充值申请吗？\n用户: ${request.user_name}\n金额: ${request.amount.toLocaleString()} MMK`)) return;

    try {
      setLoading(true);
      const success = await rechargeService.updateRequestStatus(request.id!, request.user_id, 'completed', request.amount);
      if (success) {
        await auditLogService.log({
          user_id: currentAdminId,
          user_name: currentAdmin,
          action_type: 'update',
          module: 'finance',
          target_id: request.id,
          target_name: `充值申请 - ${request.user_name}`,
          action_description: `通过充值申请: ${request.amount.toLocaleString()} MMK`,
          new_value: JSON.stringify({ status: 'completed' })
        });
        alert('审核通过成功');
        loadRequests();
      }
    } catch (error) {
      errorHandler.handleError(error, '审核操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request: RechargeRequest) => {
    const reason = window.prompt('请输入拒绝理由:');
    if (reason === null) return;

    try {
      setLoading(true);
      const success = await rechargeService.updateRequestStatus(request.id!, request.user_id, 'rejected', request.amount);
      if (success) {
        await auditLogService.log({
          user_id: currentAdminId,
          user_name: currentAdmin,
          action_type: 'update',
          module: 'finance',
          target_id: request.id,
          target_name: `充值申请 - ${request.user_name}`,
          action_description: `拒绝充值申请: ${request.amount.toLocaleString()} MMK, 理由: ${reason}`,
          new_value: JSON.stringify({ status: 'rejected', reason })
        });
        alert('已拒绝申请');
        loadRequests();
      }
    } catch (error) {
      errorHandler.handleError(error, '拒绝操作失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // 1. 状态过滤
      if (filterStatus !== 'all' && req.status !== filterStatus) return false;
      
      // 2. 🚀 修改：单日日期过滤
      if (selectedDate) {
        const reqDate = new Date(req.created_at!).toISOString().split('T')[0];
        if (reqDate !== selectedDate) return false;
      }
      
      return true;
    });
  }, [requests, filterStatus, selectedDate]);

  /** 各状态数量（与筛选标签一致，便于一眼看到待处理量） */
  const statusCounts = useMemo(() => ({
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length
  }), [requests]);

  // 🚀 新增：充值统计汇总
  const summary = useMemo(() => {
    const totalCompletedAmount = requests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const totalPendingAmount = requests
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);
      
    const vipCount = requests
      .filter(r => (r.user_balance || 0) > 0)
      .map(r => r.user_id)
      .filter((value, index, self) => self.indexOf(value) === index) // 去重
      .length;

    return {
      completed: totalCompletedAmount,
      pending: totalPendingAmount,
      vips: vipCount,
      totalCount: requests.length
    };
  }, [requests]);

  const getStatusStyle = (status: string) => {
    const zh = language === 'zh';
    switch (status) {
      case 'pending':
        return { background: '#fef3c7', color: '#92400e', label: zh ? '待审核' : 'Pending' };
      case 'completed':
        return { background: '#dcfce7', color: '#166534', label: zh ? '已完成' : 'Completed' };
      case 'rejected':
        return { background: '#fee2e2', color: '#991b1b', label: zh ? '已取消' : 'Cancelled' };
      default:
        return { background: '#f3f4f6', color: '#374151', label: status };
    }
  };

  const filterTabLabel = (s: string) => {
    if (s === 'all') return language === 'zh' ? '全部' : 'All';
    if (s === 'pending') return language === 'zh' ? '待审核' : 'Pending';
    if (s === 'completed') return language === 'zh' ? '已完成' : 'Completed';
    if (s === 'rejected') return language === 'zh' ? '已取消' : 'Cancelled';
    return s;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // 🚀 优化：使用深邃的暗蓝色背景，更专业
      padding: isMobile ? '15px' : '40px',
      color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 800, letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '15px' }}>💳</span>
                {language === 'zh' ? '充值管理' : 'Recharge Center'}
              </h1>
              {statusCounts.pending > 0 && (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    padding: '8px 14px',
                    borderRadius: '999px',
                    boxShadow: '0 6px 18px rgba(231, 76, 60, 0.35)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {language === 'zh'
                    ? `待审核 ${statusCounts.pending} 笔`
                    : `${statusCounts.pending} pending`}
                </span>
              )}
            </div>
            <p style={{ margin: '10px 0 0 0', opacity: 0.65, fontSize: '0.95rem' }}>
              {language === 'zh'
                ? `共 ${statusCounts.all} 条 · 待审 ${statusCounts.pending} · 已完成 ${statusCounts.completed} · 已取消 ${statusCounts.rejected}`
                : `Total ${statusCounts.all} · Pending ${statusCounts.pending} · Done ${statusCounts.completed} · Cancelled ${statusCounts.rejected}`}
            </p>
            <p style={{ margin: '6px 0 0 0', opacity: 0.5, fontSize: '0.9rem' }}>
              {language === 'zh' ? '审核客户充值申请并管理账户余额' : 'Audit recharge requests and manage balances'}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            ← {language === 'zh' ? '返回后台' : 'Back'}
          </button>
        </div>

        {/* 🚀 新增：充值统计卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '30px'
        }}>
          {[
            { label: '已完成总额', value: summary.completed, color: '#10b981', icon: '💰' },
            { label: '待审核总额', value: summary.pending, color: '#f59e0b', icon: '⏳' },
            { label: 'VIP 客户数', value: summary.vips, color: '#8b5cf6', icon: '💎', noCurrency: true },
            { label: '总申请单数', value: summary.totalCount, color: '#3b82f6', icon: '📊', noCurrency: true }
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '20px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              transition: 'transform 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{item.label}</span>
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>
                  {item.value.toLocaleString()}
                </span>
                {!item.noCurrency && <span style={{ fontSize: '0.7rem', color: item.color, fontWeight: 'bold' }}>MMK</span>}
              </div>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: item.color, marginTop: '5px' }}></div>
            </div>
          ))}
        </div>

        {/* 过滤器 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          padding: '20px',
          borderRadius: '24px',
          marginBottom: '30px',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {(['all', 'pending', 'completed', 'rejected'] as const).map((s) => {
                const count = statusCounts[s];
                const active = filterStatus === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterStatus(s)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: active ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.15)',
                      background: active ? 'rgba(37, 99, 235, 0.4)' : 'rgba(255,255,255,0.06)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {filterTabLabel(s)} <span style={{ opacity: 0.8 }}>({count})</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={loadRequests}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  color: '#10b981', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
              >
                🔄 同步
              </button>
            </div>
          </div>

          {/* 🚀 修改：单日日期筛选 */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            alignItems: 'center',
            paddingTop: '15px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>📅 筛选日期:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
              <button 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                今天
              </button>
              {selectedDate && (
                <button 
                  onClick={() => setSelectedDate('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 申请列表 */}
        <div style={{ display: 'grid', gap: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px', opacity: 0.5 }}>
              <div style={{ fontSize: '2rem', marginBottom: '15px' }}>⏳</div>
              {language === 'zh' ? '正在获取数据...' : 'Loading...'}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px', background: 'rgba(255,255,255,0.02)', borderRadius: '30px', border: '2px dashed rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.2 }}>📭</div>
              <p style={{ opacity: 0.5, fontSize: '1.05rem' }}>
                {requests.length === 0
                  ? (language === 'zh' ? '暂无申请记录' : 'No records found')
                  : (language === 'zh' ? '该状态下暂无记录，请切换上方筛选或调整日期' : 'No records in this filter')}
              </p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const style = getStatusStyle(req.status);
              return (
                <div key={req.id} style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '24px',
                  padding: '25px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '25px',
                  transition: 'all 0.3s ease',
                  cursor: 'default'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                      <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {req.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontWeight: '800', fontSize: '1.25rem', color: '#fff' }}>{req.user_name}</div>
                          {(req.user_balance || 0) > 0 && (
                            <div style={{
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.65rem',
                              fontWeight: '900',
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                            }}>
                              💎 VIP
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '2px' }}>ID: {req.user_id}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '15px' }}>
                      <span style={{ fontSize: '2rem', fontWeight: '900', color: '#fff' }}>{req.amount.toLocaleString()}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3b82f6', opacity: 0.8 }}>MMK</span>
                    </div>

                    {/* 信息详情分列 */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                      gap: '15px', 
                      background: 'rgba(0,0,0,0.2)', 
                      padding: '15px', 
                      borderRadius: '16px' 
                    }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '4px' }}>Submission Time</div>
                        <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{new Date(req.created_at!).toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', marginBottom: '4px' }}>Location</div>
                        <div style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: 'bold' }}>
                          📍 {REGIONS.find(r => r.id === req.register_region)?.name || req.register_region || '曼德勒'}
                        </div>
                      </div>
                    </div>

                    {req.notes && (
                      <div style={{ fontSize: '0.85rem', marginTop: '15px', color: '#94a3b8', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', fontStyle: 'italic' }}>
                        “ {req.notes} ”
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: '15px', minWidth: isMobile ? '100%' : 'auto' }}>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: style.background,
                      color: style.color,
                      fontWeight: '900',
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      {style.label}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      {req.proof_url && (
                        <button
                          onClick={() => setShowProofModal(req.proof_url!)}
                          style={{ 
                            padding: '12px', 
                            borderRadius: '12px', 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            border: '1px solid rgba(59, 130, 246, 0.2)', 
                            color: '#3b82f6', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          title="查看凭证"
                        >
                          <span style={{ fontSize: '1.2rem' }}>🖼️</span>
                        </button>
                      )}
                      
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(req)}
                            style={{ padding: '12px 24px', borderRadius: '12px', background: '#10b981', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                          >
                            {language === 'zh' ? '通过' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            style={{ padding: '12px 24px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            {language === 'zh' ? '拒绝' : 'Reject'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 图片预览模态框 */}
      {showProofModal && (
        <div 
          onClick={() => setShowProofModal(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 2000,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px'
          }}
        >
          <img src={showProofModal} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px' }} alt="Proof" />
          <div style={{ position: 'absolute', top: '20px', right: '20px', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>✕</div>
        </div>
      )}
    </div>
  );
};

export default RechargeManagement;
