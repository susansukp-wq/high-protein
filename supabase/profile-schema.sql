-- ============================================================
-- "ลดน้ำหนักไม่มีคำว่าปลอบใจ" — ข้อมูลร่างกายในโปรไฟล์ (Migration #3)
-- รันต่อจาก rank-schema.sql ใน Supabase Dashboard > SQL Editor
-- ============================================================

-- เพิ่มข้อมูลร่างกายเพื่อคำนวณ BMR/TDEE รายบุคคล
-- ตั้งเป็น nullable เพราะโปรไฟล์ที่สมัครไว้ก่อนหน้านี้ยังไม่มีข้อมูลชุดนี้
alter table public.profiles
  add column if not exists gender    text check (gender in ('male', 'female', 'other')),
  add column if not exists height_cm numeric(5,1) check (height_cm between 100 and 250),
  add column if not exists weight_kg numeric(5,1) check (weight_kg between 20 and 400),
  add column if not exists age       int          check (age between 10 and 120);

-- ---------- อนุญาตให้เจ้าของแก้ข้อมูลร่างกายของตัวเอง ----------
-- จงใจไม่เปิด UPDATE ทั้งตาราง เพราะจะทำให้ปั้นแต้มอันดับได้
-- ใช้ security definer function ที่แก้ได้เฉพาะ 4 คอลัมน์นี้แทน
create or replace function public.update_body_profile(
  p_device_id text,
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
  update public.profiles
     set nickname   = coalesce(nullif(trim(p_nickname), ''), nickname),
         gender     = p_gender,
         height_cm  = p_height_cm,
         weight_kg  = p_weight_kg,
         age        = p_age,
         updated_at = now()
   where device_id = p_device_id
  returning * into result;

  if result.id is null then
    raise exception 'ไม่พบโปรไฟล์ของเครื่องนี้';
  end if;

  return result;
end;
$$;

revoke all on function public.update_body_profile(text, text, text, numeric, numeric, int) from public;
grant execute on function public.update_body_profile(text, text, text, numeric, numeric, int) to anon, authenticated;
