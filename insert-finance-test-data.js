// 在浏览器控制台中运行此脚本来插入财务测试数据
// 确保已登录到 Supabase 管理后台

console.log('开始插入财务测试数据...');

// 测试数据
const testFinanceRecords = [
  // 包裹收入记录
  {
    id: 'test_pkg_income_001',
    record_type: 'income',
    category: '同城配送',
    order_id: 'MDY20250101001',
    courier_id: 'COU001',
    amount: 5000,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    reference: 'PKG_INC_001',
    record_date: '2025-01-01',
    notes: '同城包裹配送收入'
  },
  {
    id: 'test_pkg_income_002',
    record_type: 'income',
    category: '次日配送',
    order_id: 'MDY20250101002',
    courier_id: 'COU002',
    amount: 3500,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'kbz_pay',
    reference: 'PKG_INC_002',
    record_date: '2025-01-02',
    notes: '次日包裹配送收入'
  },
  {
    id: 'test_pkg_income_003',
    record_type: 'income',
    category: '同城配送',
    order_id: 'MDY20250101003',
    courier_id: 'COU003',
    amount: 4500,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'wave_pay',
    reference: 'PKG_INC_003',
    record_date: '2025-01-03',
    notes: '同城包裹配送收入'
  },
  {
    id: 'test_pkg_income_004',
    record_type: 'income',
    category: '快递包裹',
    order_id: 'MDY20250101004',
    courier_id: 'COU004',
    amount: 6000,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    reference: 'PKG_INC_004',
    record_date: '2025-01-04',
    notes: '快递包裹配送收入'
  },
  {
    id: 'test_pkg_income_005',
    record_type: 'income',
    category: '同城配送',
    order_id: 'MDY20250101005',
    courier_id: 'COU005',
    amount: 4000,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'aya_pay',
    reference: 'PKG_INC_005',
    record_date: '2025-01-05',
    notes: '同城包裹配送收入'
  },

  // 包裹支出记录
  {
    id: 'test_pkg_expense_001',
    record_type: 'expense',
    category: '包裹处理费',
    order_id: 'MDY20250101001',
    courier_id: 'COU001',
    amount: 500,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    reference: 'PKG_EXP_001',
    record_date: '2025-01-01',
    notes: '包裹处理费用'
  },
  {
    id: 'test_pkg_expense_002',
    record_type: 'expense',
    category: '包裹包装费',
    order_id: 'MDY20250101002',
    courier_id: 'COU002',
    amount: 300,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'kbz_pay',
    reference: 'PKG_EXP_002',
    record_date: '2025-01-02',
    notes: '包裹包装费用'
  },
  {
    id: 'test_pkg_expense_003',
    record_type: 'expense',
    category: '包裹运输费',
    order_id: 'MDY20250101003',
    courier_id: 'COU003',
    amount: 800,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'wave_pay',
    reference: 'PKG_EXP_003',
    record_date: '2025-01-03',
    notes: '包裹运输费用'
  },
  {
    id: 'test_pkg_expense_004',
    record_type: 'expense',
    category: '包裹保险费',
    order_id: 'MDY20250101004',
    courier_id: 'COU004',
    amount: 200,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    reference: 'PKG_EXP_004',
    record_date: '2025-01-04',
    notes: '包裹保险费用'
  },
  {
    id: 'test_pkg_expense_005',
    record_type: 'expense',
    category: '包裹处理费',
    order_id: 'MDY20250101005',
    courier_id: 'COU005',
    amount: 400,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'aya_pay',
    reference: 'PKG_EXP_005',
    record_date: '2025-01-05',
    notes: '包裹处理费用'
  },

  // 骑手收入记录（佣金）
  {
    id: 'test_courier_income_001',
    record_type: 'income',
    category: '快递员佣金',
    order_id: 'MDY20250101001',
    courier_id: 'COU001',
    amount: 1500,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    reference: 'COU_INC_001',
    record_date: '2025-01-01',
    notes: '快递员配送佣金'
  },
  {
    id: 'test_courier_income_002',
    record_type: 'income',
    category: '快递员佣金',
    order_id: 'MDY20250101002',
    courier_id: 'COU002',
    amount: 1200,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'kbz_pay',
    reference: 'COU_INC_002',
    record_date: '2025-01-02',
    notes: '快递员配送佣金'
  },
  {
    id: 'test_courier_income_003',
    record_type: 'income',
    category: '快递员佣金',
    order_id: 'MDY20250101003',
    courier_id: 'COU003',
    amount: 1350,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'wave_pay',
    reference: 'COU_INC_003',
    record_date: '2025-01-03',
    notes: '快递员配送佣金'
  },
  {
    id: 'test_courier_income_004',
    record_type: 'income',
    category: '快递员佣金',
    order_id: 'MDY20250101004',
    courier_id: 'COU004',
    amount: 1800,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    reference: 'COU_INC_004',
    record_date: '2025-01-04',
    notes: '快递员配送佣金'
  },
  {
    id: 'test_courier_income_005',
    record_type: 'income',
    category: '快递员佣金',
    order_id: 'MDY20250101005',
    courier_id: 'COU005',
    amount: 1400,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'aya_pay',
    reference: 'COU_INC_005',
    record_date: '2025-01-05',
    notes: '快递员配送佣金'
  },

  // 骑手支出记录
  {
    id: 'test_courier_expense_001',
    record_type: 'expense',
    category: '骑手燃油费',
    order_id: 'MDY20250101001',
    courier_id: 'COU001',
    amount: 800,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    reference: 'COU_EXP_001',
    record_date: '2025-01-01',
    notes: '骑手燃油费用'
  },
  {
    id: 'test_courier_expense_002',
    record_type: 'expense',
    category: '骑手维修费',
    order_id: 'MDY20250101002',
    courier_id: 'COU002',
    amount: 1200,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'kbz_pay',
    reference: 'COU_EXP_002',
    record_date: '2025-01-02',
    notes: '骑手车辆维修费'
  },
  {
    id: 'test_courier_expense_003',
    record_type: 'expense',
    category: '骑手燃油费',
    order_id: 'MDY20250101003',
    courier_id: 'COU003',
    amount: 750,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'wave_pay',
    reference: 'COU_EXP_003',
    record_date: '2025-01-03',
    notes: '骑手燃油费用'
  },
  {
    id: 'test_courier_expense_004',
    record_type: 'expense',
    category: '骑手保险费',
    order_id: 'MDY20250101004',
    courier_id: 'COU004',
    amount: 500,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'cash',
    reference: 'COU_EXP_004',
    record_date: '2025-01-04',
    notes: '骑手保险费用'
  },
  {
    id: 'test_courier_expense_005',
    record_type: 'expense',
    category: '骑手燃油费',
    order_id: 'MDY20250101005',
    courier_id: 'COU005',
    amount: 900,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'aya_pay',
    reference: 'COU_EXP_005',
    record_date: '2025-01-05',
    notes: '骑手燃油费用'
  },

  // 其他财务记录
  {
    id: 'test_other_income_001',
    record_type: 'income',
    category: '其他收入',
    order_id: 'MDY20250101006',
    courier_id: null,
    amount: 2000,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'bank_transfer',
    reference: 'OTH_INC_001',
    record_date: '2025-01-06',
    notes: '其他业务收入'
  },
  {
    id: 'test_other_expense_001',
    record_type: 'expense',
    category: '办公费用',
    order_id: 'MDY20250101006',
    courier_id: null,
    amount: 1500,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'bank_transfer',
    reference: 'OTH_EXP_001',
    record_date: '2025-01-06',
    notes: '办公用品费用'
  },
  {
    id: 'test_other_expense_002',
    record_type: 'expense',
    category: '水电费',
    order_id: 'MDY20250101007',
    courier_id: null,
    amount: 3000,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'bank_transfer',
    reference: 'OTH_EXP_002',
    record_date: '2025-01-07',
    notes: '水电费用'
  },
  {
    id: 'test_other_expense_003',
    record_type: 'expense',
    category: '租金',
    order_id: 'MDY20250101008',
    courier_id: null,
    amount: 50000,
    currency: 'MMK',
    status: 'completed',
    payment_method: 'bank_transfer',
    reference: 'OTH_EXP_003',
    record_date: '2025-01-08',
    notes: '办公场地租金'
  }
];

