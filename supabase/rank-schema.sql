-- ============================================================
-- "ลดน้ำหนักไม่มีคำว่าปลอบใจ" — ระบบยศ + จัดอันดับ (Migration #2)
-- รันไฟล์นี้ต่อจาก schema.sql ใน Supabase Dashboard > SQL Editor
-- ============================================================

-- ---------- PROFILES ----------
-- ไม่มีระบบล็อกอิน: ผูกตัวตนกับ device_id ที่ generate ในเบราว์เซอร์
create table if not exists public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  device_id          text not null unique,
  nickname           text not null check (char_length(trim(nickname)) between 2 and 20),

  -- ตัวนับเหล่านี้ "ห้ามให้ client เขียนเอง" — trigger เท่านั้นที่แก้ได้
  total_paid_minutes int  not null default 0 check (total_paid_minutes >= 0),
  debt_minutes       int  not null default 0 check (debt_minutes >= 0),
  current_streak     int  not null default 0,
  best_streak        int  not null default 0,
  last_paid_on       date,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists profiles_fame_idx  on public.profiles (total_paid_minutes desc);
create index if not exists profiles_shame_idx on public.profiles (debt_minutes desc);

-- ---------- BURN LOGS ----------
create table if not exists public.burn_logs (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  food_name     text not null check (char_length(food_name) between 1 and 80),
  kcal          int  not null check (kcal between 1 and 20000),
  activity_slug text not null references public.activities(slug),
  minutes       int  not null check (minutes between 0 and 20000),
  status        text not null default 'pending' check (status in ('pending', 'paid')),
  logged_at     timestamptz not null default now(),
  paid_at       timestamptz
);

create index if not exists burn_logs_profile_idx on public.burn_logs (profile_id, status, logged_at desc);

-- ---------- TRIGGER: อัปเดตตัวนับใน profiles ----------
-- security definer = ทำงานด้วยสิทธิ์เจ้าของตาราง จึงข้าม RLS ได้
-- นี่คือเหตุผลที่ anon ไม่ต้องมีสิทธิ์ UPDATE บน profiles เลย
create or replace function public.apply_burn_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gap_days  int;
  new_streak int;
begin
  if TG_OP = 'INSERT' then
    update public.profiles
       set debt_minutes = debt_minutes + new.minutes,
           updated_at   = now()
     where id = new.profile_id;
    return new;
  end if;

  -- นับเฉพาะตอนเปลี่ยนจาก pending → paid (กันกดซ้ำแล้วได้แต้มซ้ำ)
  if old.status = 'pending' and new.status = 'paid' then
    select coalesce(current_date - last_paid_on, 999)
      into gap_days
      from public.profiles
     where id = new.profile_id;

    -- ชดใช้วันเดียวกันซ้ำ = สตรีคเท่าเดิม / ต่อวัน = +1 / เว้นวัน = เริ่มนับใหม่
    select case
             when gap_days = 0 then current_streak
             when gap_days = 1 then current_streak + 1
             else 1
           end
      into new_streak
      from public.profiles
     where id = new.profile_id;

    update public.profiles
       set debt_minutes       = greatest(0, debt_minutes - new.minutes),
           total_paid_minutes = total_paid_minutes + new.minutes,
           current_streak     = new_streak,
           best_streak        = greatest(best_streak, new_streak),
           last_paid_on       = current_date,
           updated_at         = now()
     where id = new.profile_id;
  end if;

  return new;
end;
$$;

drop trigger if exists burn_log_after_insert on public.burn_logs;
create trigger burn_log_after_insert
  after insert on public.burn_logs
  for each row execute function public.apply_burn_log();

drop trigger if exists burn_log_after_update on public.burn_logs;
create trigger burn_log_after_update
  after update on public.burn_logs
  for each row execute function public.apply_burn_log();

-- ---------- RLS ----------
alter table public.profiles  enable row level security;
alter table public.burn_logs enable row level security;

-- profiles: อ่านได้ทุกคน (บอร์ดต้องโชว์) / สร้างได้ / แต่ "แก้ไม่ได้"
-- ไม่มี policy สำหรับ UPDATE = anon ปั้นแต้มตัวเองไม่ได้ ต้องผ่าน trigger เท่านั้น
drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles" on public.profiles
  for select using (true);

drop policy if exists "public create profile" on public.profiles;
create policy "public create profile" on public.profiles
  for insert with check (
    char_length(trim(nickname)) between 2 and 20
    and char_length(device_id) between 8 and 64
  );

-- burn_logs: อ่าน/บันทึกได้ ส่วน update ทำได้ทางเดียวคือ pending → paid
drop policy if exists "public read burn logs" on public.burn_logs;
create policy "public read burn logs" on public.burn_logs
  for select using (true);

drop policy if exists "public insert burn log" on public.burn_logs;
create policy "public insert burn log" on public.burn_logs
  for insert with check (status = 'pending');

drop policy if exists "public settle burn log" on public.burn_logs;
create policy "public settle burn log" on public.burn_logs
  for update using (status = 'pending') with check (status = 'paid');

-- ============================================================
-- ⚠️ ข้อจำกัดที่ยอมรับไว้โดยตั้งใจ
--
-- โหมดไม่ล็อกอินแปลว่าเซิร์ฟเวอร์พิสูจน์ไม่ได้ว่าใครเป็นใคร ใครก็ยิง API
-- สร้างโปรไฟล์ปลอมหรือกดชดใช้แทนคนอื่นได้ ตารางนี้จึงกันได้แค่:
--   • ปั้นตัวเลขตรงๆ ไม่ได้ (ไม่มี UPDATE policy บน profiles)
--   • กดชดใช้ซ้ำไม่ได้แต้มซ้ำ (trigger เช็ค pending → paid)
--   • ค่าเกินจริงถูกบล็อกด้วย CHECK constraint
--
-- ถ้าวันหนึ่งอันดับเริ่มมีคนโกงจริงจัง ทางแก้คือเปิด Supabase Anonymous
-- Sign-ins แล้วเปลี่ยน policy เป็น auth.uid() = profiles.user_id
-- ซึ่งยังไม่ต้องให้ผู้ใช้ล็อกอินอยู่ดี
-- ============================================================
