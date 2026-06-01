-- 修复「实时跟踪地图无骑手坐标」的数据库侧前置条件。
-- 骑手 App 会：
--   1) upsert public.courier_locations，onConflict: 'courier_id'（需要 courier_id 唯一约束）
--   2) update public.couriers 的 last_latitude / last_longitude / last_location_update
-- 若以上 schema 不满足，写入会静默失败，导致 admin 实时跟踪地图拿不到坐标。
-- 本迁移幂等、可安全重复执行。

-- 1) couriers：补齐骑手端写入的地理列
alter table public.couriers
  add column if not exists last_latitude double precision,
  add column if not exists last_longitude double precision,
  add column if not exists last_location_update timestamptz;

-- 2) courier_locations：onConflict('courier_id') 需要 courier_id 上的唯一约束
--    2a) 先去重，确保每个 courier_id 仅保留一行（保留 ctid 最大的一行）
delete from public.courier_locations a
using public.courier_locations b
where a.courier_id = b.courier_id
  and a.ctid < b.ctid;

--    2b) 不存在唯一/主键约束时再添加
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.courier_locations'::regclass
      and contype in ('u', 'p')
      and conkey = array[
        (select attnum from pg_attribute
          where attrelid = 'public.courier_locations'::regclass
            and attname = 'courier_id')
      ]
  ) then
    alter table public.courier_locations
      add constraint courier_locations_courier_id_key unique (courier_id);
  end if;
end $$;

-- 3) Realtime：admin 实时跟踪订阅 courier_locations 行级变更
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'courier_locations'
  ) then
    alter publication supabase_realtime add table public.courier_locations;
  end if;
end $$;

-- 4) Realtime：couriers 表 last_latitude 变更供 admin 地图回退订阅
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couriers'
  ) then
    alter publication supabase_realtime add table public.couriers;
  end if;
end $$;
