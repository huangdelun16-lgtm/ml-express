-- 更新快递员表，添加新的车辆类型
-- 如果表已存在，需要更新约束

-- 删除旧的约束
ALTER TABLE couriers DROP CONSTRAINT IF EXISTS couriers_vehicle_type_check;

-- 添加新的约束，包含三轮车和小卡车
ALTER TABLE couriers ADD CONSTRAINT couriers_vehicle_type_check 
  CHECK (vehicle_type IN ('motorcycle', 'car', 'bicycle', 'truck', 'tricycle', 'small_truck'));

-- 验证约束已更新
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'couriers_vehicle_type_check';