// 插入数据的函数
async function insertFinanceTestData() {
  try {
    console.log('正在插入财务测试数据...');
    
    // 这里需要替换为实际的 Supabase 客户端代码
    // 由于在浏览器控制台中，我们需要使用全局的 supabase 客户端
    if (typeof supabase === 'undefined') {
      console.error('Supabase 客户端未找到，请确保在 Supabase 管理后台中运行此脚本');
      return;
    }

    const { data, error } = await supabase
      .from('finance_records')
      .insert(testFinanceRecords);

    if (error) {
      console.error('插入数据时出错:', error);
    } else {
      console.log('成功插入财务测试数据:', data);
      console.log('共插入', testFinanceRecords.length, '条记录');
      
      // 显示统计信息
      const packageIncome = testFinanceRecords.filter(r => 
        r.record_type === 'income' && r.category.includes('包裹')
      ).reduce((sum, r) => sum + r.amount, 0);
      
      const packageExpense = testFinanceRecords.filter(r => 
        r.record_type === 'expense' && r.category.includes('包裹')
      ).reduce((sum, r) => sum + r.amount, 0);
      
      const courierIncome = testFinanceRecords.filter(r => 
        r.record_type === 'income' && r.category.includes('佣金')
      ).reduce((sum, r) => sum + r.amount, 0);
      
      const courierExpense = testFinanceRecords.filter(r => 
        r.record_type === 'expense' && r.category.includes('骑手')
      ).reduce((sum, r) => sum + r.amount, 0);
      
      console.log('统计信息:');
      console.log('- 包裹收入总额:', packageIncome.toLocaleString(), 'MMK');
      console.log('- 包裹支出总额:', packageExpense.toLocaleString(), 'MMK');
      console.log('- 骑手收入总额:', courierIncome.toLocaleString(), 'MMK');
      console.log('- 骑手支出总额:', courierExpense.toLocaleString(), 'MMK');
    }
  } catch (error) {
    console.error('执行过程中出错:', error);
  }
}

// 执行插入
insertFinanceTestData();
