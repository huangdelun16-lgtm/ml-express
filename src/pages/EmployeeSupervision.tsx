import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditLogService, AuditLog, adminAccountService, AdminAccount } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/adminAuditLogs.css';

const ACTION_TYPE_LABELS: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  login: '登录',
  logout: '登出',
  view: '查看',
  export: '导出',
};

const MODULE_LABELS: Record<string, string> = {
  packages: '包裹管理',
  users: '用户管理',
  couriers: '快递员管理',
  finance: '财务管理',
  settings: '系统设置',
  accounts: '账号管理',
  system: '系统',
  delivery_stores: '商家/店铺',
  delivery_alerts: '配送警报',
  recharges: '充值管理',
};

function downloadCsv(filename: string, text: string) {
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatLogTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function prettyJsonBlock(raw?: string | null): string {
  if (!raw?.trim()) return '—';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function logMatchesDateFilter(log: AuditLog, filterDate: string): boolean {
  if (filterDate === 'all') return true;
  const iso = log.action_time || log.created_at;
  if (!iso) return false;
  const logDate = new Date(iso);
  const now = new Date();
  if (filterDate === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return logDate >= today;
  }
  if (filterDate === 'yesterday') {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return logDate >= yesterday && logDate < today;
  }
  if (filterDate === 'last7days') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= sevenDaysAgo;
  }
  if (filterDate === 'last30days') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return logDate >= thirtyDaysAgo;
  }
  return true;
}

