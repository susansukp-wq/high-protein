-- ============================================================
-- "ลดน้ำหนักไม่มีคำว่าปลอบใจ" — ผูกตัวตนกับ Supabase Auth (Migration #4)
-- รันต่อจาก profile-schema.sql ใน Supabase Dashboard > SQL Editor
--
-- ⚠️ ต้องเปิด Anonymous sign-ins ก่อน:
--    Authentication > Providers > Allow anonymous sign-ins
-- ============================================================

-- ---------- 1. ผูกโปรไฟล์กับผู้ใช้ ----------
-- nullable เพราะโปรไฟล์ที่สมัครไว้ก่อนหน้านี้ยังไม่มีเจ้าของ
-- โปรไฟล์เก่าจะถูก claim อัตโนมัติเมื่อเจ้าของกลับมาเปิดเว็บ (ดูฟังก์ชัน claim_profile)
alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- ผู้ใช้หนึ่งคนมีได้โปรไฟล์เดียว
create unique index if not exists profiles_user_id_key
  on public.profiles (user_id)
  where user_id is not null;

-- ---------- 2. RLS ของ profiles ----------
-- อ่านได้ทุกคน (บอร์ดต้องโชว์) แต่สร้างได้เฉพาะในนามตัวเอง
drop policy if exists "public create profile" on public.profiles;
drop policy if exists "create own profile" on public.profiles;

create policy "create own profile" on public.profiles
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(trim(nickname)) between 2 and 20
    and char_length(device_id) between 8 and 64
  );

-- ยังไม่มี policy สำหรับ UPDATE โดยตั้งใจ
-- ตัวนับอันดับแก้ได้ผ่าน trigger เท่านั้น ส่วนข้อมูลร่างกายแก้ผ่าน RPC ด้านล่าง

-- ---------- 3. RLS ของ burn_logs ----------
-- เดิมใครก็ยิง insert ได้ ตอนนี้ต้องเป็นเจ้าของโปรไฟล์นั้นจริงเท่านั้น
drop policy if exists "public insert burn log" on public.burn_logs;
drop policy if exists "insert own burn log" on public.burn_logs;

create policy "insert own burn log" on public.burn_logs
  for insert to authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = burn_logs.profile_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "public settle burn log" on public.burn_logs;
drop policy if exists "settle own burn log" on public.burn_logs;

create policy "settle own burn log" on public.burn_logs
  for update to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = burn_logs.profile_id
        and p.user_id = auth.uid()
    )
  )
  with check (status = 'paid');

-- ---------- 4. รับโปรไฟล์เป็นของตัวเอง ----------
-- ใช้ 2 กรณี: กู้ยศด้วยรหัสจากเครื่องเดิม และโปรไฟล์เก่าที่สร้างก่อนมีระบบ auth
--
-- device_id ทำหน้าที่เป็นกุญแจ ใครถือก็อ้างสิทธิ์ได้ ซึ่งเป็นความหมายของ
-- "รหัสกู้ยศ" อยู่แล้ว ค่านี้เป็น UUID v4 จึงเดาไม่ได้
create or replace function public.claim_profile(p_device_id text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน (anonymous session)';
  end if;

  update public.profiles
     set user_id = auth.uid(),
         updated_at = now()
   where device_id = p_device_id
  returning * into result;

  if result.id is null then
    raise exception 'ไม่พบโปรไฟล์ที่ตรงกับรหัสนี้';
  end if;

  return result;
end;
$$;

revoke all on function public.claim_profile(text) from public;
grant execute on function public.claim_profile(text) to authenticated;

-- ---------- 5. แก้ข้อมูลร่างกาย — ผูกกับ auth.uid() แทน device_id ----------
drop function if exists public.update_body_profile(text, text, text, numeric, numeric, int);

create or replace function public.update_my_profile(
  p_nickname  text,
  p_gender    text,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_age       int
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  update public.profiles
     set nickname   = coalesce(nullif(trim(p_nickname), ''), nickname),
         gender     = p_gender,
         height_cm  = p_height_cm,
         weight_kg  = p_weight_kg,
         age        = p_age,
         updated_at = now()
   where user_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'ไม่พบโปรไฟล์ของคุณ';
  end if;

  return result;
end;
$$;

revoke all on function public.update_my_profile(text, text, numeric, numeric, int) from public;
grant execute on function public.update_my_profile(text, text, numeric, numeric, int) to anon, authenticated;

-- ============================================================
-- สิ่งที่เปลี่ยนไปจากเดิม
--
-- ก่อน: ใครก็ยิง API สร้างโปรไฟล์ปลอมหรือกดชดใช้แทนคนอื่นได้
-- หลัง: ต้องมี session ของตัวเองและเป็นเจ้าของโปรไฟล์นั้นจริง
--
-- ⚠️ ข้อแลกเปลี่ยนที่ต้องรู้: anonymous sign-in สร้างแถวใน auth.users
--    ซึ่งนับเป็น MAU (free tier 50,000 คน/เดือน)
--    ถ้าวันหนึ่งมีคนสแปมจนใกล้เพดาน ให้เปิด CAPTCHA ที่
--    Authentication > Settings > Enable Captcha protection
--    (Cloudflare Turnstile ใช้ฟรี)
-- ============================================================
