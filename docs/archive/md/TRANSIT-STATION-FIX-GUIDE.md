# 修复快递中转站创建失败问题

## 问题描述
创建快递中转站时出现数据库约束错误：
```
code: "23514"
message: 'new row for relation "delivery_stores" violates check constraint "delivery_stores_store_type_check"'
```

## 问题原因
数据库中的 `delivery_stores` 表有一个检查约束 `delivery_stores_store_type_check`，它只允许以下值：
- `'hub'` (分拣中心)
- `'branch'` (配送点) 
- `'pickup_point'` (自提点)

但我们新添加的 `'transit_station'` (中转站) 不在允许的值列表中。

## 解决方案

### 步骤1：在Supabase SQL编辑器中执行以下SQL

```sql
-- 修复 delivery_stores 表的 store_type 约束
-- 添加 'transit_station' 到允许的 store_type 值

-- 首先删除现有的约束
ALTER TABLE delivery_stores DROP CONSTRAINT IF EXISTS delivery_stores_store_type_check;

-- 重新创建约束，包含 'transit_station'
ALTER TABLE delivery_stores 
ADD CONSTRAINT delivery_stores_store_type_check 
CHECK (store_type IN ('hub', 'branch', 'pickup_point', 'transit_station'));

-- 验证约束是否正确创建
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'delivery_stores_store_type_check';
```

### 步骤2：验证修复
执行SQL后，应该能看到约束已更新，包含所有4个值：
- `hub`
- `branch` 
- `pickup_point`
- `transit_station`

### 步骤3：测试创建中转站
1. 打开"快递店管理"页面
2. 点击"新增快递店"
3. 选择"中转站 (Transit Station)"类型
4. 填写其他必填信息
5. 点击"创建快递店"

## 预期结果
- ✅ 中转站类型可以正常选择
- ✅ 创建中转站不再出现约束错误
- ✅ 中转站店铺卡片显示紫色"🏪 中转包裹"按钮
- ✅ 中转站工作流程正常工作

## 注意事项
- 这个修复是永久性的，不会影响现有的店铺
- 所有现有的店铺类型（分拣中心、配送点、自提点）仍然正常工作
- 新增的中转站类型将拥有专门的工作流程和界面
