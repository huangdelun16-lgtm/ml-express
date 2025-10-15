-- 创建用于实时跟踪的表结构

create table if not exists courier_locations (
  id uuid primary key default uuid_generate_v4(),
  courier_id text not null references couriers(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  heading double precision,
  speed double precision,
  battery_level double precision,
  status text not null default 'active',
  last_update timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_courier_locations_courier on courier_locations(courier_id);
create index if not exists idx_courier_locations_update on courier_locations(last_update desc);

alter table courier_locations enable row level security;

create policy "Allow anon read locations" on courier_locations
  for select using (auth.role() in ('anon', 'authenticated'));

create policy "Allow service insert locations" on courier_locations
  for insert with check (auth.role() = 'service_role');

create policy "Allow service update locations" on courier_locations
  for update using (auth.role() = 'service_role');


create table if not exists tracking_events (
  id uuid primary key default uuid_generate_v4(),
  package_id text not null references packages(id) on delete cascade,
  courier_id text references couriers(id) on delete set null,
  status text not null,
  latitude double precision not null,
  longitude double precision not null,
  speed double precision,
  battery_level double precision,
  note text,
  event_time timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_tracking_events_package on tracking_events(package_id, event_time desc);
create index if not exists idx_tracking_events_courier on tracking_events(courier_id, event_time desc);

alter table tracking_events enable row level security;

create policy "Allow anon read events" on tracking_events
  for select using (auth.role() in ('anon', 'authenticated'));

create policy "Allow service insert events" on tracking_events
  for insert with check (auth.role() = 'service_role');

create policy "Allow service update events" on tracking_events
  for update using (auth.role() = 'service_role');


-- 为 Edge Function / REST 调用创建角色与 API 密钥提示
-- 建议：在 Supabase Dashboard > Authentication > Policies 中
-- 为 service_role 创建专用 key，用于服务器或物联网设备上报实时数据。


