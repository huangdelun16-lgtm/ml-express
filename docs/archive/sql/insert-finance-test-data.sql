-- 插入财务测试数据
-- 包括包裹收支记录和骑手收支记录

-- 清理现有测试数据（可选）
-- DELETE FROM finance_records WHERE id LIKE 'test_%';

-- 插入包裹相关财务记录
INSERT INTO finance_records (
  id, record_type, category, order_id, courier_id, amount, currency, 
  status, payment_method, reference, record_date, notes, created_at, updated_at
) VALUES 
-- 包裹收入记录
('test_pkg_income_001', 'income', '同城配送', 'MDY20250101001', 'COU001', 5000, 'MMK', 'completed', 'cash', 'PKG_INC_001', '2025-01-01', '同城包裹配送收入', NOW(), NOW()),
('test_pkg_income_002', 'income', '次日配送', 'MDY20250101002', 'COU002', 3500, 'MMK', 'completed', 'kbz_pay', 'PKG_INC_002', '2025-01-02', '次日包裹配送收入', NOW(), NOW()),
('test_pkg_income_003', 'income', '同城配送', 'MDY20250101003', 'COU003', 4500, 'MMK', 'completed', 'wave_pay', 'PKG_INC_003', '2025-01-03', '同城包裹配送收入', NOW(), NOW()),
('test_pkg_income_004', 'income', '快递包裹', 'MDY20250101004', 'COU004', 6000, 'MMK', 'completed', 'cash', 'PKG_INC_004', '2025-01-04', '快递包裹配送收入', NOW(), NOW()),
('test_pkg_income_005', 'income', '同城配送', 'MDY20250101005', 'COU005', 4000, 'MMK', 'completed', 'aya_pay', 'PKG_INC_005', '2025-01-05', '同城包裹配送收入', NOW(), NOW()),

-- 包裹支出记录
('test_pkg_expense_001', 'expense', '包裹处理费', 'MDY20250101001', 'COU001', 500, 'MMK', 'completed', 'cash', 'PKG_EXP_001', '2025-01-01', '包裹处理费用', NOW(), NOW()),
('test_pkg_expense_002', 'expense', '包裹包装费', 'MDY20250101002', 'COU002', 300, 'MMK', 'completed', 'kbz_pay', 'PKG_EXP_002', '2025-01-02', '包裹包装费用', NOW(), NOW()),
('test_pkg_expense_003', 'expense', '包裹运输费', 'MDY20250101003', 'COU003', 800, 'MMK', 'completed', 'wave_pay', 'PKG_EXP_003', '2025-01-03', '包裹运输费用', NOW(), NOW()),
('test_pkg_expense_004', 'expense', '包裹保险费', 'MDY20250101004', 'COU004', 200, 'MMK', 'completed', 'cash', 'PKG_EXP_004', '2025-01-04', '包裹保险费用', NOW(), NOW()),
('test_pkg_expense_005', 'expense', '包裹处理费', 'MDY20250101005', 'COU005', 400, 'MMK', 'completed', 'aya_pay', 'PKG_EXP_005', '2025-01-05', '包裹处理费用', NOW(), NOW()),

-- 骑手收入记录（佣金）
('test_courier_income_001', 'income', '快递员佣金', 'MDY20250101001', 'COU001', 1500, 'MMK', 'completed', 'cash', 'COU_INC_001', '2025-01-01', '快递员配送佣金', NOW(), NOW()),
('test_courier_income_002', 'income', '快递员佣金', 'MDY20250101002', 'COU002', 1200, 'MMK', 'completed', 'kbz_pay', 'COU_INC_002', '2025-01-02', '快递员配送佣金', NOW(), NOW()),
('test_courier_income_003', 'income', '快递员佣金', 'MDY20250101003', 'COU003', 1350, 'MMK', 'completed', 'wave_pay', 'COU_INC_003', '2025-01-03', '快递员配送佣金', NOW(), NOW()),
('test_courier_income_004', 'income', '快递员佣金', 'MDY20250101004', 'COU004', 1800, 'MMK', 'completed', 'cash', 'COU_INC_004', '2025-01-04', '快递员配送佣金', NOW(), NOW()),
('test_courier_income_005', 'income', '快递员佣金', 'MDY20250101005', 'COU005', 1400, 'MMK', 'completed', 'aya_pay', 'COU_INC_005', '2025-01-05', '快递员配送佣金', NOW(), NOW()),

-- 骑手支出记录
('test_courier_expense_001', 'expense', '骑手燃油费', 'MDY20250101001', 'COU001', 800, 'MMK', 'completed', 'cash', 'COU_EXP_001', '2025-01-01', '骑手燃油费用', NOW(), NOW()),
('test_courier_expense_002', 'expense', '骑手维修费', 'MDY20250101002', 'COU002', 1200, 'MMK', 'completed', 'kbz_pay', 'COU_EXP_002', '2025-01-02', '骑手车辆维修费', NOW(), NOW()),
('test_courier_expense_003', 'expense', '骑手燃油费', 'MDY20250101003', 'COU003', 750, 'MMK', 'completed', 'wave_pay', 'COU_EXP_003', '2025-01-03', '骑手燃油费用', NOW(), NOW()),
('test_courier_expense_004', 'expense', '骑手保险费', 'MDY20250101004', 'COU004', 500, 'MMK', 'completed', 'cash', 'COU_EXP_004', '2025-01-04', '骑手保险费用', NOW(), NOW()),
('test_courier_expense_005', 'expense', '骑手燃油费', 'MDY20250101005', 'COU005', 900, 'MMK', 'completed', 'aya_pay', 'COU_EXP_005', '2025-01-05', '骑手燃油费用', NOW(), NOW()),

-- 其他财务记录
('test_other_income_001', 'income', '其他收入', 'MDY20250101006', NULL, 2000, 'MMK', 'completed', 'bank_transfer', 'OTH_INC_001', '2025-01-06', '其他业务收入', NOW(), NOW()),
('test_other_expense_001', 'expense', '办公费用', 'MDY20250101006', NULL, 1500, 'MMK', 'completed', 'bank_transfer', 'OTH_EXP_001', '2025-01-06', '办公用品费用', NOW(), NOW()),
('test_other_expense_002', 'expense', '水电费', 'MDY20250101007', NULL, 3000, 'MMK', 'completed', 'bank_transfer', 'OTH_EXP_002', '2025-01-07', '水电费用', NOW(), NOW()),
('test_other_expense_003', 'expense', '租金', 'MDY20250101008', NULL, 50000, 'MMK', 'completed', 'bank_transfer', 'OTH_EXP_003', '2025-01-08', '办公场地租金', NOW(), NOW());

-- 查询验证数据
SELECT 
  record_type,
  category,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM finance_records 
WHERE id LIKE 'test_%'
GROUP BY record_type, category
ORDER BY record_type, category;
