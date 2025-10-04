import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeService, FinanceRecord, auditLogService } from '../services/supabase';

type TabKey = 'overview' | 'records' | 'analytics';
type FilterStatus = 'all' | FinanceRecord['status'];
type FilterType = 'all' | FinanceRecord['record_type'];

interface FinanceForm {
  id?: string;
  record_type: FinanceRecord['record_type'];
  category: string;
  order_id: string;
  courier_id: string;
  amount: string;
  currency: string;
  status: FinanceRecord['status'];
  payment_method: string;
  reference: string;
  record_date: string;
  notes: string;
}

const defaultForm: FinanceForm = {
  record_type: 'income',
  category: '同城配送',
  order_id: '',
  courier_id: '',
  amount: '',
  currency: 'MMK',
  status: 'pending',
  payment_method: 'cash',
  reference: '',
  record_date: new Date().toISOString().slice(0, 10),
  notes: ''
};

const currencyOptions = ['MMK', 'USD', 'THB'];
const paymentOptions = [
  { value: 'cash', label: '现金' },
  { value: 'kbz_pay', label: 'KBZ Pay' },
  { value: 'wave_pay', label: 'Wave Pay' },
  { value: 'aya_pay', label: 'AYA Pay' },
  { value: 'bank_transfer', label: '银行转账' }
];

const categoryOptions = [
  '同城配送',
  '次日配送',
  '快递员佣金',
  '员工工资',
  '运营支出',
  '车辆维护',
  '营销推广',
  '客户退款',
  '其他收入',
  '其他支出'
];

const statusColors: Record<FinanceRecord['status'], string> = {
  pending: '#f39c12',
  completed: '#27ae60',
  cancelled: '#e74c3c'
};

const typeColors: Record<FinanceRecord['record_type'], string> = {
  income: '#2ecc71',
  expense: '#e74c3c'
};

const FinanceManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().slice(0, 10),
      end: lastDay.toISOString().slice(0, 10)
    };
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [formData, setFormData] = useState<FinanceForm>(defaultForm);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [records]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await financeService.getAllRecords();
      setRecords(data);
    } catch (error) {
      console.error('加载财务数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const totalIncome = records
      .filter((record) => record.record_type === 'income' && record.status === 'completed')
      .reduce((sum, record) => sum + (record.amount || 0), 0);
    const totalExpense = records
      .filter((record) => record.record_type === 'expense' && record.status === 'completed')
      .reduce((sum, record) => sum + (record.amount || 0), 0);
    const pendingPayments = records
      .filter((record) => record.status === 'pending')
      .reduce((sum, record) => sum + (record.amount || 0), 0);

    setSummary({
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      pendingPayments
    });
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesSearch =
        record.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.courier_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.reference?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
      const matchesType = filterType === 'all' || record.record_type === filterType;

      const withinDateRange = (() => {
        if (!dateRange.start && !dateRange.end) return true;
        const date = new Date(record.record_date);
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end) : null;

        if (start && date < start) return false;
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (date > end) return false;
        }
        return true;
      })();

      return matchesSearch && matchesStatus && matchesType && withinDateRange;
    });
  }, [records, searchTerm, filterStatus, filterType, dateRange]);

  const resetForm = () => {
    setFormData({ 
      ...defaultForm,
      record_date: new Date().toISOString().slice(0, 10) // 确保日期始终是今天
    });
    setEditingRecord(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number.isNaN(Number(formData.amount))) {
      alert('请填写有效的金额');
      return;
    }

    setIsProcessing(true);

    const payload: Omit<FinanceRecord, 'created_at' | 'updated_at'> = {
      id: editingRecord?.id ?? `FIN${Date.now()}`,
      record_type: formData.record_type,
      category: formData.category,
      order_id: formData.order_id,
      courier_id: formData.courier_id,
      amount: Number(formData.amount),
      currency: formData.currency,
      status: formData.status,
      payment_method: formData.payment_method,
      reference: formData.reference || undefined,
      record_date: formData.record_date,
      notes: formData.notes || undefined
    };

    try {
      let success = false;
      const currentUser = localStorage.getItem('currentUser') || 'unknown';
      const currentUserName = localStorage.getItem('currentUserName') || '未知用户';
      
      if (editingRecord) {
        success = await financeService.updateRecord(editingRecord.id, payload);
        
        // 记录审计日志 - 更新
        if (success) {
          await auditLogService.log({
            user_id: currentUser,
            user_name: currentUserName,
            action_type: 'update',
            module: 'finance',
            target_id: editingRecord.id,
            target_name: `财务记录 ${editingRecord.id}`,
            action_description: `更新财务记录，类型：${payload.record_type === 'income' ? '收入' : '支出'}，分类：${payload.category}，金额：${payload.amount} ${payload.currency}`,
            old_value: JSON.stringify(editingRecord),
            new_value: JSON.stringify(payload)
          });
        }
      } else {
        const result = await financeService.createRecord(payload);
        success = Boolean(result);
        
        // 记录审计日志 - 创建
        if (success) {
          await auditLogService.log({
            user_id: currentUser,
            user_name: currentUserName,
            action_type: 'create',
            module: 'finance',
            target_id: payload.id,
            target_name: `财务记录 ${payload.id}`,
            action_description: `创建财务记录，类型：${payload.record_type === 'income' ? '收入' : '支出'}，分类：${payload.category}，金额：${payload.amount} ${payload.currency}`,
            new_value: JSON.stringify(payload)
          });
        }
      }

      if (success) {
        await loadRecords();
        resetForm();
        setShowForm(false);
      } else {
        alert('保存失败，请检查日志');
      }
    } catch (error) {
      console.error('保存财务记录失败:', error);
      alert('保存失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditRecord = (record: FinanceRecord) => {
    setEditingRecord(record);
    setFormData({
      id: record.id,
      record_type: record.record_type,
      category: record.category,
      order_id: record.order_id,
      courier_id: record.courier_id,
      amount: String(record.amount),
      currency: record.currency || 'MMK',
      status: record.status,
      payment_method: record.payment_method,
      reference: record.reference || '',
      record_date: record.record_date,
      notes: record.notes || ''
    });
    setShowForm(true);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('确定要删除这条财务记录吗？')) return;

    // 获取要删除的记录信息（用于审计日志）
    const recordToDelete = records.find(r => r.id === id);

    try {
      const success = await financeService.deleteRecord(id);
      if (success) {
        // 记录审计日志
        const currentUser = localStorage.getItem('currentUser') || 'unknown';
        const currentUserName = localStorage.getItem('currentUserName') || '未知用户';
        
        await auditLogService.log({
          user_id: currentUser,
          user_name: currentUserName,
          action_type: 'delete',
          module: 'finance',
          target_id: id,
          target_name: `财务记录 ${id}`,
          action_description: `删除财务记录，类型：${recordToDelete?.record_type === 'income' ? '收入' : '支出'}，分类：${recordToDelete?.category || '未知'}，金额：${recordToDelete?.amount || 0} ${recordToDelete?.currency || 'MMK'}`,
          old_value: JSON.stringify(recordToDelete)
        });
        
        await loadRecords();
      } else {
        alert('删除失败，请检查日志');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请稍后重试');
    }
  };

  const renderSummaryCard = (title: string, value: number, description: string, color: string) => (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 10px 30px rgba(10, 31, 68, 0.35)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '120px',
          height: '120px',
          background: `${color}33`,
          borderRadius: '50%',
          filter: 'blur(0px)'
        }}
      />
      <h3 style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.1rem', marginBottom: '12px' }}>{title}</h3>
      <div style={{ color, fontSize: '2rem', fontWeight: 700, letterSpacing: '1px', marginBottom: '8px' }}>
        {value.toLocaleString()} MMK
      </div>
      <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.9rem', margin: 0 }}>{description}</p>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #091540 0%, #1a365d 35%, #2c5282 70%, #3a77ad 100%)',
        padding: '24px',
        fontFamily: 'Segoe UI, sans-serif'
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          color: 'white',
          position: 'relative'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            gap: '16px'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2.4rem',
                margin: 0,
                letterSpacing: '1px',
                textShadow: '0 8px 20px rgba(3, 27, 78, 0.55)'
              }}
            >
              💰 财务管理
            </h1>
            <p style={{ margin: '8px 0 0 0', color: 'rgba(255, 255, 255, 0.75)' }}>
              管理收入、支出、账务流程，以及快递员佣金结算
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ← 返回仪表板
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}
        >
          {(['overview', 'records', 'analytics'] as TabKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                background: activeTab === key ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.12)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s ease'
              }}
            >
              {key === 'overview' && '📊 财务总览'}
              {key === 'records' && '📑 收支记录'}
              {key === 'analytics' && '📈 数据分析'}
            </button>
          ))}
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              setActiveTab('records');
            }}
            style={{
              marginLeft: 'auto',
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: '#05223b',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 12px 25px rgba(79, 172, 254, 0.35)'
            }}
          >
            + 添加记录
          </button>
        </div>

        {activeTab === 'overview' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '18px'
            }}
          >
            {renderSummaryCard('总收入', summary.totalIncome, '已完成的所有收入记录总和', '#4cd137')}
            {renderSummaryCard('总支出', summary.totalExpense, '已完成的所有支出记录总和', '#ff7979')}
            {renderSummaryCard('净利润', summary.netProfit, '收入减去支出的净值', summary.netProfit >= 0 ? '#00cec9' : '#ff7675')}
            {renderSummaryCard('待处理金额', summary.pendingPayments, '尚未完成的收支记录金额', '#fbc531')}
          </div>
        )}

        {activeTab === 'records' && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 12px 35px rgba(7, 23, 55, 0.45)'
            }}
          >
            {/* Filters */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}
            >
              <input
                placeholder="搜索订单/快递员/类别"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.18)',
                  color: 'white'
                }}
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background: 'rgba(7, 23, 53, 0.65)',
                  color: 'white'
                }}
              >
                <option value="all">所有类型</option>
                <option value="income">收入</option>
                <option value="expense">支出</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background: 'rgba(7, 23, 53, 0.65)',
                  color: 'white'
                }}
              >
                <option value="all">所有状态</option>
                <option value="pending">待处理</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.18)',
                    color: 'white'
                  }}
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.18)',
                    color: 'white'
                  }}
                />
              </div>
            </div>

            {/* Form */}
            {showForm && (
              <div
                style={{
                  marginBottom: '24px',
                  padding: '24px',
                  background: 'rgba(8, 27, 48, 0.72)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  position: 'relative'
                }}
              >
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
                <h3 style={{ marginTop: 0, color: 'white' }}>{editingRecord ? '编辑财务记录' : '新增财务记录'}</h3>
                <form onSubmit={handleCreateOrUpdate}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        收支类型
                      </label>
                      <select
                        value={formData.record_type}
                        onChange={(e) => setFormData((prev) => ({ ...prev, record_type: e.target.value as FinanceRecord['record_type'] }))}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          background: 'rgba(7, 23, 53, 0.65)',
                          color: 'white'
                        }}
                      >
                        <option value="income">收入</option>
                        <option value="expense">支出</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        分类
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          background: 'rgba(7, 23, 53, 0.65)',
                          color: 'white'
                        }}
                      >
                        {categoryOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        订单编号 (可选)
                      </label>
                      <input
                        value={formData.order_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, order_id: e.target.value }))}
                        placeholder="如：MDY20250928121501"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: 'white'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        快递员编号 (可选)
                      </label>
                      <input
                        value={formData.courier_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, courier_id: e.target.value }))}
                        placeholder="如：COU001"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: 'white'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        金额
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                        required
                        min="0"
                        step="0.01"
                        placeholder="如：5000"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: 'white'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        币种
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          background: 'rgba(7, 23, 53, 0.65)',
                          color: 'white'
                        }}
                      >
                        {currencyOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        状态
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as FinanceRecord['status'] }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          background: 'rgba(7, 23, 53, 0.65)',
                          color: 'white'
                        }}
                      >
                        <option value="pending">待处理</option>
                        <option value="completed">已完成</option>
                        <option value="cancelled">已取消</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        付款方式
                      </label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          background: 'rgba(7, 23, 53, 0.65)',
                          color: 'white'
                        }}
                      >
                        {paymentOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        参考号 (可选)
                      </label>
                      <input
                        value={formData.reference}
                        onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
                        placeholder="银行单号/扫码凭证"
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: 'white'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        记录日期
                      </label>
                      <input
                        type="date"
                        value={formData.record_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, record_date: e.target.value }))}
                        required
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'rgba(255, 255, 255, 0.18)',
                          color: 'white'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      备注
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.18)',
                        color: 'white'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      style={{
                        padding: '12px 28px',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                        color: '#031937',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 12px 25px rgba(0, 210, 255, 0.35)',
                        opacity: isProcessing ? 0.7 : 1
                      }}
                    >
                      {isProcessing ? '保存中...' : editingRecord ? '保存更改' : '创建记录'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      style={{
                        padding: '12px 28px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.12)',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Records Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                <thead>
                  <tr style={{ background: 'rgba(8, 32, 64, 0.6)' }}>
                    {['记录ID', '类型', '分类', '金额', '币种', '状态', '订单/快递员', '日期', '备注', '操作'].map((header) => (
                      <th key={header} style={{ padding: '14px', textAlign: 'left', fontWeight: 600, fontSize: '0.95rem' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>
                        加载中...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>
                        暂无财务记录
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)' }}>
                        <td style={{ padding: '14px' }}>{record.id}</td>
                        <td style={{ padding: '14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '999px',
                              background: `${typeColors[record.record_type]}22`,
                              color: typeColors[record.record_type],
                              fontWeight: 600
                            }}
                          >
                            {record.record_type === 'income' ? '收入' : '支出'}
                          </span>
                        </td>
                        <td style={{ padding: '14px' }}>{record.category}</td>
                        <td style={{ padding: '14px', color: record.record_type === 'income' ? '#4cd137' : '#ff7979' }}>
                          {record.amount?.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px' }}>{record.currency}</td>
                        <td style={{ padding: '14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '999px',
                              background: `${statusColors[record.status]}22`,
                              color: statusColors[record.status],
                              fontWeight: 600
                            }}
                          >
                            {record.status === 'pending' ? '待处理' : record.status === 'completed' ? '已完成' : '已取消'}
                          </span>
                        </td>
                        <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                            订单: {record.order_id || '—'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                            快递员: {record.courier_id || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '14px' }}>{record.record_date}</td>
                        <td style={{ padding: '14px', maxWidth: '200px' }}>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)' }}>{record.notes || '—'}</div>
                          {record.reference && (
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>参考: {record.reference}</div>
                          )}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleEditRecord(record)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'rgba(76, 209, 55, 0.2)',
                                color: '#4cd137',
                                cursor: 'pointer'
                              }}
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'rgba(255, 71, 87, 0.2)',
                                color: '#ff4757',
                                cursor: 'pointer'
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 12px 35px rgba(7, 23, 55, 0.45)'
            }}
          >
            <h3 style={{ marginTop: 0, color: 'white' }}>趋势分析 (敬请期待)</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              即将上线：收入/支出趋势图、快递员佣金统计、成本结构分析等高级分析模块。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceManagement;

