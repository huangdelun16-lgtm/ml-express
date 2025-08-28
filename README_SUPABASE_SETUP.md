# 最小后端规划（Supabase + Netlify Functions）

## 目标
- 将账号、包裹、财务等数据从前端 localStorage 迁移到云数据库
- 启用更强安全：服务端鉴权、审计日志、单点登录、2FA（后续）

## 方案
- 数据库：Supabase（PostgreSQL 托管）
- API 层：Netlify Functions（serverless）
- 前端：通过 `@supabase/supabase-js` 访问，凭证由 Netlify 环境变量注入

## 环境变量（Netlify > Site settings > Environment variables）
- `SUPABASE_URL` = https://xxxx.supabase.co
- `SUPABASE_ANON_KEY` = 从 Supabase 项目设置中复制

## 数据表示例（SQL）
```sql
-- 用户
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('staff','accountant','manager','master')),
  created_at timestamptz default now()
);

-- 包裹
create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  tracking_no text unique not null,
  sender text,
  receiver text,
  origin text,
  destination text,
  weight_kg numeric,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  fee numeric,
  status text,
  created_at timestamptz default now()
);

-- 财务
create table if not exists finances (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('收入','支出')),
  category text not null,
  amount numeric not null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz default now()
);

-- 审计日志
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text,
  detail jsonb,
  created_at timestamptz default now()
);
```

## 验证函数（示例）
- `/.netlify/functions/hello` 返回 JSON 以验证 Functions 可用

## 下一步
- 新建 `auth`、`packages`、`finances` 函数，迁移读写到数据库
- 引入服务端会话（Netlify Identity 或 Supabase Auth）与 2FA

## RLS 与字段建议
- finances 表：增加 `created_by`、`updated_by`、`date`（或 `occurred_on`）
- packages 表：增加 `created_by`、`updated_by`、`createdAt`、`estimatedDelivery`、`dimensions`（或三段长宽高）
- 建议的 RLS（示例伪 SQL）：
```sql
alter table finances enable row level security;
create policy p_fin_read on finances for select using (auth.role() in ('accountant','manager','master'));
create policy p_fin_write on finances for insert with check (auth.role() in ('accountant','manager','master'));
create policy p_fin_update on finances for update using (auth.role() in ('accountant','manager','master'));

alter table packages enable row level security;
create policy p_pkg_read on packages for select using (true);
create policy p_pkg_write on packages for insert with check (true);
create policy p_pkg_update on packages for update using (true);
```

## 审计
- 所有关键变更写入 `audit_logs(actor, action, detail)`，如：
  - `finances.create/update/delete`
  - `packages.create/update/delete`
