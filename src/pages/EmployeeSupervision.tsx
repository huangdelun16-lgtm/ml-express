import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditLogService, AuditLog, adminAccountService, AdminAccount } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';

const EmployeeSupervision: React.FC = () => {
  const navigate = useNavigate();
const [logs, setLogs] = useState<AuditLog[]>([]);
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 筛选条件
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  
  // 分页状态 - 优化：减少每页显示数量，提升性能
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 100; // 从500减少到100
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [logsData, accountsData] = await Promise.all([
      auditLogService.getAllLogs(1000),
      adminAccountService.getAllAccounts()
    ]);
    setLogs(logsData);
    setAccounts(accountsData);
    setLoading(false);
  };

  // 筛选日志
  const filteredLogs = logs.filter(log => {
    if (filterUser !== 'all' && log.user_id !== filterUser) return false;
    if (filterModule !== 'all' && log.module !== filterModule) return false;
    if (filterAction !== 'all' && log.action_type !== filterAction) return false;
    if (searchText && !log.action_description.toLowerCase().includes(searchText.toLowerCase())) return false;
    
    // 日期筛选
    if (filterDate !== 'all') {
      if (!log.created_at) return false; // 如果没有创建时间，则过滤掉
      const logDate = new Date(log.created_at);
      const now = new Date();
      
      if (filterDate === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < today) return false;
      } else if (filterDate === 'yesterday') {
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < yesterday || logDate >= today) return false;
      } else if (filterDate === 'last7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (logDate < sevenDaysAgo) return false;
      }
    }
    
    return true;
  });
  
  // 分页计算
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // 当筛选条件改变时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [filterUser, filterModule, filterAction, filterDate, searchText]);

  // 获取操作类型的中文名称
  const getActionTypeName = (type: string) => {
    const map: Record<string, string> = {
      'create': '创建',
      'update': '更新',
      'delete': '删除',
      'login': '登录',
      'logout': '登出',
      'view': '查看',
      'export': '导出'
    };
    return map[type] || type;
  };

  // 获取模块的中文名称
  const getModuleName = (module: string) => {
    const map: Record<string, string> = {
      'packages': '包裹管理',
      'users': '用户管理',
      'couriers': '快递员管理',
      'finance': '财务管理',
      'settings': '系统设置',
      'accounts': '账号管理',
      'system': '系统',
      'delivery_stores': '商家/店铺',
      'delivery_alerts': '配送警报',
    };
    return map[module] || module;
  };

  // 获取操作类型的颜色
  const getActionColor = (type: string) => {
    const map: Record<string, string> = {
      'create': 'rgba(72, 187, 120, 0.3)',
      'update': 'rgba(66, 153, 225, 0.3)',
      'delete': 'rgba(245, 101, 101, 0.3)',
      'login': 'rgba(139, 92, 246, 0.3)',
      'logout': 'rgba(160, 174, 192, 0.3)',
      'view': 'rgba(237, 137, 54, 0.3)',
      'export': 'rgba(236, 201, 75, 0.3)'
    };
    return map[type] || 'rgba(255, 255, 255, 0.2)';
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(15, 32, 60, 0.55)',
    color: 'white',
    fontSize: '0.9rem',
    outline: 'none'
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        padding: isMobile ? '12px' : '20px',
        fontFamily: 'Segoe UI, Arial, sans-serif'
      }}
    >
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          color: 'white'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700 }}>📜 操作审计日志</h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.85 }}>查看后台关键操作记录（登录、财务、包裹、配送警报等），用于内控与追溯</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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
            ← 控制台
          </button>
          <button
            onClick={() => navigate('/admin/settings')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            ← 返回系统设置
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            🔄 刷新数据
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: isMobile ? '12px' : '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white'
        }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>总操作数</div>
          <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>{filteredLogs.length}</div>
        </div>
        <div style={{
          background: 'rgba(72, 187, 120, 0.2)',
          borderRadius: '12px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(72, 187, 120, 0.3)',
          color: 'white'
        }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>创建操作</div>
          <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
            {filteredLogs.filter(l => l.action_type === 'create').length}
          </div>
        </div>
        <div style={{
          background: 'rgba(66, 153, 225, 0.2)',
          borderRadius: '12px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(66, 153, 225, 0.3)',
          color: 'white'
        }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>更新操作</div>
          <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
            {filteredLogs.filter(l => l.action_type === 'update').length}
          </div>
        </div>
        <div style={{
          background: 'rgba(245, 101, 101, 0.2)',
          borderRadius: '12px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(245, 101, 101, 0.3)',
          color: 'white'
        }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>删除操作</div>
          <div style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 'bold' }}>
            {filteredLogs.filter(l => l.action_type === 'delete').length}
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '20px',
          color: 'white'
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>筛选条件</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', opacity: 0.9 }}>员工</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              style={inputStyle}
            >
              <option value="all" style={{ color: '#000' }}>全部员工</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.username} style={{ color: '#000' }}>
                  {acc.employee_name} ({acc.username})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', opacity: 0.9 }}>模块</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              style={inputStyle}
            >
              <option value="all" style={{ color: '#000' }}>全部模块</option>
              <option value="packages" style={{ color: '#000' }}>包裹管理</option>
              <option value="users" style={{ color: '#000' }}>用户管理</option>
              <option value="couriers" style={{ color: '#000' }}>快递员管理</option>
              <option value="finance" style={{ color: '#000' }}>财务管理</option>
              <option value="settings" style={{ color: '#000' }}>系统设置</option>
              <option value="accounts" style={{ color: '#000' }}>账号管理</option>
              <option value="system" style={{ color: '#000' }}>系统</option>
              <option value="delivery_stores" style={{ color: '#000' }}>商家/店铺</option>
              <option value="delivery_alerts" style={{ color: '#000' }}>配送警报</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', opacity: 0.9 }}>操作类型</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={inputStyle}
            >
              <option value="all" style={{ color: '#000' }}>全部类型</option>
              <option value="create" style={{ color: '#000' }}>创建</option>
              <option value="update" style={{ color: '#000' }}>更新</option>
              <option value="delete" style={{ color: '#000' }}>删除</option>
              <option value="login" style={{ color: '#000' }}>登录</option>
              <option value="logout" style={{ color: '#000' }}>登出</option>
              <option value="view" style={{ color: '#000' }}>查看</option>
              <option value="export" style={{ color: '#000' }}>导出</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', opacity: 0.9 }}>📅 日期筛选</label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                ...inputStyle,
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
                borderColor: 'rgba(59, 130, 246, 0.4)',
                fontWeight: '500'
              }}
            >
              <option value="all" style={{ color: '#000' }}>全部日期</option>
              <option value="today" style={{ color: '#000' }}>☀️ 今天</option>
              <option value="yesterday" style={{ color: '#000' }}>🌙 昨天</option>
              <option value="last7days" style={{ color: '#000' }}>📊 最近7天</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', opacity: 0.9 }}>搜索</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索操作描述..."
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* 日志列表 */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white'
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          操作日志记录 
          <span style={{ fontSize: '0.9rem', opacity: 0.7, marginLeft: '12px' }}>
            （共 {filteredLogs.length} 条记录）
          </span>
        </h2>
        
        {loading ? (
          <p style={{ opacity: 0.7 }}>加载中...</p>
        ) : filteredLogs.length === 0 ? (
          <p style={{ opacity: 0.7, textAlign: 'center', padding: '40px 0' }}>暂无符合条件的日志记录</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>时间</th>
                  <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>员工</th>
                  <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>操作类型</th>
                  <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>模块</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>操作描述</th>
                  <th style={{ padding: '12px', textAlign: 'left', whiteSpace: 'nowrap' }}>目标对象</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '12px', fontSize: '0.85rem', opacity: 0.8, whiteSpace: 'nowrap' }}>
                      {log.action_time ? new Date(log.action_time).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : '-'}
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{log.user_name}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{log.user_id}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          background: getActionColor(log.action_type),
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {getActionTypeName(log.action_type)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      {getModuleName(log.module)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                      {log.action_description}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', opacity: 0.8 }}>
                      {log.target_name && (
                        <div>
                          <div style={{ fontWeight: 500 }}>{log.target_name}</div>
                          {log.target_id && (
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>ID: {log.target_id}</div>
                          )}
                        </div>
                      )}
                      {!log.target_name && log.target_id && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>ID: {log.target_id}</div>
                      )}
                      {!log.target_name && !log.target_id && '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeSupervision;
