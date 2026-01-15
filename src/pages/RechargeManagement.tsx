import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, rechargeService, RechargeRequest, auditLogService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import { errorHandler } from '../services/errorHandler';

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
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: isMobile ? '12px' : '24px',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            💳 {language === 'zh' ? '充值管理中心' : 'Recharge Management'}
          </h1>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            ← 返回后台
          </button>
        </div>

        {/* 过滤器 */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['all', 'pending', 'completed', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: filterStatus === s ? '#3182ce' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {s === 'all' ? '全部' : getStatusStyle(s).label}
              </button>
            ))}
          </div>
          <button
            onClick={loadRequests}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#38a169', color: 'white', cursor: 'pointer' }}
          >
            🔄 刷新数据
          </button>
        </div>

        {/* 申请列表 */}
        <div style={{ display: 'grid', gap: '15px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>暂无申请记录</div>
          ) : (
            filteredRequests.map(req => {
              const style = getStatusStyle(req.status);
              return (
                <div key={req.id} style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{req.user_name}</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>ID: {req.user_id}</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24', marginBottom: '8px' }}>
                      {req.amount.toLocaleString()} <span style={{ fontSize: '0.9rem' }}>MMK</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      🕒 申请时间: {new Date(req.created_at!).toLocaleString()}
                    </div>
                    {req.notes && (
                      <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#cbd5e0' }}>
                        📝 备注: {req.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {req.proof_url && (
                      <button
                        onClick={() => setShowProofModal(req.proof_url!)}
                        style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer' }}
                      >
                        🖼️ 查看凭证
                      </button>
                    )}
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: style.background,
                      color: style.color,
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      {style.label}
                    </div>
                    
                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleApprove(req)}
                          style={{ padding: '10px 20px', borderRadius: '8px', background: '#38a169', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✅ 通过
                        </button>
                        <button
                          onClick={() => handleReject(req)}
                          style={{ padding: '10px 20px', borderRadius: '8px', background: '#e53e3e', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ❌ 拒绝
                        </button>
                      </div>
                    )}
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
