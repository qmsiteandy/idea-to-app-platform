create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  idea text not null default '',
  status text not null default 'discussing'
    check (status in ('discussing','prd_review','building','live','iterating')),
  repo_url text,
  prod_url text,
  current_version text,
  notion_page_id text,
  created_at timestamptz not null default now()
);

-- 平台只用 service role key 從伺服器端存取；不開放匿名讀寫。
alter table projects enable row level security;
