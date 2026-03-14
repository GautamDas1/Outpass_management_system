-- ============================================================
-- OutPass Management System — Supabase Schema
-- Run this entire file in Supabase > SQL Editor > New query
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── STUDENTS ────────────────────────────────────────────────
create table if not exists public.students (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  register_no     text not null unique,
  department      text not null,
  section         text not null,
  room_no         text,
  year            int  not null check (year between 1 and 5),
  semester        int  not null check (semester between 1 and 10),
  category        char(1) not null check (category in ('H', 'D')),
  is_blacklisted  boolean not null default false,
  blacklist_reason text,
  blacklist_until  timestamptz,
  created_at      timestamptz default now()
);

-- ─── STAFF ───────────────────────────────────────────────────
create table if not exists public.staff (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null unique,
  designation  text not null check (designation in ('Advisor', 'HOD', 'Warden')),
  department   text not null,
  section      text,
  created_at   timestamptz default now()
);

-- ─── GATEKEEPERS ─────────────────────────────────────────────
create table if not exists public.gatekeepers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null unique,
  password   text not null,
  created_at timestamptz default now()
);

-- ─── OUTPASSES ───────────────────────────────────────────────
create table if not exists public.outpasses (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid references public.students(id) on delete cascade,
  student_name      text not null,
  student_email     text not null,
  register_no       text not null,
  department        text not null,
  section           text not null,
  semester          int  not null,
  year              int  not null,
  room_no           text,
  purpose           text not null,
  out_date          date not null,
  in_date           date not null,
  time_out          text not null,
  time_in           text not null,
  status            text not null default 'pending_advisor'
                    check (status in (
                      'pending_advisor','pending_hod','pending_warden',
                      'approved','rejected','expired'
                    )),
  -- Advisor
  advisor_id        uuid references public.staff(id),
  advisor_name      text,
  advisor_action    text check (advisor_action in ('approved','rejected')),
  advisor_remark    text,
  advisor_action_at timestamptz,
  -- HOD
  hod_id            uuid references public.staff(id),
  hod_name          text,
  hod_action        text check (hod_action in ('approved','rejected')),
  hod_remark        text,
  hod_action_at     timestamptz,
  -- Warden
  warden_id         uuid references public.staff(id),
  warden_name       text,
  warden_action     text check (warden_action in ('approved','rejected')),
  warden_remark     text,
  warden_action_at  timestamptz,
  -- QR & Gate
  qr_code           text,
  scanned_out       boolean default false,
  scanned_out_at    timestamptz,
  scanned_in        boolean default false,
  scanned_in_at     timestamptz,
  -- Timestamps
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── ANNOUNCEMENTS ───────────────────────────────────────────
create table if not exists public.announcements (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  message            text not null,
  staff_id           uuid references public.staff(id) on delete set null,
  staff_name         text not null,
  staff_designation  text not null,
  target_department  text,     -- null = all departments
  created_at         timestamptz default now()
);

-- ─── INDEXES ─────────────────────────────────────────────────
create index if not exists idx_students_email        on public.students(email);
create index if not exists idx_students_blacklisted  on public.students(is_blacklisted) where is_blacklisted = true;
create index if not exists idx_staff_email           on public.staff(email);
create index if not exists idx_staff_designation     on public.staff(designation);
create index if not exists idx_staff_dept            on public.staff(department);
create index if not exists idx_outpasses_student     on public.outpasses(student_id);
create index if not exists idx_outpasses_advisor     on public.outpasses(advisor_id);
create index if not exists idx_outpasses_status      on public.outpasses(status);
create index if not exists idx_outpasses_department  on public.outpasses(department);
create index if not exists idx_outpasses_created     on public.outpasses(created_at desc);
create index if not exists idx_announcements_created on public.announcements(created_at desc);

-- ─── AUTO-EXPIRE BLACKLIST FUNCTION ──────────────────────────
-- This runs as a scheduled job or can be triggered on read.
-- To schedule: Supabase Dashboard > Database > Extensions > pg_cron
-- Then run: select cron.schedule('expire-blacklists', '*/15 * * * *', $$
--   update public.students
--   set is_blacklisted = false, blacklist_reason = null, blacklist_until = null
--   where is_blacklisted = true
--     and blacklist_until is not null
--     and blacklist_until < now();
-- $$);

create or replace function public.expire_blacklists()
returns void language plpgsql security definer as $$
begin
  update public.students
  set is_blacklisted = false,
      blacklist_reason = null,
      blacklist_until = null
  where is_blacklisted = true
    and blacklist_until is not null
    and blacklist_until < now();
end;
$$;

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger outpasses_updated_at
  before update on public.outpasses
  for each row execute function public.set_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table public.students     enable row level security;
alter table public.staff        enable row level security;
alter table public.gatekeepers  enable row level security;
alter table public.outpasses    enable row level security;
alter table public.announcements enable row level security;

-- Allow all authenticated users to read/write (tighten per role in production)
create policy "Authenticated full access - students"
  on public.students for all using (true) with check (true);

create policy "Authenticated full access - staff"
  on public.staff for all using (true) with check (true);

create policy "Authenticated full access - gatekeepers"
  on public.gatekeepers for all using (true) with check (true);

create policy "Authenticated full access - outpasses"
  on public.outpasses for all using (true) with check (true);

create policy "Authenticated full access - announcements"
  on public.announcements for all using (true) with check (true);

-- ─── ENABLE REALTIME ─────────────────────────────────────────
alter publication supabase_realtime add table public.outpasses;
alter publication supabase_realtime add table public.announcements;

-- ─── DONE ────────────────────────────────────────────────────
-- After running this, go to: Authentication > Providers > Google
-- and enable Google OAuth with your credentials.
