-- ============================================================================
-- SouthGold Montessori School Portal — Supabase PostgreSQL Schema
-- Run this entire script in the Supabase SQL Editor (or via `supabase db push`).
-- Derived directly from src/types.ts, server.ts seed data and src/data/mockData.ts.
-- No destructive operations; safe to run on a fresh project.
-- ============================================================================

-- ---------- ENUMS ----------
do $$ begin
  create type user_role as enum
    ('SUPER_ADMIN','SCHOOL_ADMIN','TEACHER','PARENT','STUDENT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('Active','Inactive','Suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gender_type as enum ('Male','Female','Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('Present','Absent','Late');
exception when duplicate_object then null; end $$;

do $$ begin
  create type school_term as enum ('First Term','Second Term','Third Term');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fee_status as enum ('Paid','Partially Paid','Unpaid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('Open','In Progress','Resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_category as enum
    ('Announcement','Academic','Billing','System');
exception when duplicate_object then null; end $$;

do $$ begin
  create type entity_type as enum ('Student','Staff');
exception when duplicate_object then null; end $$;

-- ---------- USERS (app-level profile, mirrors auth.users) ----------
-- NOTE: Passwords are managed & securely hashed by Supabase Auth
-- (table auth.users). This public.users row stores the app profile and
-- role; it is linked 1:1 to auth.users via the UUID primary key.
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  user_role user_role not null,
  status user_status not null default 'Active',
  can_change_password boolean not null default false,
  linked_id text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every row update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated on users;
create trigger trg_users_updated
  before update on users
  for each row execute function set_updated_at();

-- ---------- SUPER ADMIN ----------
create table if not exists super_admins (
  user_id uuid primary key references users(id) on delete cascade,
  email text not null,
  full_name text
);

-- ---------- STAFF ADMIN ----------
create table if not exists staff_admins (
  user_id uuid primary key references users(id) on delete cascade,
  email text not null,
  full_name text,
  department text,
  permissions jsonb not null default '{}'::jsonb,
  created_by uuid references users(id)
);

-- ---------- TEACHERS ----------
create table if not exists teachers (
  id text primary key,                       -- e.g. tch_1
  staff_id text,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  department text,
  status user_status not null default 'Active',
  user_id uuid unique references users(id) on delete set null,
  classes_assigned jsonb not null default '[]'::jsonb
);

-- ---------- PARENTS ----------
create table if not exists parents (
  id text primary key,                       -- e.g. par_1
  first_name text not null,
  last_name text,
  email text unique not null,
  phone text,
  address text,
  status user_status not null default 'Active',
  user_id uuid unique references users(id) on delete set null,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ---------- STUDENTS ----------
create table if not exists students (
  id text primary key,                       -- e.g. std_1
  admission_no text unique,
  first_name text not null,
  last_name text,
  photo text,
  gender gender_type,
  date_of_birth text,
  parent_id text not null references parents(id) on delete restrict, -- one parent only
  parent_name text,
  parent_email text,
  parent_phone text,
  class_id text,
  arm text default 'A',
  status user_status not null default 'Active',
  subjects text[] not null default '{}',
  user_id uuid unique references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_students_parent on students(parent_id);
create index if not exists idx_students_class on students(class_id);

-- ---------- SUBJECTS ----------
create table if not exists subjects (
  id text primary key,                       -- e.g. maths
  name text not null,
  code text unique
);

-- ---------- CLASSES ----------
create table if not exists classes (
  class_id text primary key,                 -- e.g. Primary 1
  stage text,                                -- Pre-School | Primary | Secondary
  class_teacher_id text references teachers(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- CLASSES <-> SUBJECTS ----------
create table if not exists classes_subjects (
  class_id text primary key references classes(class_id) on delete cascade,
  subjects text[] not null default '{}',
  stage text
);

-- ---------- SESSIONS ----------
create table if not exists sessions (
  id text primary key,                       -- e.g. sess_1
  name text unique not null,
  is_active boolean not null default false,
  start_date text,
  end_date text
);

-- ---------- ATTENDANCE ----------
create table if not exists attendance (
  id text primary key,
  date text not null,
  entity_id text not null,
  entity_type entity_type not null,
  status attendance_status not null,
  remark text,
  session text,
  term school_term
);

create index if not exists idx_attendance_entity on attendance(entity_id, date);

-- ---------- RESULTS ----------
create table if not exists results (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  class_id text,
  arm text,
  subject_id text references subjects(id) on delete set null,
  term school_term,
  session text,
  test_score integer default 0,
  assignment_score integer default 0,
  exam_score integer default 0,
  total_score integer default 0,
  grade text,
  teacher_remark text,
  is_approved boolean not null default false,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now()
);

create index if not exists idx_results_student on results(student_id);
create index if not exists idx_results_class on results(class_id, arm, term, session);

-- ---------- FEES ----------
create table if not exists fees (
  id text primary key,
  student_id text not null references students(id) on delete cascade,
  title text,
  amount numeric not null default 0,
  amount_paid numeric not null default 0,
  status fee_status not null default 'Unpaid',
  due_date text,
  transaction_history jsonb not null default '[]'::jsonb
);

create index if not exists idx_fees_student on fees(student_id);

-- ---------- NOTIFICATIONS ----------
create table if not exists notifications (
  id text primary key,
  title text,
  content text,
  category notification_category,
  date text,
  recipient_role text  -- 'ALL' or a user_role value
);

-- ---------- TICKETS ----------
create table if not exists tickets (
  id text primary key,
  sender_name text,
  sender_email text,
  sender_role text,
  subject text,
  message text,
  status ticket_status not null default 'Open',
  created_at text,
  replies jsonb not null default '[]'::jsonb
);

-- ---------- ACTIVITIES ----------
create table if not exists activities (
  id text primary key,
  title text,
  badge text,
  description text,
  img_url text,
  footer text
);

-- ---------- CONFIGURATIONS ----------
create table if not exists configurations (
  id text primary key default 'global',
  current_term school_term default 'First Term',
  current_session_id text,
  resumption_date text,
  closing_date text,
  grading_scale jsonb not null default '[]'::jsonb,
  ca_test_max integer default 20,
  ca_assignment_max integer default 20,
  exam_max integer default 60,
  logo_url text,
  school_name text default 'SOUTHGOLD MONTESSORI SCHOOL',
  school_address text default '3, Fagbeyi Ige, Olusi crescent, Hopeville Estate, Haruna B/Stop. Sangotedo, Lagos, Nigeria',
  school_email text default 'southgoldmontessorischools@gmail.com',
  school_phone text default '+234 803 123 4567'
);

-- ---------- Row Level Security ----------
-- The Express backend uses the service_role key, which bypasses RLS.
-- RLS is enabled but left permissive; tighten with auth.uid() policies when
-- the frontend is switched to talk to Supabase directly.
alter table users enable row level security;
alter table super_admins enable row level security;
alter table staff_admins enable row level security;
alter table teachers enable row level security;
alter table parents enable row level security;
alter table students enable row level security;
alter table subjects enable row level security;
alter table classes enable row level security;
alter table classes_subjects enable row level security;
alter table sessions enable row level security;
alter table attendance enable row level security;
alter table results enable row level security;
alter table fees enable row level security;
alter table notifications enable row level security;
alter table tickets enable row level security;
alter table activities enable row level security;
alter table configurations enable row level security;

do $$ begin
  create policy "service_role_all" on users for all using (true) with check (true);
  create policy "service_role_all" on super_admins for all using (true) with check (true);
  create policy "service_role_all" on staff_admins for all using (true) with check (true);
  create policy "service_role_all" on teachers for all using (true) with check (true);
  create policy "service_role_all" on parents for all using (true) with check (true);
  create policy "service_role_all" on students for all using (true) with check (true);
  create policy "service_role_all" on subjects for all using (true) with check (true);
  create policy "service_role_all" on classes for all using (true) with check (true);
  create policy "service_role_all" on classes_subjects for all using (true) with check (true);
  create policy "service_role_all" on sessions for all using (true) with check (true);
  create policy "service_role_all" on attendance for all using (true) with check (true);
  create policy "service_role_all" on results for all using (true) with check (true);
  create policy "service_role_all" on fees for all using (true) with check (true);
  create policy "service_role_all" on notifications for all using (true) with check (true);
  create policy "service_role_all" on tickets for all using (true) with check (true);
  create policy "service_role_all" on activities for all using (true) with check (true);
  create policy "service_role_all" on configurations for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ---------- Seed: default configuration row ----------
insert into configurations (id, current_term, current_session_id, resumption_date, closing_date, grading_scale, ca_test_max, ca_assignment_max, exam_max)
values ('global', 'Third Term', 'sess_1', '2026-05-11', '2026-07-16',
  '[{"grade":"A","minScore":85,"remark":"Excellent"},{"grade":"B","minScore":70,"remark":"Very Good"},{"grade":"C","minScore":55,"remark":"Credit"},{"grade":"P","minScore":40,"remark":"Pass"},{"grade":"F","minScore":0,"remark":"Fail"}]'::jsonb,
  20, 20, 60)
on conflict (id) do nothing;
