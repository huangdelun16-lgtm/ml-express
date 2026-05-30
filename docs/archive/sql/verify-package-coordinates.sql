-- 验证 packages 表的坐标字段迁移结果

-- 1. 检查字段是否存在
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'packages' 
    AND column_name IN ('receiver_latitude', 'receiver_longitude', 'sender_latitude', 'sender_longitude')
ORDER BY column_name;

-- 2. 检查有多少包裹已有坐标数据
SELECT 
    COUNT(*) as total_packages,
    COUNT(receiver_latitude) as packages_with_receiver_coords,
    COUNT(sender_latitude) as packages_with_sender_coords,
    ROUND(COUNT(receiver_latitude)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as receiver_coords_percentage,
    ROUND(COUNT(sender_latitude)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as sender_coords_percentage
FROM packages;

-- 3. 查看前10个包裹的坐标数据（验证随机偏移）
SELECT 
    id,
    receiver_name,
    receiver_address,
    ROUND(receiver_latitude::numeric, 6) as receiver_lat,
    ROUND(receiver_longitude::numeric, 6) as receiver_lng,
    ROUND(sender_latitude::numeric, 6) as sender_lat,
    ROUND(sender_longitude::numeric, 6) as sender_lng
FROM packages
ORDER BY created_at DESC
LIMIT 10;

-- 4. 检查坐标范围（确保在曼德勒范围内）
SELECT 
    MIN(receiver_latitude) as min_receiver_lat,
    MAX(receiver_latitude) as max_receiver_lat,
    MIN(receiver_longitude) as min_receiver_lng,
    MAX(receiver_longitude) as max_receiver_lng,
    AVG(receiver_latitude) as avg_receiver_lat,
    AVG(receiver_longitude) as avg_receiver_lng
FROM packages
WHERE receiver_latitude IS NOT NULL;

-- 5. 检查索引是否创建成功
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'packages' 
    AND indexname LIKE '%coords%'
ORDER BY indexname;

