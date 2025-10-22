import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeService, FinanceRecord, auditLogService, packageService, Package, courierSalaryService, CourierSalary, CourierSalaryDetail, CourierPaymentRecord, CourierPerformance } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type TabKey = 'overview' | 'records' | 'analytics' | 'package_records' | 'courier_records';
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
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]); // 添加包裹数据状态
  const [loading, setLoading] = useState<boolean>(true);
  const [timePeriod, setTimePeriod] = useState<'7days' | '30days' | '90days' | 'all'>('30days'); // 时间周期状态
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // 工资管理相关状态
  const [courierSalaries, setCourierSalaries] = useState<CourierSalary[]>([]);
  const [salaryFilterStatus, setSalaryFilterStatus] = useState<'all' | CourierSalary['status']>('all');
  const [showSalaryForm, setShowSalaryForm] = useState<boolean>(false);
  const [showSalaryDetail, setShowSalaryDetail] = useState<boolean>(false);
  const [selectedSalary, setSelectedSalary] = useState<CourierSalary | null>(null);
  const [salaryDetails, setSalaryDetails] = useState<CourierSalaryDetail[]>([]);
  const [selectedSalaries, setSelectedSalaries] = useState<number[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'bank_transfer',
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  
  // 多语言翻译
  const t = {
    zh: {
      analysisPeriod: '分析周期',
      last7Days: '最近7天',
      last30Days: '最近30天',
      last90Days: '最近90天',
      all: '全部',
      recentIncome: '收入',
      recentExpense: '支出',
      recentPackages: '包裹',
      recentProfit: '利润',
      dailyAvg: '日均',
      profitMargin: '利润率',
      dataAnalysis: '数据趋势分析',
      income: '收入'
    },
    en: {
      analysisPeriod: 'Analysis Period',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      last90Days: 'Last 90 Days',
      all: 'All',
      recentIncome: 'Income',
      recentExpense: 'Expense',
      recentPackages: 'Packages',
      recentProfit: 'Profit',
      dailyAvg: 'Daily Avg',
      profitMargin: 'Profit Margin',
      dataAnalysis: 'Data Trend Analysis',
      income: 'Income'
    },
    my: {
      analysisPeriod: 'ခွဲခြမ်းစိတ်ဖြာမှုကာလ',
      last7Days: 'နောက်ဆုံး ၇ ရက်',
      last30Days: 'နောက်ဆုံး ၃၀ ရက်',
      last90Days: 'နောက်ဆုံး ၉၀ ရက်',
      all: 'အားလုံး',
      recentIncome: 'ဝင်ငွေ',
      recentExpense: 'အသုံးစရိတ်',
      recentPackages: 'ပစ္စည်းများ',
      recentProfit: 'အမြတ်',
      dailyAvg: 'နေ့စဉ်ပျမ်းမျှ',
      profitMargin: 'အမြတ်နှုန်း',
      dataAnalysis: 'ဒေတာခေတ်ရေးခွဲခြမ်းစိတ်ဖြာခြင်း',
      income: 'ဝင်ငွေ'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    analysisPeriod: '分析周期',
    last7Days: '最近7天',
    last30Days: '最近30天',
    last90Days: '最近90天',
    all: '全部',
    recentIncome: '收入',
    recentExpense: '支出',
    recentPackages: '包裹',
    recentProfit: '利润',
    dailyAvg: '日均',
    profitMargin: '利润率',
    dataAnalysis: '数据趋势分析',
    income: '收入'
  };
  
  // 根据时间周期获取天数
  const getDaysFromPeriod = (period: typeof timePeriod): number | null => {
    switch (period) {
      case '7days': return 7;
      case '30days': return 30;
      case '90days': return 90;
      case 'all': return null;
      default: return 30;
    }
  };
  
  // 根据时间周期筛选数据
  const filterByTimePeriod = <T extends { record_date?: string; created_at?: string; create_time?: string }>(
    data: T[],
    period: typeof timePeriod,
    dateField: 'record_date' | 'created_at' | 'create_time' = 'record_date'
  ): T[] => {
    const days = getDaysFromPeriod(period);
    if (days === null) return data;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return data.filter(item => {
      const dateStr = item[dateField];
      if (!dateStr) {
        // 对于包裹，尝试其他日期字段
        if ('created_at' in item && item.created_at) {
          const date = new Date(item.created_at);
          return date >= cutoffDate;
        }
        if ('create_time' in item && item.create_time) {
          const date = new Date(item.create_time);
          return date >= cutoffDate;
        }
        return false;
      }
      const date = new Date(dateStr);
      return date >= cutoffDate;
    });
  };
  
  // 获取当前周期的显示文本
  const getPeriodLabel = (): string => {
    switch (timePeriod) {
      case '7days': return t.last7Days;
      case '30days': return t.last30Days;
      case '90days': return t.last90Days;
      case 'all': return t.all;
      default: return t.last30Days;
    }
  };
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
    pendingPayments: 0,
    packageIncome: 0, // 添加包裹收入
    packageCount: 0, // 添加包裹数量
    courierKmCost: 0, // 快递员公里费用（仅送货距离）
    totalKm: 0 // 总送货公里数
  });

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    const calculateSummary = () => {
      const totalIncome = records.filter(r => r.record_type === 'income').reduce((sum, record) => sum + (record.amount || 0), 0);
      const totalExpense = records.filter(r => r.record_type === 'expense').reduce((sum, record) => sum + (record.amount || 0), 0);
      const netProfit = totalIncome - totalExpense;
      const pendingPayments = records.filter(r => r.status === 'pending').reduce((sum, record) => sum + (record.amount || 0), 0);
      
      // 计算包裹收入（只统计已送达的包裹）
      const deliveredPackages = packages.filter(pkg => pkg.status === '已送达');
      const packageIncome = deliveredPackages.reduce((sum, pkg) => {
        const price = parseFloat(pkg.price?.replace(/[^\d.]/g, '') || '0');
        return sum + price;
      }, 0);
      const packageCount = deliveredPackages.length;
      
      // 计算快递员公里费用（只统计已送达包裹的送货距离，不包含取件距离）
      const COURIER_KM_RATE = 500; // 每公里500 MMK
      const totalKm = deliveredPackages.reduce((sum, pkg) => {
        // 只计算送货距离，不包含取件距离
        return sum + (pkg.delivery_distance || 0);
      }, 0);
      const courierKmCost = totalKm * COURIER_KM_RATE;
      
      setSummary({
        totalIncome,
        totalExpense,
        netProfit,
        pendingPayments,
        packageIncome,
        packageCount,
        courierKmCost,
        totalKm
      });
    };
    
    calculateSummary();
  }, [records, packages]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      // 同时加载财务记录、包裹数据和工资数据
      const [financeData, packageData, salaryData] = await Promise.all([
        financeService.getAllRecords(),
        packageService.getAllPackages(),
        courierSalaryService.getAllSalaries()
      ]);
      setRecords(financeData);
      setPackages(packageData);
      setCourierSalaries(salaryData);
    } catch (error) {
      console.error('加载财务数据失败:', error);
      // 添加用户友好的错误提示
      window.alert('加载财务数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 生成本月工资
  const generateMonthlySalaries = async () => {
    if (!window.confirm('是否为所有骑手生成本月工资记录？')) return;
    
    setLoading(true);
    try {
      // 获取所有已送达包裹
      const deliveredPackages = packages.filter(pkg => pkg.status === '已送达' && pkg.courier && pkg.courier !== '待分配');
      
      // 按骑手分组
      const courierGroups: Record<string, Package[]> = {};
      deliveredPackages.forEach(pkg => {
        const courierId = pkg.courier;
        if (!courierGroups[courierId]) {
          courierGroups[courierId] = [];
        }
        courierGroups[courierId].push(pkg);
      });
      
      // 结算周期
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      // 为每个骑手生成工资记录
      let successCount = 0;
      for (const [courierId, pkgs] of Object.entries(courierGroups)) {
        // 计算统计数据
        const totalDeliveries = pkgs.length;
        const totalKm = pkgs.reduce((sum, pkg) => sum + (pkg.delivery_distance || 0), 0);
        const relatedPackageIds = pkgs.map(p => p.id); // <-- 新增：收集包裹ID
        
        // 计算各项费用（仅计算送货距离费用，不包含取件距离）
        const COURIER_KM_RATE = 500; // MMK/KM（仅送货距离）
        const DELIVERY_BONUS_RATE = 1000; // MMK/单
        const BASE_SALARY = 200000; // 基本工资 MMK
        
        const kmFee = totalKm * COURIER_KM_RATE; // 仅送货距离费用
        const deliveryBonus = totalDeliveries * DELIVERY_BONUS_RATE;
        const baseSalary = BASE_SALARY;
        
        const grossSalary = baseSalary + kmFee + deliveryBonus;
        const netSalary = grossSalary;
        
        const salary: Omit<CourierSalary, 'id'> = {
          courier_id: courierId,
          courier_name: courierId,
          settlement_period: 'monthly',
          period_start_date: periodStart,
          period_end_date: periodEnd,
          base_salary: baseSalary,
          km_fee: kmFee,
          delivery_bonus: deliveryBonus,
          performance_bonus: 0,
          overtime_pay: 0,
          tip_amount: 0,
          deduction_amount: 0,
          total_deliveries: totalDeliveries,
          total_km: totalKm,
          on_time_deliveries: totalDeliveries,
          late_deliveries: 0,
          gross_salary: grossSalary,
          net_salary: netSalary,
          status: 'pending',
          related_package_ids: relatedPackageIds, // <-- 新增：保存包裹ID
        };
        
        const success = await courierSalaryService.createSalary(salary);
        if (success) successCount++;
      }
      
      window.alert(`成功生成 ${successCount} 条工资记录！`);
      await loadRecords();
    } catch (error) {
      console.error('生成工资失败:', error);
      window.alert('生成工资失败，请重试！');
    } finally {
      setLoading(false);
    }
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
      window.alert('请填写有效的金额');
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
        window.alert('保存失败，请检查日志');
      }
    } catch (error) {
      console.error('保存财务记录失败:', error);
      window.alert('保存失败，请稍后重试');
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
        window.alert('删除失败，请检查日志');
      }
    } catch (error) {
      console.error('删除失败:', error);
      window.alert('删除失败，请稍后重试');
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
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={loadRecords}
              disabled={loading}
              style={{
                background: loading ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.12)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                opacity: loading ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? '🔄 刷新中...' : '🔄 刷新数据'}
            </button>
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
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}
        >
          {(['overview', 'records', 'analytics', 'package_records', 'courier_records'] as TabKey[]).map((key) => (
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
              {key === 'package_records' && '📦 包裹收支记录'}
              {key === 'courier_records' && '🚚 骑手收支记录'}
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
            {renderSummaryCard('包裹收入', summary.packageIncome, `已送达包裹总收入 (${summary.packageCount}个)`, '#6c5ce7')}
            {renderSummaryCard('骑手送货费用', summary.courierKmCost, `总送货距离 ${summary.totalKm.toFixed(2)} KM (500 MMK/KM)`, '#fd79a8')}
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
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '24px', color: 'white', fontSize: '1.8rem' }}>📈 {t.dataAnalysis}</h3>
            
            {/* 时间范围选择 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ color: 'white', fontWeight: '600', fontSize: '1rem' }}>📅 {t.analysisPeriod}：</div>
              {[
                { key: '7days', label: t.last7Days },
                { key: '30days', label: t.last30Days },
                { key: '90days', label: t.last90Days },
                { key: 'all', label: t.all }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setTimePeriod(period.key as typeof timePeriod)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: `2px solid ${timePeriod === period.key ? '#4facfe' : 'rgba(255, 255, 255, 0.3)'}`,
                    background: timePeriod === period.key ? 'rgba(79, 172, 254, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: timePeriod === period.key ? '700' : '500',
                    transition: 'all 0.3s ease',
                    boxShadow: timePeriod === period.key ? '0 4px 15px rgba(79, 172, 254, 0.4)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (timePeriod !== period.key) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                    }
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    if (timePeriod !== period.key) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    }
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* 关键指标卡片 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px',
              marginBottom: '24px'
            }}>
              {(() => {
                // 根据选择的时间周期筛选数据
                const recentRecords = filterByTimePeriod(records, timePeriod, 'record_date');
                const recentPackages = filterByTimePeriod(packages, timePeriod);
                
                // 获取天数用于日均计算
                const days = getDaysFromPeriod(timePeriod) || Math.max(records.length, 1);
                
                const recentIncome = recentRecords.filter(r => r.record_type === 'income').reduce((sum, r) => sum + (r.amount || 0), 0);
                const recentExpense = recentRecords.filter(r => r.record_type === 'expense').reduce((sum, r) => sum + (r.amount || 0), 0);
                const recentPackageIncome = recentPackages.filter(pkg => pkg.status === '已送达').reduce((sum, pkg) => {
                  const price = parseFloat(pkg.price?.replace(/[^\d.]/g, '') || '0');
                  return sum + price;
                }, 0);
                const recentPackageCount = recentPackages.filter(pkg => pkg.status === '已送达').length;
                
                // 计算增长率（与总数据对比）
                const totalIncome = records.filter(r => r.record_type === 'income').reduce((sum, r) => sum + (r.amount || 0), 0);
                const avgDailyIncome = totalIncome / Math.max(records.length, 1);
                const recentAvgDailyIncome = recentIncome / days;
                const incomeGrowth = avgDailyIncome > 0 ? ((recentAvgDailyIncome - avgDailyIncome) / avgDailyIncome * 100) : 0;
                
                return (
                  <>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(46, 213, 115, 0.2) 0%, rgba(46, 213, 115, 0.05) 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid rgba(46, 213, 115, 0.3)',
                      boxShadow: '0 8px 20px rgba(46, 213, 115, 0.2)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '500' }}>
                          💰 {getPeriodLabel()}{t.recentIncome}
                        </div>
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: incomeGrowth >= 0 ? 'rgba(46, 213, 115, 0.3)' : 'rgba(255, 107, 107, 0.3)',
                          color: incomeGrowth >= 0 ? '#2ecc71' : '#ff6b6b',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {incomeGrowth >= 0 ? '↗' : '↘'} {Math.abs(incomeGrowth).toFixed(1)}%
                        </div>
                      </div>
                      <div style={{ color: '#2ecc71', fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                        {recentIncome.toLocaleString()} MMK
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem' }}>
                        {t.dailyAvg}: {(recentIncome / days).toLocaleString()} MMK
                      </div>
                    </div>

                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 107, 107, 0.05) 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      boxShadow: '0 8px 20px rgba(255, 107, 107, 0.2)'
                    }}>
                      <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '500', marginBottom: '12px' }}>
                        💸 {getPeriodLabel()}{t.recentExpense}
                      </div>
                      <div style={{ color: '#ff6b6b', fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                        {recentExpense.toLocaleString()} MMK
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem' }}>
                        {t.dailyAvg}: {(recentExpense / days).toLocaleString()} MMK
                      </div>
                    </div>

                    <div style={{
                      background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.2) 0%, rgba(108, 92, 231, 0.05) 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid rgba(108, 92, 231, 0.3)',
                      boxShadow: '0 8px 20px rgba(108, 92, 231, 0.2)'
                    }}>
                      <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '500', marginBottom: '12px' }}>
                        📦 {getPeriodLabel()}{t.recentPackages}
                      </div>
                      <div style={{ color: '#6c5ce7', fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
                        {recentPackageCount} {language === 'zh' ? '个' : language === 'en' ? '' : 'ခု'}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem' }}>
                        {t.income}: {recentPackageIncome.toLocaleString()} MMK
                      </div>
                    </div>

                    <div style={{
                      background: 'linear-gradient(135deg, rgba(0, 206, 201, 0.2) 0%, rgba(0, 206, 201, 0.05) 100%)',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '1px solid rgba(0, 206, 201, 0.3)',
                      boxShadow: '0 8px 20px rgba(0, 206, 201, 0.2)'
                    }}>
                      <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', fontWeight: '500', marginBottom: '12px' }}>
                        💎 {getPeriodLabel()}{t.recentProfit}
                      </div>
                      <div style={{ 
                        color: recentIncome - recentExpense >= 0 ? '#00cec9' : '#ff6b6b', 
                        fontSize: '2rem', 
                        fontWeight: '700', 
                        marginBottom: '8px' 
                      }}>
                        {(recentIncome - recentExpense).toLocaleString()} MMK
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.85rem' }}>
                        {t.profitMargin}: {recentIncome > 0 ? ((recentIncome - recentExpense) / recentIncome * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 月度趋势分析 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 12px 35px rgba(7, 23, 55, 0.45)'
            }}>
              <h4 style={{ marginTop: 0, color: 'white', marginBottom: '20px', fontSize: '1.3rem' }}>📊 月度收支趋势</h4>
              
              {(() => {
                // 按月份分组统计
                const monthlyData: Record<string, { income: number, expense: number, packageIncome: number, packageCount: number, courierKm: number }> = {};
                
                // 处理财务记录
                records.forEach(record => {
                  const date = new Date(record.record_date);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  
                  if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { income: 0, expense: 0, packageIncome: 0, packageCount: 0, courierKm: 0 };
                  }
                  
                  if (record.record_type === 'income') {
                    monthlyData[monthKey].income += record.amount || 0;
                  } else {
                    monthlyData[monthKey].expense += record.amount || 0;
                  }
                });
                
                // 处理包裹数据
                packages.forEach(pkg => {
                  const dateStr = pkg.created_at || pkg.create_time;
                  if (!dateStr) return;
                  
                  const date = new Date(dateStr);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  
                  if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { income: 0, expense: 0, packageIncome: 0, packageCount: 0, courierKm: 0 };
                  }
                  
                  if (pkg.status === '已送达') {
                    const price = parseFloat(pkg.price?.replace(/[^\d.]/g, '') || '0');
                    monthlyData[monthKey].packageIncome += price;
                    monthlyData[monthKey].packageCount += 1;
                    monthlyData[monthKey].courierKm += (pkg.delivery_distance || 0);
                  }
                });
                
                // 排序并获取最近6个月
                const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
                
                if (sortedMonths.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      暂无月度数据
                    </div>
                  );
                }
                
                return (
                  <div>
                    {/* 简化版柱状图 */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '300px', marginBottom: '24px' }}>
                      {sortedMonths.map(month => {
                        const data = monthlyData[month];
                        const maxValue = Math.max(...sortedMonths.map(m => Math.max(monthlyData[m].income, monthlyData[m].expense)));
                        const incomeHeight = (data.income / maxValue) * 250;
                        const expenseHeight = (data.expense / maxValue) * 250;
                        
                        return (
                          <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '250px' }}>
                              <div
                                style={{
                                  width: '40px',
                                  height: `${incomeHeight}px`,
                                  background: 'linear-gradient(180deg, #2ecc71 0%, #27ae60 100%)',
                                  borderRadius: '8px 8px 0 0',
                                  position: 'relative',
                                  boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)',
                                  transition: 'all 0.3s ease'
                                }}
                                title={`收入: ${data.income.toLocaleString()} MMK`}
                              />
                              <div
                                style={{
                                  width: '40px',
                                  height: `${expenseHeight}px`,
                                  background: 'linear-gradient(180deg, #e74c3c 0%, #c0392b 100%)',
                                  borderRadius: '8px 8px 0 0',
                                  position: 'relative',
                                  boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
                                  transition: 'all 0.3s ease'
                                }}
                                title={`支出: ${data.expense.toLocaleString()} MMK`}
                              />
                            </div>
                            <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: '500', textAlign: 'center' }}>
                              {month.split('-')[1]}月
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 图例 */}
                    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', borderRadius: '4px' }} />
                        <span style={{ color: 'white', fontSize: '0.9rem' }}>收入</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', borderRadius: '4px' }} />
                        <span style={{ color: 'white', fontSize: '0.9rem' }}>支出</span>
                      </div>
                    </div>

                    {/* 月度详细数据表格 */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>月份</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'white', fontSize: '0.9rem' }}>收入</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'white', fontSize: '0.9rem' }}>支出</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'white', fontSize: '0.9rem' }}>利润</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'white', fontSize: '0.9rem' }}>包裹数</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'white', fontSize: '0.9rem' }}>包裹收入</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'white', fontSize: '0.9rem' }}>配送距离</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMonths.map(month => {
                            const data = monthlyData[month];
                            const profit = data.income - data.expense;
                            
                            return (
                              <tr key={month} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <td style={{ padding: '12px', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                                  {month}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#2ecc71', fontSize: '0.9rem', fontWeight: '600' }}>
                                  {data.income.toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#e74c3c', fontSize: '0.9rem', fontWeight: '600' }}>
                                  {data.expense.toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', color: profit >= 0 ? '#00cec9' : '#ff6b6b', fontSize: '0.9rem', fontWeight: '600' }}>
                                  {profit.toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                                  {data.packageCount} 个
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#6c5ce7', fontSize: '0.9rem', fontWeight: '600' }}>
                                  {data.packageIncome.toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#fd79a8', fontSize: '0.9rem', fontWeight: '600' }}>
                                  {data.courierKm.toFixed(2)} KM
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 业务分析 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {/* 包裹类型分布 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.18)'
              }}>
                <h4 style={{ marginTop: 0, color: 'white', marginBottom: '16px' }}>📦 包裹类型分布</h4>
                {(() => {
                  const typeStats: Record<string, number> = {};
                  packages.filter(pkg => pkg.status === '已送达').forEach(pkg => {
                    const type = pkg.package_type || '未知';
                    typeStats[type] = (typeStats[type] || 0) + 1;
                  });
                  
                  const total = Object.values(typeStats).reduce((sum, count) => sum + count, 0);
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {Object.entries(typeStats).map(([type, count]) => {
                        const percentage = (count / total * 100).toFixed(1);
                        return (
                          <div key={type}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem' }}>{type}</span>
                              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>{count}个 ({percentage}%)</span>
                            </div>
                            <div style={{ 
                              height: '8px', 
                              background: 'rgba(255, 255, 255, 0.1)', 
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{ 
                                width: `${percentage}%`, 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #6c5ce7 0%, #a29bfe 100%)',
                                transition: 'width 0.5s ease'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* 骑手效率排名 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.18)'
              }}>
                <h4 style={{ marginTop: 0, color: 'white', marginBottom: '16px' }}>🏆 骑手效率排名 TOP 5</h4>
                {(() => {
                  const courierStats: Record<string, { count: number, km: number }> = {};
                  
                  packages.filter(pkg => pkg.status === '已送达' && pkg.courier && pkg.courier !== '待分配').forEach(pkg => {
                    const courier = pkg.courier;
                    if (!courierStats[courier]) {
                      courierStats[courier] = { count: 0, km: 0 };
                    }
                    courierStats[courier].count++;
                    courierStats[courier].km += (pkg.delivery_distance || 0);
                  });
                  
                  const topCouriers = Object.entries(courierStats)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 5);
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {topCouriers.map(([courier, stats], index) => {
                        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                        return (
                          <div key={courier} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '10px'
                          }}>
                            <div style={{ fontSize: '1.5rem' }}>{medals[index]}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: 'white', fontSize: '0.95rem', fontWeight: '600', marginBottom: '4px' }}>
                                {courier}
                              </div>
                              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>
                                {stats.count}单 · {stats.km.toFixed(1)} KM
                              </div>
                            </div>
                            <div style={{ 
                              color: '#2ecc71', 
                              fontSize: '1.2rem', 
                              fontWeight: '700' 
                            }}>
                              {stats.count}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'package_records' && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 12px 35px rgba(7, 23, 55, 0.45)'
            }}
          >
            <h3 style={{ marginTop: 0, color: 'white', marginBottom: '20px' }}>📦 包裹收支记录</h3>
            
            {/* 包裹收入统计 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>包裹收入统计</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {packages.filter(pkg => pkg.status === '已送达').length}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>已送达包裹数量</div>
                </div>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {packages.filter(pkg => pkg.status === '已送达').reduce((sum, pkg) => {
                      const price = parseFloat(pkg.price?.replace(/[^\d.]/g, '') || '0');
                      return sum + price;
                    }, 0).toLocaleString()} MMK
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>已送达包裹收入</div>
                </div>
                <div style={{
                  background: 'rgba(251, 191, 36, 0.2)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {packages.filter(pkg => pkg.status !== '已送达' && pkg.status !== '已取消').length}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>进行中的包裹</div>
                </div>
                <div style={{
                  background: 'rgba(251, 191, 36, 0.2)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#fbbf24', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {packages.filter(pkg => pkg.status !== '已送达' && pkg.status !== '已取消').reduce((sum, pkg) => {
                      const price = parseFloat(pkg.price?.replace(/[^\d.]/g, '') || '0');
                      return sum + price;
                    }, 0).toLocaleString()} MMK
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>预期收入</div>
                </div>
              </div>
            </div>


            {/* 包裹收支记录表格 */}
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>最近包裹收入记录 (最新20个)</h4>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>订单ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>寄件人</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>收件人</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>包裹类型</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>金额</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>状态</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>送达时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.filter(pkg => pkg.status === '已送达').slice(0, 20).map((pkg) => {
                      const price = parseFloat(pkg.price?.replace(/[^\d.]/g, '') || '0');
                      return (
                        <tr key={pkg.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                            {pkg.id}
                          </td>
                          <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                            {pkg.sender_name}
                          </td>
                          <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                            {pkg.receiver_name}
                          </td>
                          <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                            {pkg.package_type}
                          </td>
                          <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                              {price.toLocaleString()} MMK
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              background: 'rgba(34, 197, 94, 0.2)',
                              color: '#22c55e'
                            }}>
                              已送达
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                            {pkg.delivery_time || '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {packages.filter(pkg => pkg.status === '已送达').length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                          暂无已送达的包裹记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'courier_records' && (
          <div>
            {/* 顶部操作栏 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: 'white', flex: '1 1 auto' }}>💰 骑手工资结算管理</h3>
              
              {/* 状态筛选 */}
              <select
                value={salaryFilterStatus}
                onChange={(e) => setSalaryFilterStatus(e.target.value as any)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  background: 'rgba(7, 23, 53, 0.65)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">全部状态</option>
                <option value="pending">待结算</option>
                <option value="approved">已审核</option>
                <option value="paid">已发放</option>
                <option value="rejected">已拒绝</option>
              </select>
              
              {/* 生成工资按钮 */}
              <button
                onClick={generateMonthlySalaries}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: loading ? 'rgba(102, 126, 234, 0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                🔄 生成本月工资
              </button>
              
              {selectedSalaries.length > 0 && (
                <>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`是否批量审核 ${selectedSalaries.length} 条工资记录？`)) return;
                      
                      setLoading(true);
                      try {
                        const success = await courierSalaryService.batchApproveSalaries(
                          selectedSalaries,
                          localStorage.getItem('admin_name') || 'System'
                        );
                        
                        if (success) {
                          window.alert('批量审核成功！');
                          await loadRecords();
                          setSelectedSalaries([]);
                        } else {
                          window.alert('批量审核失败！');
                        }
                      } catch (error) {
                        console.error('批量审核失败:', error);
                        window.alert('批量审核失败！');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  >
                    ✅ 批量审核 ({selectedSalaries.length})
                  </button>
                  
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  >
                    💳 批量发放 ({selectedSalaries.length})
                  </button>
                </>
              )}
            </div>

            {/* 工资统计卡片 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#fbbf24', fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  {courierSalaries.filter(s => s.status === 'pending').length}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>待结算</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#22c55e', fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  {courierSalaries.filter(s => s.status === 'approved').length}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>已审核</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#3b82f6', fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  {courierSalaries.filter(s => s.status === 'paid').length}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>已发放</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#a855f7', fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  {courierSalaries.reduce((sum, s) => sum + s.net_salary, 0).toLocaleString()} MMK
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>工资总额</div>
              </div>
            </div>

            {/* 工资记录表格 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              overflow: 'auto'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>💼 工资记录表</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.1)', borderBottom: '2px solid rgba(255, 255, 255, 0.2)' }}>
                    <th style={{ padding: '14px 12px', textAlign: 'left', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={(() => {
                          const filtered = courierSalaries.filter(s => salaryFilterStatus === 'all' || s.status === salaryFilterStatus);
                          return selectedSalaries.length === filtered.length && filtered.length > 0;
                        })()}
                        onChange={(e) => {
                          const filtered = courierSalaries.filter(s => salaryFilterStatus === 'all' || s.status === salaryFilterStatus);
                          if (e.target.checked) {
                            setSelectedSalaries(filtered.map(s => s.id!).filter(id => id !== undefined));
                          } else {
                            setSelectedSalaries([]);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '14px 12px', textAlign: 'left', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>骑手ID</th>
                    <th style={{ padding: '14px 12px', textAlign: 'left', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>结算周期</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>基本工资</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>公里费</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>配送奖金</th>
                    <th style={{ padding: '14px 12px', textAlign: 'right', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>实发工资</th>
                    <th style={{ padding: '14px 12px', textAlign: 'center', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>配送单数</th>
                    <th style={{ padding: '14px 12px', textAlign: 'center', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>状态</th>
                    <th style={{ padding: '14px 12px', textAlign: 'center', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = courierSalaries.filter(s => salaryFilterStatus === 'all' || s.status === salaryFilterStatus);
                    
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '1rem' }}>
                            暂无工资记录
                          </td>
                        </tr>
                      );
                    }
                    
                    return filtered.map((salary) => (
                      <tr key={salary.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 12px', color: 'white' }}>
                          <input
                            type="checkbox"
                            checked={selectedSalaries.includes(salary.id!)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSalaries([...selectedSalaries, salary.id!]);
                              } else {
                                setSelectedSalaries(selectedSalaries.filter(id => id !== salary.id));
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '14px 12px', color: 'white', fontSize: '0.9rem', fontWeight: '600' }}>
                          {salary.courier_id}
                        </td>
                        <td style={{ padding: '14px 12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem' }}>
                          {salary.period_start_date} ~ {salary.period_end_date}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                          {salary.base_salary.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', color: '#74b9ff', fontSize: '0.9rem', fontWeight: '600' }}>
                          {salary.km_fee.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', color: '#a29bfe', fontSize: '0.9rem', fontWeight: '600' }}>
                          {salary.delivery_bonus.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', color: '#55efc4', fontSize: '1rem', fontWeight: 'bold' }}>
                          {salary.net_salary.toLocaleString()} MMK
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                          {salary.total_deliveries} 单
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            background: 
                              salary.status === 'pending' ? 'rgba(251, 191, 36, 0.2)' :
                              salary.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' :
                              salary.status === 'paid' ? 'rgba(59, 130, 246, 0.2)' :
                              'rgba(239, 68, 68, 0.2)',
                            color: 
                              salary.status === 'pending' ? '#fbbf24' :
                              salary.status === 'approved' ? '#22c55e' :
                              salary.status === 'paid' ? '#3b82f6' :
                              '#ef4444'
                          }}>
                            {salary.status === 'pending' ? '待结算' :
                             salary.status === 'approved' ? '已审核' :
                             salary.status === 'paid' ? '已发放' :
                             '已拒绝'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={async () => {
                                setSelectedSalary(salary);
                                const details = await courierSalaryService.getSalaryDetails(salary.id!);
                                setSalaryDetails(details);
                                setShowSalaryDetail(true);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                              }}
                            >
                              详情
                            </button>
                            
                            {salary.status === 'pending' && (
                              <button
                                onClick={async () => {
                                  if (!window.confirm('确认审核通过？')) return;
                                  
                                  setLoading(true);
                                  try {
                                    const success = await courierSalaryService.updateSalary(salary.id!, {
                                      status: 'approved',
                                      approved_by: localStorage.getItem('admin_name') || 'System',
                                      approved_at: new Date().toISOString()
                                    });
                                    
                                    if (success) {
                                      window.alert('审核成功！');
                                      await loadRecords();
                                    } else {
                                      window.alert('审核失败！');
                                    }
                                  } catch (error) {
                                    console.error('审核失败:', error);
                                    window.alert('审核失败！');
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'rgba(34, 197, 94, 0.2)',
                                  color: '#22c55e',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '600'
                                }}
                              >
                                审核
                              </button>
                            )}
                            
                            {salary.status === 'approved' && (
                              <button
                                onClick={() => {
                                  setSelectedSalaries([salary.id!]);
                                  setShowPaymentModal(true);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: 'none',
                                  background: 'rgba(245, 87, 108, 0.2)',
                                  color: '#f5576c',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '600'
                                }}
                              >
                                发放
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* =============== 原有的统计信息 (保留) =============== */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: '0 12px 35px rgba(7, 23, 55, 0.45)'
              }}
            >
              <h3 style={{ marginTop: 0, color: 'white', marginBottom: '20px' }}>📊 骑手数据统计</h3>
            
            {/* 骑手送货费用统计 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>📍 骑手送货费用统计</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: 'rgba(253, 121, 168, 0.2)',
                  border: '1px solid rgba(253, 121, 168, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#fd79a8', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {summary.totalKm.toFixed(2)} KM
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>总配送距离</div>
                </div>
                <div style={{
                  background: 'rgba(253, 121, 168, 0.2)',
                  border: '1px solid rgba(253, 121, 168, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#fd79a8', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    500 MMK
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>每公里费率</div>
                </div>
                <div style={{
                  background: 'rgba(253, 121, 168, 0.2)',
                  border: '1px solid rgba(253, 121, 168, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#fd79a8', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {summary.courierKmCost.toLocaleString()} MMK
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>送货费用总额</div>
                </div>
                <div style={{
                  background: 'rgba(253, 121, 168, 0.2)',
                  border: '1px solid rgba(253, 121, 168, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#fd79a8', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {packages.filter(pkg => pkg.status === '已送达').length}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>已送达包裹数</div>
                </div>
              </div>
            </div>

            {/* 骑手收入统计 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>💰 骑手佣金统计</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {records.filter(r => r.record_type === 'income' && r.category.includes('佣金')).length}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>骑手收入笔数</div>
                </div>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#22c55e', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {records.filter(r => r.record_type === 'income' && r.category.includes('佣金')).reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()} MMK
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>骑手收入总额</div>
                </div>
              </div>
            </div>

            {/* 骑手支出统计 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>骑手支出统计</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {records.filter(r => r.record_type === 'expense' && r.category.includes('骑手')).length}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>骑手支出笔数</div>
                </div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {records.filter(r => r.record_type === 'expense' && r.category.includes('骑手')).reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString()} MMK
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>骑手支出总额</div>
                </div>
              </div>
            </div>

            {/* 骑手送货费用明细表 */}
            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
              <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>📋 骑手送货费用明细 (按骑手统计)</h4>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>骑手ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>送达包裹数</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>总送货距离</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>送货费用</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>平均每单距离</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // 按骑手分组统计
                      const courierStats: Record<string, { count: number, totalKm: number }> = {};
                      const COURIER_KM_RATE = 500;
                      
                      packages.filter(pkg => pkg.status === '已送达' && pkg.courier && pkg.courier !== '待分配').forEach(pkg => {
                        const courierId = pkg.courier;
                        if (!courierStats[courierId]) {
                          courierStats[courierId] = { count: 0, totalKm: 0 };
                        }
                        courierStats[courierId].count++;
                        courierStats[courierId].totalKm += (pkg.delivery_distance || 0);
                      });
                      
                      const courierList = Object.entries(courierStats).sort((a, b) => b[1].totalKm - a[1].totalKm);
                      
                      if (courierList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                              暂无骑手配送记录
                            </td>
                          </tr>
                        );
                      }
                      
                      return courierList.map(([courierId, stats]) => {
                        const avgKm = stats.totalKm / stats.count;
                        const cost = stats.totalKm * COURIER_KM_RATE;
                        
                        return (
                          <tr key={courierId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                              {courierId}
                            </td>
                            <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                              {stats.count} 个
                            </td>
                            <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                              <span style={{ color: '#74b9ff', fontWeight: 'bold' }}>
                                {stats.totalKm.toFixed(2)} KM
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                              <span style={{ color: '#fd79a8', fontWeight: 'bold' }}>
                                {cost.toLocaleString()} MMK
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                              {avgKm.toFixed(2)} KM
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 骑手收支记录表格 */}
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>📄 最近骑手佣金记录</h4>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>骑手ID</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>类型</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>金额</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>状态</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontSize: '0.9rem' }}>日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.filter(r => r.category.includes('佣金') || r.category.includes('骑手')).slice(0, 10).map((record) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                          {record.courier_id || 'N/A'}
                        </td>
                        <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            background: record.record_type === 'income' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: record.record_type === 'income' ? '#22c55e' : '#ef4444'
                          }}>
                            {record.record_type === 'income' ? '收入' : '支出'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                          {record.amount?.toLocaleString()} {record.currency}
                        </td>
                        <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            background: record.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                            color: record.status === 'completed' ? '#22c55e' : '#fbbf24'
                          }}>
                            {record.status === 'completed' ? '已完成' : '待处理'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                          {new Date(record.record_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

            {/* 工资详情模态框 */}
            {showSalaryDetail && selectedSalary && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                  padding: '20px'
                }}
                onClick={() => setShowSalaryDetail(false)}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                    borderRadius: '20px',
                    padding: '32px',
                    maxWidth: '600px',
                    width: '100%',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>💰 工资详情</h2>
                    <button
                      onClick={() => setShowSalaryDetail(false)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      关闭
                    </button>
                  </div>

                  {/* 基本信息 */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>基本信息</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      <div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>骑手ID</div>
                        <div style={{ color: 'white', fontSize: '1rem', fontWeight: '600' }}>{selectedSalary.courier_id}</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>结算周期</div>
                        <div style={{ color: 'white', fontSize: '0.9rem' }}>
                          {selectedSalary.period_start_date} ~ {selectedSalary.period_end_date}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>配送单数</div>
                        <div style={{ color: '#74b9ff', fontSize: '1rem', fontWeight: '600' }}>{selectedSalary.total_deliveries} 单</div>
                      </div>
                      <div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '4px' }}>配送距离</div>
                        <div style={{ color: '#fd79a8', fontSize: '1rem', fontWeight: '600' }}>{selectedSalary.total_km.toFixed(2)} KM</div>
                      </div>
                    </div>
                  </div>

                  {/* 工资组成 */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>工资组成</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>基本工资</span>
                        <span style={{ color: 'white', fontWeight: '600' }}>{selectedSalary.base_salary.toLocaleString()} MMK</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>送货费</span>
                        <span style={{ color: '#74b9ff', fontWeight: '600' }}>+{selectedSalary.km_fee.toLocaleString()} MMK</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>配送奖金</span>
                        <span style={{ color: '#a29bfe', fontWeight: '600' }}>+{selectedSalary.delivery_bonus.toLocaleString()} MMK</span>
                      </div>
                      {selectedSalary.performance_bonus > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>绩效奖金</span>
                          <span style={{ color: '#55efc4', fontWeight: '600' }}>+{selectedSalary.performance_bonus.toLocaleString()} MMK</span>
                        </div>
                      )}
                      {selectedSalary.deduction_amount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>扣款</span>
                          <span style={{ color: '#ff7675', fontWeight: '600' }}>-{selectedSalary.deduction_amount.toLocaleString()} MMK</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: '8px', borderTop: '2px solid rgba(255, 255, 255, 0.3)' }}>
                        <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600' }}>实发工资</span>
                        <span style={{ color: '#55efc4', fontSize: '1.3rem', fontWeight: 'bold' }}>{selectedSalary.net_salary.toLocaleString()} MMK</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 发放工资模态框 */}
            {showPaymentModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                  padding: '20px'
                }}
                onClick={() => setShowPaymentModal(false)}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                    borderRadius: '20px',
                    padding: '32px',
                    maxWidth: '500px',
                    width: '100%',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 style={{ margin: '0 0 24px 0', color: 'white', fontSize: '1.5rem' }}>💳 发放工资</h2>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>
                      发放方式 *
                    </label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        background: 'rgba(7, 23, 53, 0.65)',
                        color: 'white',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="cash">现金</option>
                      <option value="bank_transfer">银行转账</option>
                      <option value="kbz_pay">KBZ Pay</option>
                      <option value="wave_money">Wave Money</option>
                      <option value="mobile_money">其他移动支付</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>
                      支付凭证号
                    </label>
                    <input
                      type="text"
                      value={paymentForm.payment_reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                      placeholder="银行单号/交易号"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.18)',
                        color: 'white',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem' }}>
                      发放日期 *
                    </label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgba(255, 255, 255, 0.18)',
                        color: 'white',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        background: 'transparent',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600'
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`确认发放 ${selectedSalaries.length} 条工资？`)) return;
                        
                        setLoading(true);
                        try {
                          let successCount = 0;
                          for (const salaryId of selectedSalaries) {
                            const success = await courierSalaryService.paySalary(salaryId, {
                              payment_method: paymentForm.payment_method,
                              payment_reference: paymentForm.payment_reference,
                              payment_date: paymentForm.payment_date
                            });
                            
                            if (success) {
                              successCount++;
                              
                              // 新增逻辑：标记相关包裹为已结算
                              const salaryRecord = courierSalaries.find(s => s.id === salaryId);
                              if (salaryRecord && salaryRecord.related_package_ids) {
                                await courierSalaryService.markPackagesAsSettled(salaryRecord.related_package_ids);
                              }
                            }
                          }
                          
                          window.alert(`成功发放 ${successCount} 条工资！`);
                          await loadRecords();
                          setShowPaymentModal(false);
                          setSelectedSalaries([]);
                        } catch (error) {
                          console.error('发放工资失败:', error);
                          window.alert('发放工资失败！');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: loading ? 'rgba(240, 147, 251, 0.5)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '600'
                      }}
                    >
                      确认发放
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceManagement;

