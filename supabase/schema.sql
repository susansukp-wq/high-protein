-- ============================================================
-- "ลดน้ำหนักไม่มีคำว่าปลอบใจ" — Database Schema
-- รันไฟล์นี้ใน Supabase Dashboard > SQL Editor ก่อนรัน seed.ts
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- ACTIVITIES ----------
create table if not exists public.activities (
  id              uuid primary key default gen_random_uuid(),
  slug            text        not null unique,          -- ใช้เป็น key เชื่อมกับ roasts.category
  name_th         text        not null,
  name_en         text        not null,
  mets            numeric(4,2) not null check (mets > 0),
  group_key       text        not null,                 -- fighter | cardio | soft | no_excuse | daily
  emoji           text        not null default '🔥',
  seo_title       text,
  seo_description text,
  keywords        text[]      not null default '{}',
  sort_order      int         not null default 0,
  is_active       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists activities_group_idx on public.activities (group_key);
create index if not exists activities_active_idx on public.activities (is_active, sort_order);

-- ---------- ROASTS ----------
create table if not exists public.roasts (
  id          uuid primary key default gen_random_uuid(),
  slug        text        not null unique,              -- เช่น football_01 (ใช้ทำ idempotent upsert)
  category    text        not null,                     -- ตรงกับ activities.slug หรือ 'wall_of_shame'
  message     text        not null,
  intensity   smallint    not null default 3 check (intensity between 1 and 5),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists roasts_category_idx on public.roasts (category, is_active);

-- ---------- RLS: อ่านได้ทุกคน / เขียนได้เฉพาะ service_role ----------
alter table public.activities enable row level security;
alter table public.roasts     enable row level security;

drop policy if exists "public read activities" on public.activities;
create policy "public read activities" on public.activities
  for select using (is_active = true);

drop policy if exists "public read roasts" on public.roasts;
create policy "public read roasts" on public.roasts
  for select using (is_active = true);
