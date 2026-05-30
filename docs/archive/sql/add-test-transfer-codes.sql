-- 为现有包裹添加中转码测试数据
-- 用于测试中转码显示功能

-- 首先确保transfer_code字段存在
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS transfer_code TEXT;

-- 为PYIGYITAGON店铺的包裹添加中转码
UPDATE packages 
SET transfer_code = 'TCPGT0293123'
WHERE id = 'MDY20251009070293' 
AND delivery_store_name = 'PYIGYITAGON';

-- 为其他已送达的包裹添加中转码（如果有的话）
UPDATE packages 
SET transfer_code = 'TCPGT' || SUBSTRING(id, -4) || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT, -3)
WHERE status = '已送达' 
AND delivery_store_id IS NOT NULL 
AND transfer_code IS NULL;

-- 验证更新结果
SELECT 
  id,
  sender_name,
  receiver_name,
  status,
  delivery_store_name,
  transfer_code,
  delivery_time
FROM packages 
WHERE transfer_code IS NOT NULL
ORDER BY delivery_time DESC;