const EmployeeSupervision: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const isEn = language === 'en';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [filterUser, setFilterUser] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterDate, setFilterDate] = useState('last7days');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, accountsData] = await Promise.all([
        auditLogService.getAllLogs(5000),
        adminAccountService.getAllAccounts(),
      ]);
      setLogs(logsData);
      setAccounts(accountsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const moduleOptions = useMemo(() => {
    const fromData = new Set(logs.map((l) => l.module).filter(Boolean));
    return Array.from(fromData).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return logs.filter((log) => {
      if (filterUser !== 'all' && log.user_id !== filterUser) return false;
      if (filterModule !== 'all' && log.module !== filterModule) return false;
      if (filterAction !== 'all' && log.action_type !== filterAction) return false;
      if (!logMatchesDateFilter(log, filterDate)) return false;
      if (!q) return true;
      const haystack = [
        log.action_description,
        log.user_name,
        log.user_id,
        log.target_id,
        log.target_name,
        log.module,
        log.action_type,
        log.ip_address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [logs, filterUser, filterModule, filterAction, filterDate, searchText]);

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return {
      total: filteredLogs.length,
      today: filteredLogs.filter((l) => {
        const iso = l.action_time || l.created_at;
        return iso && new Date(iso) >= todayStart;
      }).length,
      create: filteredLogs.filter((l) => l.action_type === 'create').length,
      update: filteredLogs.filter((l) => l.action_type === 'update').length,
      delete: filteredLogs.filter((l) => l.action_type === 'delete').length,
      login: filteredLogs.filter((l) => l.action_type === 'login').length,
    };
  }, [filteredLogs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const currentLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterUser, filterModule, filterAction, filterDate, searchText, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const getActionLabel = (type: string) =>
    isEn ? type : ACTION_TYPE_LABELS[type] || type;

  const getModuleLabel = (module: string) =>
    isEn ? module : MODULE_LABELS[module] || module;

  const badgeClass = (type: string) =>
    `audit-badge audit-badge--${ACTION_TYPE_LABELS[type] ? type : 'default'}`;

  const clearFilters = () => {
    setFilterUser('all');
    setFilterModule('all');
    setFilterAction('all');
    setFilterDate('last7days');
    setSearchText('');
  };

  const exportFiltered = () => {
    const header = [
      '时间',
      '员工',
      '账号',
      '操作类型',
      '模块',
      '描述',
      '目标ID',
      '目标名称',
      'IP',
    ];
    const rows = filteredLogs.map((log) =>
      [
        formatLogTime(log.action_time || log.created_at),
        log.user_name,
        log.user_id,
        getActionLabel(log.action_type),
        getModuleLabel(log.module),
        log.action_description,
        log.target_id || '',
        log.target_name || '',
        log.ip_address || '',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`audit-logs-${stamp}.csv`, [header.join(','), ...rows].join('\n'));
  };

  const pageStart = filteredLogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const pageEnd = Math.min(currentPage * itemsPerPage, filteredLogs.length);

  const renderLogRow = (log: AuditLog) => (
    <tr key={log.id} onClick={() => setSelectedLog(log)}>
      <td className="audit-meta">{formatLogTime(log.action_time || log.created_at)}</td>
      <td>
        <div style={{ fontWeight: 700 }}>{log.user_name}</div>
        <div className="audit-meta">{log.user_id}</div>
      </td>
      <td>
        <span className={badgeClass(log.action_type)}>{getActionLabel(log.action_type)}</span>
      </td>
      <td>{getModuleLabel(log.module)}</td>
      <td className="audit-desc">{log.action_description}</td>
      <td>
        {log.target_name && <div style={{ fontWeight: 600 }}>{log.target_name}</div>}
        {log.target_id && <div className="audit-meta">ID: {log.target_id}</div>}
        {!log.target_name && !log.target_id && '—'}
      </td>
    </tr>
  );

  const renderLogCard = (log: AuditLog) => (
    <article key={log.id} className="audit-card" onClick={() => setSelectedLog(log)}>
      <div className="audit-card__top">
        <span className={badgeClass(log.action_type)}>{getActionLabel(log.action_type)}</span>
        <span className="audit-meta">{getModuleLabel(log.module)}</span>
        <span className="audit-card__time">{formatLogTime(log.action_time || log.created_at)}</span>
      </div>
      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{log.user_name}</div>
      <div className="audit-desc">{log.action_description}</div>
      {(log.target_name || log.target_id) && (
        <div className="audit-meta" style={{ marginTop: '0.35rem' }}>
          {log.target_name || log.target_id}
        </div>
      )}
    </article>
  );

  return (
    <div className="audit-page">
      <header className="audit-toolbar">
        <div>
          <h1 className="audit-toolbar__title">
            {isEn ? 'Operation audit log' : '📜 操作审计日志'}
          </h1>
          <p className="audit-toolbar__sub">
            {isEn
              ? 'Track admin actions: login, finance, packages, alerts, and account changes.'
              : '查看后台关键操作记录（登录、财务、包裹、配送警报、账号变更等），用于内控与追溯。点击任意记录可查看变更详情。'}
          </p>
        </div>
        <div className="audit-toolbar__actions">
          <button type="button" className="audit-btn audit-btn--ghost" onClick={() => navigate('/admin/dashboard')}>
            ← {isEn ? 'Dashboard' : '控制台'}
          </button>
          <button type="button" className="audit-btn audit-btn--ghost" onClick={() => navigate('/admin/settings')}>
            {isEn ? 'Settings' : '系统设置'}
          </button>
          <button
            type="button"
            className="audit-btn"
            onClick={exportFiltered}
            disabled={loading || filteredLogs.length === 0}
          >
            ⬇ {isEn ? 'Export CSV' : '导出 CSV'}
          </button>
          <button type="button" className="audit-btn audit-btn--primary" onClick={() => void loadData()} disabled={loading}>
            {loading ? (isEn ? 'Loading…' : '加载中…') : isEn ? 'Refresh' : '🔄 刷新'}
          </button>
        </div>
      </header>

      <section className="audit-stats">
        <div className="audit-stat audit-stat--total">
          <div className="audit-stat__label">{isEn ? 'Filtered' : '筛选结果'}</div>
          <div className="audit-stat__value">{stats.total.toLocaleString()}</div>
        </div>
        <div className="audit-stat audit-stat--today">
          <div className="audit-stat__label">{isEn ? 'Today' : '今日'}</div>
          <div className="audit-stat__value">{stats.today.toLocaleString()}</div>
        </div>
        <div className="audit-stat audit-stat--create">
          <div className="audit-stat__label">{isEn ? 'Create' : '创建'}</div>
          <div className="audit-stat__value">{stats.create.toLocaleString()}</div>
        </div>
        <div className="audit-stat audit-stat--update">
          <div className="audit-stat__label">{isEn ? 'Update' : '更新'}</div>
          <div className="audit-stat__value">{stats.update.toLocaleString()}</div>
        </div>
        <div className="audit-stat audit-stat--delete">
          <div className="audit-stat__label">{isEn ? 'Delete' : '删除'}</div>
          <div className="audit-stat__value">{stats.delete.toLocaleString()}</div>
        </div>
        <div className="audit-stat audit-stat--login">
          <div className="audit-stat__label">{isEn ? 'Login' : '登录'}</div>
          <div className="audit-stat__value">{stats.login.toLocaleString()}</div>
        </div>
      </section>

      <section className="audit-panel">
        <div className="audit-panel__head">
          <h2 className="audit-panel__title">{isEn ? 'Filters' : '筛选条件'}</h2>
          <button type="button" className="audit-btn audit-btn--ghost" onClick={clearFilters}>
            {isEn ? 'Clear' : '清空筛选'}
          </button>
        </div>
        <div className="audit-filters">
          <div className="audit-field">
            <label>{isEn ? 'Staff' : '员工'}</label>
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              <option value="all">{isEn ? 'All staff' : '全部员工'}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.username}>
                  {acc.employee_name} ({acc.username})
                </option>
              ))}
            </select>
          </div>
          <div className="audit-field">
            <label>{isEn ? 'Module' : '模块'}</label>
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
              <option value="all">{isEn ? 'All modules' : '全部模块'}</option>
              {moduleOptions.map((mod) => (
                <option key={mod} value={mod}>
                  {getModuleLabel(mod)}
                </option>
              ))}
            </select>
          </div>
          <div className="audit-field">
            <label>{isEn ? 'Action' : '操作类型'}</label>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              <option value="all">{isEn ? 'All types' : '全部类型'}</option>
              {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {isEn ? key : label}
                </option>
              ))}
            </select>
          </div>
          <div className="audit-field">
            <label>{isEn ? 'Date' : '日期'}</label>
            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
              <option value="all">{isEn ? 'All dates' : '全部日期'}</option>
              <option value="today">{isEn ? 'Today' : '今天'}</option>
              <option value="yesterday">{isEn ? 'Yesterday' : '昨天'}</option>
              <option value="last7days">{isEn ? 'Last 7 days' : '最近 7 天'}</option>
              <option value="last30days">{isEn ? 'Last 30 days' : '最近 30 天'}</option>
            </select>
          </div>
          <div className="audit-field">
            <label>{isEn ? 'Search' : '搜索'}</label>
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={isEn ? 'Description, target ID, user, IP…' : '描述、目标 ID、员工、IP…'}
            />
          </div>
        </div>
        <div className="audit-chips">
          {(['all', 'create', 'update', 'delete', 'login'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={`audit-chip${filterAction === type ? ' audit-chip--active' : ''}`}
              onClick={() => setFilterAction(type)}
            >
              {type === 'all' ? (isEn ? 'All' : '全部') : getActionLabel(type)}
            </button>
          ))}
        </div>
      </section>

      <section className="audit-panel">
        <div className="audit-panel__head">
          <h2 className="audit-panel__title">
            {isEn ? 'Log entries' : '操作日志记录'}
            <span className="audit-meta" style={{ marginLeft: '0.5rem', fontWeight: 600 }}>
              ({filteredLogs.length.toLocaleString()} {isEn ? 'rows' : '条'})
            </span>
          </h2>
          <div className="audit-field" style={{ width: isMobile ? '100%' : '140px' }}>
            <label>{isEn ? 'Per page' : '每页条数'}</label>
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="audit-empty">{isEn ? 'Loading…' : '加载中…'}</div>
        ) : filteredLogs.length === 0 ? (
          <div className="audit-empty">{isEn ? 'No logs match your filters.' : '暂无符合条件的日志记录'}</div>
        ) : (
          <>
            <div className="audit-table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>{isEn ? 'Time' : '时间'}</th>
                    <th>{isEn ? 'Staff' : '员工'}</th>
                    <th>{isEn ? 'Action' : '操作'}</th>
                    <th>{isEn ? 'Module' : '模块'}</th>
                    <th>{isEn ? 'Description' : '操作描述'}</th>
                    <th>{isEn ? 'Target' : '目标对象'}</th>
                  </tr>
                </thead>
                <tbody>{currentLogs.map(renderLogRow)}</tbody>
              </table>
            </div>
            <div className="audit-cards">{currentLogs.map(renderLogCard)}</div>

            <div className="audit-pagination">
              <div className="audit-pagination__info">
                {isEn
                  ? `Showing ${pageStart}–${pageEnd} of ${filteredLogs.length}`
                  : `第 ${pageStart}–${pageEnd} 条，共 ${filteredLogs.length} 条`}
              </div>
              <div className="audit-pagination__controls">
                <button
                  type="button"
                  className="audit-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  {isEn ? 'Prev' : '上一页'}
                </button>
                <span className="audit-meta" style={{ padding: '0 0.35rem' }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="audit-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  {isEn ? 'Next' : '下一页'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedLog && (
        <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="audit-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="audit-modal__head">
              <div>
                <h3 className="audit-modal__title">{isEn ? 'Audit detail' : '审计详情'}</h3>
                <p className="audit-meta" style={{ margin: '0.35rem 0 0' }}>
                  {selectedLog.action_description}
                </p>
              </div>
              <button type="button" className="audit-btn" onClick={() => setSelectedLog(null)}>
                ✕
              </button>
            </div>
            <div className="audit-modal__body">
              <div className="audit-detail-grid">
                <div className="audit-detail-item">
                  <div className="audit-detail-item__label">{isEn ? 'Time' : '操作时间'}</div>
                  <div className="audit-detail-item__value">
                    {formatLogTime(selectedLog.action_time || selectedLog.created_at)}
                  </div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-item__label">{isEn ? 'Staff' : '操作人'}</div>
                  <div className="audit-detail-item__value">
                    {selectedLog.user_name} ({selectedLog.user_id})
                  </div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-item__label">{isEn ? 'Action' : '操作类型'}</div>
                  <div className="audit-detail-item__value">
                    <span className={badgeClass(selectedLog.action_type)}>
                      {getActionLabel(selectedLog.action_type)}
                    </span>
                  </div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-item__label">{isEn ? 'Module' : '模块'}</div>
                  <div className="audit-detail-item__value">{getModuleLabel(selectedLog.module)}</div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-item__label">{isEn ? 'Target' : '目标对象'}</div>
                  <div className="audit-detail-item__value">
                    {selectedLog.target_name || '—'}
                    {selectedLog.target_id ? (
                      <div className="audit-meta">ID: {selectedLog.target_id}</div>
                    ) : null}
                  </div>
                </div>
                <div className="audit-detail-item">
                  <div className="audit-detail-item__label">IP</div>
                  <div className="audit-detail-item__value">{selectedLog.ip_address || '—'}</div>
                </div>
              </div>

              {(selectedLog.old_value || selectedLog.new_value) && (
                <>
                  {selectedLog.old_value && (
                    <div className="audit-json-block">
                      <div className="audit-json-block__label">{isEn ? 'Before' : '变更前'}</div>
                      <pre className="audit-json">{prettyJsonBlock(selectedLog.old_value)}</pre>
                    </div>
                  )}
                  {selectedLog.new_value && (
                    <div className="audit-json-block">
                      <div className="audit-json-block__label">{isEn ? 'After' : '变更后'}</div>
                      <pre className="audit-json">{prettyJsonBlock(selectedLog.new_value)}</pre>
                    </div>
                  )}
                </>
              )}

              {selectedLog.user_agent && (
                <div className="audit-json-block">
                  <div className="audit-json-block__label">User-Agent</div>
                  <pre className="audit-json" style={{ maxHeight: '120px' }}>
                    {selectedLog.user_agent}
                  </pre>
                </div>
              )}

              {selectedLog.target_id && selectedLog.module === 'packages' && (
                <button
                  type="button"
                  className="audit-btn audit-btn--primary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => navigate('/admin/city-packages', { state: { search: selectedLog.target_id } })}
                >
                  {isEn ? 'Open package' : '查看关联包裹 →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeSupervision;
