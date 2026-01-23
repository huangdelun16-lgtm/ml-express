import React, { useState, useEffect } from 'react';
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

  // 获取当前登录管理员信息
  const currentAdmin = sessionStorage.getItem('currentUserName') || '系统管理员';
  const currentAdminId = sessionStorage.getItem('currentUser') || 'admin';

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await rechargeService.getAllRequests();
      setRequests(data);
    } catch (error) {
      errorHandler.handleError(error, '加载充值申请失败');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredRequests = requests.filter(r => filterStatus === 'all' || r.status === filterStatus);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { background: '#fef3c7', color: '#92400e', label: '待审核' };
      case 'completed': return { background: '#dcfce7', color: '#166534', label: '已完成' };
      case 'rejected': return { background: '#fee2e2', color: '#991b1b', label: '已拒绝' };
      default: return { background: '#f3f4f6', color: '#374151', label: status };
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 800, letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '15px' }}>💳</span>
              {language === 'zh' ? '充值中心' : 'Recharge Center'}
            </h1>
            <p style={{ margin: '8px 0 0 65px', opacity: 0.6, fontSize: '1rem' }}>
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

        {/* 过滤器 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          padding: '10px',
          borderRadius: '20px',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(255,255,255,0.05)',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', gap: '8px', padding: '5px' }}>
            {['all', 'pending', 'completed', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '14px',
                  border: 'none',
                  background: filterStatus === s ? '#3b82f6' : 'transparent',
                  color: filterStatus === s ? 'white' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {s === 'all' ? '全部' : getStatusStyle(s).label}
              </button>
            ))}
          </div>
          <button
            onClick={loadRequests}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '14px', 
              border: 'none', 
              background: 'rgba(16, 185, 129, 0.1)', 
              color: '#10b981', 
              cursor: 'pointer',
              fontWeight: 'bold',
              marginRight: '5px'
            }}
          >
            🔄 {language === 'zh' ? '同步数据' : 'Sync'}
          </button>
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
              <p style={{ opacity: 0.4 }}>{language === 'zh' ? '暂无申请记录' : 'No records found'}</p>
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
                  transition: 'transform 0.3s ease'
                }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                      <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {req.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '1.25rem', color: '#fff' }}>{req.user_name}</div>
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
