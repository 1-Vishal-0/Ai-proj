-- Fresh Supabase test project only.
-- Paste this entire file into one SQL Editor query and run it once.
-- This installs the portal schema and fictional academic data.
-- It links student@attendance.example automatically when that Auth user already exists and is confirmed.
begin;

do $$
begin
  if to_regclass('public.user_profiles') is not null
    or to_regclass('public.departments') is not null
    or to_regclass('public.institutions') is not null then
    raise exception 'This project already has portal tables. Use the database migration guide instead.';
  end if;
end;
$$;


-- 20261125000100_existing_schema.sql
-- Smart Attendance & Teacher Management Portal
-- PostgreSQL / Supabase Relational Database Schema

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Classes
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    semester INT NOT NULL CHECK (semester >= 1 AND semester <= 12),
    academic_year VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_class_dept_name UNIQUE(department_id, name, academic_year)
);

-- 3. Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    credits INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Profiles (Extending auth.users or standalone table)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- References auth.users(id) in Supabase
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    avatar_url TEXT,
    phone VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Teachers
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation VARCHAR(100) NOT NULL DEFAULT 'Assistant Professor',
    qualification VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Students
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) NOT NULL UNIQUE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    admission_year INT NOT NULL,
    guardian_email VARCHAR(255),
    guardian_phone VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Teacher Assignments
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_teacher_assignment UNIQUE(teacher_id, subject_id, class_id, academic_year)
);

-- 8. Attendance Sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    session_type VARCHAR(30) NOT NULL DEFAULT 'lecture' CHECK (session_type IN ('lecture', 'lab', 'tutorial')),
    code VARCHAR(10),
    code_expires_at TIMESTAMPTZ,
    is_code_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_session UNIQUE(class_id, subject_id, date, start_time)
);

-- 9. Attendance Records (Enforce duplicate attendance prevention)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
    marked_by VARCHAR(30) NOT NULL DEFAULT 'teacher' CHECK (marked_by IN ('teacher', 'code', 'correction')),
    remarks TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_session_student_attendance UNIQUE(session_id, student_id)
);

-- 10. Correction Requests
CREATE TABLE IF NOT EXISTS correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    current_status VARCHAR(20) NOT NULL,
    requested_status VARCHAR(20) NOT NULL CHECK (requested_status IN ('present', 'leave')),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'alert')),
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name VARCHAR(150),
    user_role VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Institution Settings
CREATE TABLE IF NOT EXISTS institution_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threshold_percentage NUMERIC(5,2) NOT NULL DEFAULT 75.00,
    warning_threshold NUMERIC(5,2) NOT NULL DEFAULT 80.00,
    institution_name VARCHAR(200) NOT NULL DEFAULT 'National Institute of Engineering & Technology',
    academic_term VARCHAR(100) NOT NULL DEFAULT 'Fall Semester 2026',
    auto_alerts_enabled BOOLEAN DEFAULT TRUE,
    code_duration_minutes_default INT DEFAULT 10
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class_subject ON attendance_sessions(class_id, subject_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- The baseline may be applied to a Supabase project before the access migration.
-- Close its API surface during that interval, including previously installed baseline tables.
do $$
declare tbl text;
begin
  foreach tbl in array array['departments','classes','subjects','user_profiles','teachers','students',
    'teacher_assignments','attendance_sessions','attendance_records','correction_requests','notifications','audit_logs',
    'institution_settings'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on public.%I from public, anon, authenticated', tbl);
  end loop;
end;
$$;

-- 20261125000200_multi_user_schema.sql
-- Keep the original tables and IDs. Existing rows stay inaccessible until explicitly linked to an institution.
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200)
);
alter table public.departments add column institution_id uuid references public.institutions;
alter table public.user_profiles
  add constraint user_profiles_auth_id_fkey foreign key (auth_id) references auth.users(id) on delete set null not valid,
  add column institution_id uuid references public.institutions,
  add column department_id uuid references public.departments,
  add column enabled boolean not null default true;
alter table public.user_profiles drop constraint user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check check (role in ('admin','hod','teacher','student'));
alter table public.user_profiles add constraint profile_scope check (
  institution_id is null or (role = 'admin' and department_id is null)
  or (role in ('hod','teacher','student') and department_id is not null)
);
alter table public.departments drop constraint departments_code_key;
create unique index department_code_per_institution on public.departments(institution_id, upper(trim(code)));
alter table public.user_profiles drop constraint user_profiles_email_key;
create unique index profile_email_per_institution on public.user_profiles(institution_id, lower(trim(email)));
alter table public.departments
  add column hod_name text, add column student_intake int check (student_intake >= 0),
  add column sections_count int check (sections_count >= 0), add column is_active boolean not null default true;

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments,
  name text not null check (length(trim(name)) between 1 and 150),
  code text not null check (length(trim(code)) between 1 and 30),
  degree_level text not null check (degree_level in ('UG','PG')),
  duration_years int not null check (duration_years between 1 and 10),
  is_active boolean not null default true
);
create unique index programme_code_per_department on public.programmes(department_id, upper(trim(code)));
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions,
  label text not null check (label ~ '^[0-9]{4}-[0-9]{4}$'),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  unique(institution_id, label)
);
create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years,
  number int not null check (number between 1 and 12),
  unique(academic_year_id, number)
);
create table public.vtu_schemes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions,
  name text not null check (length(trim(name)) between 1 and 150),
  code text not null check (length(trim(code)) between 1 and 30),
  effective_from_year int not null check (effective_from_year between 1900 and 2200),
  total_credits int not null check (total_credits between 0 and 1000),
  is_active boolean not null default true,
  syllabus_url text check (syllabus_url is null or syllabus_url ~ '^https?://'),
  description text
);
create unique index scheme_code_per_institution on public.vtu_schemes(institution_id, upper(trim(code)));
-- classes represents sections. Keep the legacy labels for compatibility with the portal.
alter table public.classes
  add column programme_id uuid references public.programmes,
  add column vtu_scheme_id uuid references public.vtu_schemes,
  add column semester_id uuid references public.semesters,
  add column section text not null default 'A' check (length(trim(section)) between 1 and 20),
  add column admission_batch text not null default '';
create unique index class_section_per_semester on public.classes(programme_id, semester_id, vtu_scheme_id, upper(trim(section)));
alter table public.subjects drop constraint subjects_code_key;
alter table public.subjects
  add column abbreviation text not null default '',
  add column programme_id uuid references public.programmes,
  add column vtu_scheme_id uuid references public.vtu_schemes,
  add column semester int not null default 1 check (semester between 1 and 12),
  add column category text not null default 'PCC' check (category in ('BSC','ESC','PCC','PEC','OEC','HSMC','AEC','SEC','PCCL','PROJ','INT','MC')),
  add column course_type text not null default 'theory' check (course_type in ('theory','practical','integrated')),
  add column teaching_hours int not null default 3 check (teaching_hours between 0 and 500),
  add column cie_marks int not null default 50 check (cie_marks between 0 and 1000),
  add column see_marks int not null default 50 check (see_marks between 0 and 1000),
  add column syllabus_doc_ref text,
  add column is_active boolean not null default true,
  add constraint subject_credits check (credits between 0 and 100) not valid;
create unique index subject_code_per_scheme on public.subjects(department_id, vtu_scheme_id, upper(trim(code)));

alter table public.teachers drop constraint teachers_employee_id_key;
create unique index employee_per_department on public.teachers(department_id, upper(trim(employee_id)));
alter table public.students drop constraint students_roll_number_key;
alter table public.students add column usn text, add column admission_batch text not null default '';
create unique index roll_per_department on public.students(department_id, upper(trim(roll_number)));
create unique index usn_per_department on public.students(department_id, upper(trim(usn)));
create index classes_department on public.classes(department_id);
create index students_class on public.students(class_id);
create index students_department on public.students(department_id);
create index assignments_class_subject on public.teacher_assignments(class_id, subject_id, teacher_id);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students,
  class_id uuid not null references public.classes,
  enrolled_from date not null,
  enrolled_until date check (enrolled_until >= enrolled_from),
  unique(student_id, class_id)
);
create index enrollments_class_dates on public.enrollments(class_id, enrolled_from, enrolled_until);

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions,
  teacher_id uuid not null references public.teachers,
  subject_id uuid not null references public.subjects,
  class_id uuid not null references public.classes,
  academic_year text not null,
  classroom text not null check(length(trim(classroom)) between 1 and 80),
  day_of_week text not null check(day_of_week in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  period_number int not null check(period_number between 1 and 24),
  start_time time not null,
  end_time time not null check(end_time > start_time),
  unique(teacher_id, academic_year, day_of_week, period_number),
  unique(class_id, academic_year, day_of_week, period_number)
);
create unique index timetable_room_period on public.timetable_slots(institution_id, academic_year, day_of_week, period_number, lower(trim(classroom)));
create table public.timetable_change_logs (
  id uuid primary key default gen_random_uuid(),
  timetable_entry_id uuid not null,
  teacher_id uuid not null references public.teachers,
  teacher_name text not null,
  class_id uuid not null references public.classes,
  class_name text not null,
  subject_code text not null,
  subject_name text not null,
  old_day text not null, old_period int not null, old_classroom text not null,
  new_day text not null, new_period int not null, new_classroom text not null,
  change_type text not null default 'reschedule',
  reason text not null,
  timestamp timestamptz not null default now(),
  status text not null default 'applied'
);
create table public.academic_activities (
  id uuid primary key default gen_random_uuid(),
  name text not null, course_code text not null, semester int not null check(semester between 1 and 12),
  department_id uuid not null references public.departments, academic_year text not null,
  faculty_coordinator text not null, credits int check(credits >= 0),
  status text not null check(status in ('active','completed','ongoing')), description text
);
alter table public.attendance_sessions
  add column timetable_entry_id uuid references public.timetable_slots on delete set null,
  add constraint attendance_time_order check (end_time > start_time) not valid;
create index sessions_teacher_class on public.attendance_sessions(teacher_id,class_id,subject_id);
alter table public.correction_requests
  add column reviewed_by_profile_id uuid references public.user_profiles,
  add constraint correction_status_valid check (current_status in ('present','absent','leave')) not valid;
-- Legacy duplicate requests remain available for operator review. New requests must be unique while pending.
alter table public.correction_requests add column enforce_pending_uniqueness boolean not null default false;
alter table public.correction_requests alter column enforce_pending_uniqueness set default true;
create unique index pending_correction_per_record on public.correction_requests(session_id, student_id)
  where status = 'pending' and enforce_pending_uniqueness;
create index correction_student on public.correction_requests(student_id);
create index correction_session on public.correction_requests(session_id);
alter table public.institution_settings
  add column institution_id uuid unique references public.institutions,
  add column short_name text not null default 'Academic Portal',
  add column established_year int not null default 2000 check(established_year between 1000 and 2200),
  add column location text not null default '', add column affiliation text not null default '',
  add column management text not null default '', add column current_academic_year text not null default '',
  add column leave_counts_as_present boolean not null default false,
  add column time_zone text not null default 'Asia/Kolkata',
  add constraint valid_thresholds check (threshold_percentage between 0 and 100 and warning_threshold between threshold_percentage and 100) not valid,
  add constraint valid_code_duration check (code_duration_minutes_default between 1 and 60) not valid;
alter table public.audit_logs
  add column institution_id uuid references public.institutions,
  add column department_id uuid references public.departments,
  add constraint audit_profile_fk foreign key (user_id) references public.user_profiles on delete set null not valid;
create index audit_institution_timestamp on public.audit_logs(institution_id, timestamp desc);

-- 20261125000300_portal_access.sql
create schema attendance_private;
revoke all on schema attendance_private from public;
grant usage on schema attendance_private to authenticated;

create function attendance_private.actor() returns public.user_profiles
language sql stable security definer set search_path = '' as $$
  select p from public.user_profiles p
  where p.auth_id = auth.uid() and p.enabled and p.institution_id is not null
    and (p.role = 'admin' or exists (
      select 1 from public.departments d where d.id = p.department_id and d.institution_id = p.institution_id
    ));
$$;
create function attendance_private.same_institution(i uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(i = (attendance_private.actor()).institution_id, false)
$$;
create function attendance_private.is_admin(i uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(i = a.institution_id and a.role = 'admin', false) from attendance_private.actor() a
$$;
create function attendance_private.department_in_scope(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.departments where id = d and attendance_private.same_institution(institution_id))
$$;
create function attendance_private.manages_department(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.departments dep cross join attendance_private.actor() a
    where dep.id = d and dep.institution_id = a.institution_id
      and (a.role = 'admin' or (a.role = 'hod' and a.department_id = d))
  )
$$;
create function attendance_private.own_student(s uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.students st cross join attendance_private.actor() a
    where st.id = s and st.user_id = a.id and st.department_id = a.department_id and a.role = 'student')
$$;
create function attendance_private.own_teacher(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.teachers te cross join attendance_private.actor() a
    where te.id = t and te.user_id = a.id and te.department_id = a.department_id and a.role = 'teacher')
$$;
create function attendance_private.valid_assignment(t uuid, c uuid, s uuid, y text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes cl
    join public.departments cd on cd.id = cl.department_id
    join public.subjects su on su.id = s
    join public.teachers te on te.id = t
    join public.departments td on td.id = te.department_id
    join public.user_profiles p on p.id = te.user_id
    where cl.id = c and cl.academic_year = y
      and cd.institution_id is not null and td.institution_id = cd.institution_id
      and p.institution_id = cd.institution_id and p.department_id = td.id and p.role = 'teacher'
      and su.department_id = cd.id and su.semester = cl.semester and su.vtu_scheme_id = cl.vtu_scheme_id
      and (su.programme_id is null or su.programme_id = cl.programme_id)
  )
$$;
create function attendance_private.can_manage_class(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.classes cl where cl.id = c
    and attendance_private.manages_department(cl.department_id))
$$;
create function attendance_private.assigned_teacher(c uuid, s uuid, t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.teacher_assignments x
    where x.class_id = c and x.subject_id = s and x.teacher_id = t
      and attendance_private.own_teacher(t)
      and attendance_private.valid_assignment(t,c,s,x.academic_year)
  )
$$;
create function attendance_private.can_teach_class(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.teacher_assignments x where x.class_id = c
    and attendance_private.assigned_teacher(c,x.subject_id,x.teacher_id))
$$;
create function attendance_private.in_class(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e join public.students s on s.id = e.student_id
    join public.classes cl on cl.id = e.class_id
    where e.class_id = c and cl.department_id = s.department_id and attendance_private.own_student(s.id)
  )
$$;
create function attendance_private.can_manage_session(c uuid, s uuid, t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes cl where cl.id = c
      and attendance_private.valid_assignment(t,c,s,cl.academic_year)
      and (attendance_private.can_manage_class(c) or attendance_private.assigned_teacher(c,s,t))
  )
$$;
create function attendance_private.can_manage_record(session uuid, student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.attendance_sessions se
    join public.classes cl on cl.id = se.class_id
    join public.students st on st.id = student and st.department_id = cl.department_id
    join public.enrollments e on e.student_id = st.id and e.class_id = cl.id
    where se.id = session and se.date >= e.enrolled_from and (e.enrolled_until is null or se.date <= e.enrolled_until)
      and attendance_private.can_manage_session(se.class_id,se.subject_id,se.teacher_id)
  )
$$;
create function attendance_private.can_read_student(s uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students st
    join public.departments d on d.id = st.department_id
    join public.user_profiles p on p.id = st.user_id and p.role = 'student'
    where st.id = s and p.institution_id = d.institution_id and p.department_id = d.id
    and (attendance_private.own_student(s) or attendance_private.manages_department(st.department_id)
      or exists(select 1 from public.enrollments e join public.classes cl on cl.id = e.class_id
        where e.student_id = s and cl.department_id = st.department_id and attendance_private.can_teach_class(e.class_id)))
  )
$$;
create function attendance_private.student_has_session(s uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.attendance_records r join public.attendance_sessions se on se.id = r.session_id
    join public.classes c on c.id = se.class_id join public.subjects su on su.id = se.subject_id
    join public.students st on st.id = r.student_id join public.teachers te on te.id = se.teacher_id
    join public.enrollments e on e.student_id = st.id and e.class_id = c.id
    where r.session_id = s and attendance_private.own_student(st.id)
      and c.department_id = st.department_id and su.department_id = c.department_id
      and attendance_private.department_in_scope(te.department_id)
      and se.date >= e.enrolled_from and (e.enrolled_until is null or se.date <= e.enrolled_until)
  )
$$;
create function attendance_private.valid_class_metadata(d uuid, p uuid, v uuid, sm uuid, n int, y text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.departments dep
    join public.programmes pr on pr.id = p and pr.department_id = dep.id
    join public.vtu_schemes vs on vs.id = v and vs.institution_id = dep.institution_id
    join public.semesters se on se.id = sm and se.number = n
    join public.academic_years ay on ay.id = se.academic_year_id and ay.institution_id = dep.institution_id and ay.label = y
    where dep.id = d
  )
$$;
create function attendance_private.valid_subject_metadata(d uuid, p uuid, v uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.departments dep join public.vtu_schemes vs on vs.id = v and vs.institution_id = dep.institution_id
    where dep.id = d and (p is null or exists(select 1 from public.programmes pr where pr.id = p and pr.department_id = d))
  )
$$;

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'institutions','departments','user_profiles','programmes','academic_years','semesters','vtu_schemes',
    'classes','subjects','students','teachers','teacher_assignments','enrollments','timetable_slots',
    'timetable_change_logs','attendance_sessions','attendance_records','correction_requests','notifications',
    'institution_settings','audit_logs','academic_activities'
  ] loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = tbl) then
      raise exception 'Review existing RLS policies on public.% before applying this migration', tbl;
    end if;
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on public.%I from public, anon, authenticated', tbl);
    if tbl not in ('attendance_sessions','user_profiles') then
      execute format('grant select on public.%I to authenticated', tbl);
    end if;
  end loop;
end;
$$;
grant select (id, name, email, role, avatar_url, phone, created_at, institution_id, department_id)
  on public.user_profiles to authenticated;
-- Legacy attendance codes are retained for migration review. The browser cannot retrieve them.
grant select (id, class_id, subject_id, teacher_id, date, start_time, end_time, session_type, timetable_entry_id,
  is_code_active, created_at) on public.attendance_sessions to authenticated;

create policy institutions_read on public.institutions for select to authenticated
  using (attendance_private.same_institution(id));
create policy departments_read on public.departments for select to authenticated
  using (attendance_private.same_institution(institution_id) and ((attendance_private.actor()).role = 'admin'
    or id = (attendance_private.actor()).department_id
    or exists (select 1 from public.classes c where c.department_id = departments.id)));
create policy programmes_read on public.programmes for select to authenticated
  using (attendance_private.manages_department(department_id) or department_id = (attendance_private.actor()).department_id
    or exists (select 1 from public.classes c where c.programme_id = programmes.id));
create policy academic_years_read on public.academic_years for select to authenticated
  using (attendance_private.same_institution(institution_id));
create policy semesters_read on public.semesters for select to authenticated
  using (exists (select 1 from public.academic_years y where y.id = academic_year_id));
create policy schemes_read on public.vtu_schemes for select to authenticated
  using (attendance_private.same_institution(institution_id));
create policy classes_read on public.classes for select to authenticated
  using (attendance_private.can_manage_class(id) or attendance_private.in_class(id) or attendance_private.can_teach_class(id));
create policy subjects_read on public.subjects for select to authenticated
  using (attendance_private.manages_department(department_id)
    or exists (select 1 from public.classes c where c.department_id = subjects.department_id
      and c.semester = subjects.semester and c.vtu_scheme_id = subjects.vtu_scheme_id
      and (subjects.programme_id is null or c.programme_id = subjects.programme_id)
      and (attendance_private.in_class(c.id) or exists (
        select 1 from public.teacher_assignments x where x.class_id = c.id and x.subject_id = subjects.id))));
create policy students_read on public.students for select to authenticated
  using (attendance_private.can_read_student(id));
create policy teachers_read on public.teachers for select to authenticated
  using (attendance_private.own_teacher(id) or attendance_private.manages_department(department_id));
create policy profile_read on public.user_profiles for select to authenticated
  using (attendance_private.same_institution(institution_id) and (
    id = (attendance_private.actor()).id or attendance_private.is_admin(institution_id)
    or attendance_private.manages_department(department_id)
    or (role = 'student' and exists (select 1 from public.students s where s.user_id = user_profiles.id))));
create policy assignments_read on public.teacher_assignments for select to authenticated
  using (attendance_private.can_manage_class(class_id) or attendance_private.assigned_teacher(class_id,subject_id,teacher_id));
create policy enrollment_read on public.enrollments for select to authenticated
  using (attendance_private.own_student(student_id) or attendance_private.can_manage_class(class_id)
    or attendance_private.can_teach_class(class_id));
create policy timetable_read on public.timetable_slots for select to authenticated
  using (attendance_private.same_institution(institution_id) and (
    attendance_private.can_manage_session(class_id,subject_id,teacher_id)
    or (attendance_private.in_class(class_id) and attendance_private.valid_assignment(teacher_id,class_id,subject_id,academic_year))));
create policy change_logs_read on public.timetable_change_logs for select to authenticated
  using (attendance_private.can_manage_class(class_id) or attendance_private.own_teacher(teacher_id));
create policy sessions_read on public.attendance_sessions for select to authenticated
  using (attendance_private.can_manage_session(class_id,subject_id,teacher_id) or attendance_private.student_has_session(id));
create policy records_read on public.attendance_records for select to authenticated
  using ((attendance_private.own_student(student_id) and attendance_private.student_has_session(session_id)) or attendance_private.can_manage_record(session_id,student_id));
create policy corrections_read on public.correction_requests for select to authenticated
  using ((attendance_private.own_student(student_id) and attendance_private.student_has_session(session_id)) or attendance_private.can_manage_record(session_id,student_id));
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = (attendance_private.actor()).id);
create policy activities_read on public.academic_activities for select to authenticated
  using (attendance_private.manages_department(department_id));
create policy settings_read on public.institution_settings for select to authenticated
  using (attendance_private.same_institution(institution_id));
create policy audit_read on public.audit_logs for select to authenticated
  using (attendance_private.is_admin(institution_id) or (attendance_private.same_institution(institution_id)
    and attendance_private.manages_department(department_id)));

-- Direct writes are limited to catalog setup. Transactional workflows use separately granted RPCs.
grant insert on public.departments, public.programmes, public.academic_years, public.semesters, public.vtu_schemes,
  public.classes, public.subjects, public.teacher_assignments, public.timetable_slots to authenticated;
grant delete on public.timetable_slots to authenticated;
create policy departments_insert on public.departments for insert to authenticated
  with check (attendance_private.is_admin(institution_id) and length(trim(name)) > 0 and length(trim(code)) > 0);
create policy programmes_insert on public.programmes for insert to authenticated
  with check (attendance_private.manages_department(department_id));
create policy years_insert on public.academic_years for insert to authenticated
  with check (attendance_private.is_admin(institution_id));
create policy semesters_insert on public.semesters for insert to authenticated
  with check (exists(select 1 from public.academic_years y where y.id = academic_year_id and attendance_private.is_admin(y.institution_id)));
create policy schemes_insert on public.vtu_schemes for insert to authenticated
  with check (attendance_private.is_admin(institution_id));
create policy classes_insert on public.classes for insert to authenticated
  with check (attendance_private.manages_department(department_id) and length(trim(name)) > 0
    and attendance_private.valid_class_metadata(department_id,programme_id,vtu_scheme_id,semester_id,semester,academic_year));
create policy subjects_insert on public.subjects for insert to authenticated
  with check (attendance_private.manages_department(department_id) and length(trim(name)) > 0 and length(trim(code)) > 0
    and attendance_private.valid_subject_metadata(department_id,programme_id,vtu_scheme_id));
create policy assignments_insert on public.teacher_assignments for insert to authenticated
  with check (attendance_private.can_manage_class(class_id) and attendance_private.valid_assignment(teacher_id,class_id,subject_id,academic_year)
    and exists(select 1 from public.teachers t where t.id = teacher_id and attendance_private.manages_department(t.department_id)));
create policy timetable_insert on public.timetable_slots for insert to authenticated
  with check (attendance_private.same_institution(institution_id) and attendance_private.can_manage_class(class_id)
    and exists(select 1 from public.teacher_assignments x where x.class_id = timetable_slots.class_id
      and x.subject_id = timetable_slots.subject_id and x.teacher_id = timetable_slots.teacher_id
      and x.academic_year = timetable_slots.academic_year)
    and attendance_private.valid_assignment(teacher_id,class_id,subject_id,academic_year));
create policy timetable_delete on public.timetable_slots for delete to authenticated
  using (attendance_private.same_institution(institution_id) and attendance_private.can_manage_class(class_id));

create function public.portal_profile_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select (attendance_private.actor()).id
$$;

revoke execute on all functions in schema attendance_private from public, anon, authenticated;
-- Only boolean checks and the actor's own profile are used by policies. Neither schema is granted to anon.
grant execute on all functions in schema attendance_private to authenticated;
revoke execute on function public.portal_profile_id() from public, anon;
grant execute on function public.portal_profile_id() to authenticated;

-- 20261125000400_portal_operations.sql
create function attendance_private.write_audit(action_name text, entity_name text, entity_key uuid, department uuid, detail text)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.user_profiles := attendance_private.actor();
begin
  if a.id is not null then
    insert into public.audit_logs(user_id,user_name,user_role,action,entity,entity_id,details,institution_id,department_id)
    values (a.id,a.name,a.role,action_name,entity_name,entity_key::text,detail,a.institution_id,department);
  end if;
end;
$$;
revoke execute on function attendance_private.write_audit(text,text,uuid,uuid,text) from public, anon, authenticated;

create function attendance_private.audit_catalog() returns trigger
language plpgsql security definer set search_path = '' as $$
declare payload jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
declare department uuid := (payload->>'department_id')::uuid;
begin
  if tg_table_name = 'departments' then
    department := (payload->>'id')::uuid;
  elsif payload ? 'class_id' then
    select c.department_id into department from public.classes c where c.id = (payload->>'class_id')::uuid;
  end if;
  perform attendance_private.write_audit(tg_op,tg_table_name,(payload->>'id')::uuid,department,
    format('%s %s',tg_op,replace(tg_table_name,'_',' ')));
  return null;
end;
$$;
revoke execute on function attendance_private.audit_catalog() from public, anon, authenticated;
do $$
declare tbl text;
begin
  foreach tbl in array array['departments','programmes','academic_years','semesters','vtu_schemes','classes','subjects',
    'teacher_assignments','timetable_slots'] loop
    execute format('create trigger audit_catalog after insert or delete on public.%I for each row execute function attendance_private.audit_catalog()',tbl);
  end loop;
end;
$$;

create function public.portal_save_attendance(
  session_key uuid, class_key uuid, subject_key uuid, teacher_key uuid, session_date date,
  starts time, ends time, kind text, roster jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.user_profiles := attendance_private.actor();
  cl public.classes;
  result public.attendance_sessions;
  today date;
  expected int;
begin
  select * into cl from public.classes where id = class_key;
  if a.id is null or not attendance_private.can_manage_session(class_key,subject_key,teacher_key) then
    raise exception 'Attendance access denied' using errcode = '42501';
  end if;
  if session_key is null then
    select (now() at time zone coalesce((select time_zone from public.institution_settings where institution_id = a.institution_id), 'Asia/Kolkata'))::date into today;
    if session_date is null or session_date > today or starts is null or ends is null or starts >= ends
      or kind is null or kind not in ('lecture','lab','tutorial')
      or not exists (
        select 1 from public.semesters sm join public.academic_years y on y.id = sm.academic_year_id
        where sm.id = cl.semester_id and session_date between y.starts_on and y.ends_on
      ) then
      raise exception 'Choose a valid session date and time within the academic year' using errcode = '22023';
    end if;
    perform 1 from public.teacher_assignments
      where teacher_id = teacher_key and class_id = class_key and subject_id = subject_key and academic_year = cl.academic_year
      for share;
    if not found then raise exception 'Faculty assignment required' using errcode = '42501'; end if;
    insert into public.attendance_sessions(class_id,subject_id,teacher_id,date,start_time,end_time,session_type)
    values (class_key,subject_key,teacher_key,session_date,starts,ends,kind) returning * into result;
  else
    select * into result from public.attendance_sessions where id = session_key and class_id = class_key
      and subject_id = subject_key and teacher_id = teacher_key and date = session_date for update;
    if not found then raise exception 'Attendance session unavailable' using errcode = '42501'; end if;
  end if;

  if jsonb_typeof(roster) is distinct from 'array' then
    raise exception 'An attendance roster is required' using errcode = '22023';
  end if;
  -- The class lock serializes roster writes with enrollment changes.
  perform 1 from public.classes where id = class_key for no key update;
  select count(*) into expected from public.enrollments e join public.students st on st.id = e.student_id
    where e.class_id = class_key and st.department_id = cl.department_id
      and result.date >= e.enrolled_from and (e.enrolled_until is null or result.date <= e.enrolled_until);
  if expected = 0 or jsonb_array_length(roster) <> expected
      or (select count(distinct x.student_id) from jsonb_to_recordset(roster) x(student_id uuid)) <> expected
      or exists (
        select 1 from jsonb_to_recordset(roster) x(student_id uuid,status text,remarks text)
        where x.status is null or x.status not in ('present','absent','leave')
          or length(x.remarks) > 1000 or not attendance_private.can_manage_record(result.id,x.student_id)
      ) then
    raise exception 'Roster must include every enrolled student exactly once with a valid status' using errcode = '22023';
  end if;

  insert into public.attendance_records(session_id,student_id,status,marked_by,remarks,updated_at)
  select result.id,x.student_id,x.status,'teacher',nullif(trim(x.remarks),''),now()
    from jsonb_to_recordset(roster) x(student_id uuid,status text,remarks text)
  on conflict (session_id,student_id) do update set status = excluded.status, marked_by = excluded.marked_by,
    remarks = excluded.remarks, updated_at = excluded.updated_at
    where (attendance_records.status, attendance_records.remarks) is distinct from (excluded.status, excluded.remarks);
  perform attendance_private.write_audit('SAVE_ATTENDANCE','AttendanceSession',result.id,cl.department_id,
    format('Saved attendance for %s students',expected));
  return result.id;
end;
$$;

create function public.portal_correct_attendance(session_key uuid, student_key uuid, new_status text, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare d uuid;
begin
  if not attendance_private.can_manage_record(session_key,student_key) then
    raise exception 'Attendance access denied' using errcode = '42501';
  end if;
  if new_status is null or new_status not in ('present','absent','leave') or reason is null or length(trim(reason)) not between 1 and 1000 then
    raise exception 'A valid status and reason are required' using errcode = '22023';
  end if;
  perform 1 from public.attendance_sessions where id = session_key for update;
  update public.attendance_records set status = new_status, remarks = trim(reason), marked_by = 'correction', updated_at = now()
    where session_id = session_key and student_id = student_key;
  if not found then raise exception 'Attendance record unavailable' using errcode = '22023'; end if;
  select department_id into d from public.students where id = student_key;
  perform attendance_private.write_audit('EDIT_ATTENDANCE','AttendanceSession',session_key,d,'Updated one attendance record');
end;
$$;

create function public.portal_request_correction(session_key uuid, requested text, reason_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.students;
declare r public.attendance_records;
declare se public.attendance_sessions;
declare request_key uuid;
begin
  select * into s from public.students where user_id = (attendance_private.actor()).id;
  if not found or not attendance_private.own_student(s.id) then
    raise exception 'Student access required' using errcode = '42501';
  end if;
  if requested is null or requested not in ('present','leave') or reason_text is null
    or length(trim(reason_text)) not between 1 and 2000 then
    raise exception 'A valid correction and reason are required' using errcode = '22023';
  end if;
  if not attendance_private.student_has_session(session_key) then
    raise exception 'Select one of your attendance records' using errcode = '42501';
  end if;
  select * into se from public.attendance_sessions where id = session_key for update;
  select * into r from public.attendance_records where session_id = session_key and student_id = s.id;
  if not found or requested = r.status then
    raise exception 'Select an existing record and a different attendance status' using errcode = '22023';
  end if;
  if exists(select 1 from public.correction_requests where session_id = session_key and student_id = s.id and status = 'pending') then
    raise exception 'A correction is already pending for that record' using errcode = '23505';
  end if;
  insert into public.correction_requests(student_id,session_id,subject_id,date,current_status,requested_status,reason)
    values (s.id,se.id,se.subject_id,se.date,r.status,requested,trim(reason_text)) returning id into request_key;
  perform attendance_private.write_audit('REQUEST_CORRECTION','CorrectionRequest',request_key,s.department_id,'Submitted a correction request');
  return request_key;
end;
$$;

create function public.portal_review_correction(request_key uuid, decision text, notes text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a public.user_profiles := attendance_private.actor();
declare r public.correction_requests;
declare st public.students;
begin
  select * into r from public.correction_requests where id = request_key;
  if not found or not attendance_private.can_manage_record(r.session_id,r.student_id) then
    raise exception 'Correction access denied' using errcode = '42501';
  end if;
  perform 1 from public.attendance_sessions where id = r.session_id for update;
  select * into r from public.correction_requests where id = request_key for update;
  if decision is null or decision not in ('approved','rejected') or length(notes) > 2000 or r.status <> 'pending' then
    raise exception 'Choose a valid decision for a pending correction' using errcode = '22023';
  end if;
  if decision = 'approved' then
    update public.attendance_records set status = r.requested_status, marked_by = 'correction',
      remarks = nullif(trim(notes),''), updated_at = now()
    where session_id = r.session_id and student_id = r.student_id and status = r.current_status;
    if not found then raise exception 'Attendance changed after this request was submitted' using errcode = '40001'; end if;
  end if;
  update public.correction_requests set status = decision,
    reviewed_by = (select id from public.teachers where user_id = a.id and a.role = 'teacher'),
    reviewed_by_profile_id = a.id, review_notes = nullif(trim(notes),''), reviewed_at = now()
  where id = request_key;
  select * into st from public.students where id = r.student_id;
  insert into public.notifications(user_id,title,message,type,link)
    values(st.user_id,'Attendance correction ' || decision,
      'Your attendance correction for ' || r.date || ' was ' || decision || '.',
      case when decision = 'approved' then 'success' else 'info' end,'/student/corrections');
  perform attendance_private.write_audit(upper(decision) || '_CORRECTION','CorrectionRequest',request_key,st.department_id,'Reviewed an attendance correction');
  return request_key;
end;
$$;

create function public.portal_read_notifications(notification_key uuid default null)
returns void language sql security definer set search_path = '' as $$
  update public.notifications set is_read = true
  where user_id = (attendance_private.actor()).id and is_read is distinct from true
    and (notification_key is null or id = notification_key)
$$;

create function public.portal_reschedule_slot(slot_key uuid, new_day text, new_period int, starts time, ends time, room text, reason_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a public.user_profiles := attendance_private.actor();
declare old_slot public.timetable_slots;
declare cl public.classes;
declare su public.subjects;
begin
  select * into old_slot from public.timetable_slots where id = slot_key for update;
  if not found or not attendance_private.same_institution(old_slot.institution_id)
    or not attendance_private.can_manage_session(old_slot.class_id,old_slot.subject_id,old_slot.teacher_id) then
    raise exception 'Timetable access denied' using errcode = '42501';
  end if;
  if reason_text is null or length(trim(reason_text)) not between 1 and 1000 then
    raise exception 'A rescheduling reason is required' using errcode = '22023';
  end if;
  select * into cl from public.classes where id = old_slot.class_id;
  select * into su from public.subjects where id = old_slot.subject_id;
  update public.timetable_slots set day_of_week = new_day, period_number = new_period,
    start_time = starts, end_time = ends, classroom = trim(room) where id = slot_key;
  insert into public.timetable_change_logs(timetable_entry_id,teacher_id,teacher_name,class_id,class_name,subject_code,subject_name,
    old_day,old_period,old_classroom,new_day,new_period,new_classroom,reason)
  values (slot_key,old_slot.teacher_id,a.name,cl.id,cl.name,su.code,su.name,
    old_slot.day_of_week,old_slot.period_number,old_slot.classroom,new_day,new_period,trim(room),trim(reason_text));
  insert into public.notifications(user_id,title,message,link)
    select distinct st.user_id,'Timetable updated',su.code || ' was moved to ' || new_day || ', period ' || new_period || '.','/student/timetable'
    from public.students st join public.enrollments e on e.student_id = st.id
    where e.class_id = cl.id and st.department_id = cl.department_id
      and e.enrolled_from <= current_date and (e.enrolled_until is null or e.enrolled_until >= current_date);
  perform attendance_private.write_audit('RESCHEDULE_TIMETABLE_SLOT','TimetableSlot',slot_key,cl.department_id,'Rescheduled a timetable slot');
  return slot_key;
end;
$$;

create function public.portal_update_settings(changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.user_profiles := attendance_private.actor();
declare original public.institution_settings;
declare updated public.institution_settings;
begin
  if a.role is distinct from 'admin' then raise exception 'Settings access denied' using errcode = '42501'; end if;
  select * into strict original from public.institution_settings where institution_id = a.institution_id for update;
  select * into updated from jsonb_populate_record(original, changes);
  if updated.institution_name is null or length(trim(updated.institution_name)) = 0
    or updated.auto_alerts_enabled is null or updated.code_duration_minutes_default is null
    or (updated.current_academic_year <> '' and not exists(
      select 1 from public.academic_years y where y.institution_id = a.institution_id and y.label = updated.current_academic_year
    )) then
    raise exception 'Enter valid institution settings and a configured academic year' using errcode = '22023';
  end if;
  update public.institution_settings set
    institution_name = updated.institution_name, short_name = updated.short_name, established_year = updated.established_year,
    location = updated.location, affiliation = updated.affiliation, management = updated.management,
    academic_term = updated.academic_term, current_academic_year = updated.current_academic_year,
    threshold_percentage = updated.threshold_percentage, warning_threshold = updated.warning_threshold,
    auto_alerts_enabled = updated.auto_alerts_enabled, code_duration_minutes_default = updated.code_duration_minutes_default,
    leave_counts_as_present = updated.leave_counts_as_present where id = original.id;
  perform attendance_private.write_audit('UPDATE_SETTINGS','InstitutionSettings',original.id,null,'Updated institution settings');
end;
$$;

do $$
declare fn regprocedure;
begin
  for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname in ('portal_save_attendance','portal_correct_attendance','portal_request_correction','portal_review_correction','portal_read_notifications','portal_reschedule_slot','portal_update_settings') loop
    execute format('revoke execute on function %s from public, anon, authenticated',fn);
    execute format('grant execute on function %s to authenticated',fn);
  end loop;
end;
$$;

-- 20261125000500_provisioning.sql
create function attendance_private.validate_enrollment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d uuid;
begin
  if tg_op = 'UPDATE' and (new.class_id,new.student_id) is distinct from (old.class_id,old.student_id) then
    raise exception 'Close the existing enrollment and create a new one' using errcode = '22023';
  end if;
  select department_id into d from public.classes where id = new.class_id for no key update;
  if not exists(select 1 from public.students s join public.departments dep on dep.id = s.department_id
    join public.user_profiles p on p.id = s.user_id where s.id = new.student_id
      and p.role = 'student' and p.department_id = d and p.institution_id = dep.institution_id and s.department_id = d) then
    raise exception 'Student and section must belong to the same department' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function attendance_private.validate_enrollment() from public, anon, authenticated;
create trigger validate_enrollment before insert or update on public.enrollments
  for each row execute function attendance_private.validate_enrollment();

-- Auth accounts are created or invited by a trusted operator. The academic profile is linked in one transaction.
create function public.portal_provision_account(
  auth_key uuid, institution_key uuid, department_key uuid, account_role text, full_name text,
  class_key uuid default null, identifier text default null, admitted_year int default null,
  enrollment_start date default null, designation_text text default null, qualification_text text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare account_email text;
declare profile_key uuid;
declare student_key uuid;
declare cl public.classes;
begin
  select email into account_email from auth.users where id = auth_key;
  if account_email is null or full_name is null or length(trim(full_name)) not between 1 and 150
    or account_role is null or account_role not in ('admin','hod','teacher','student')
    or not exists(select 1 from public.institutions where id = institution_key)
    or (account_role = 'admin' and department_key is not null)
    or (account_role <> 'admin' and not exists(select 1 from public.departments where id = department_key and institution_id = institution_key))
    or (account_role in ('teacher','student') and (identifier is null or length(trim(identifier)) not between 1 and 50)) then
    raise exception 'Invalid Auth account, role or academic scope' using errcode = '22023';
  end if;
  if account_role = 'student' then
    select * into cl from public.classes where id = class_key and department_id = department_key;
    if not found or not attendance_private.valid_class_metadata(cl.department_id,cl.programme_id,cl.vtu_scheme_id,cl.semester_id,cl.semester,cl.academic_year)
      or admitted_year is null or admitted_year not between 1900 and 2200 or enrollment_start is null
      or not exists(select 1 from public.semesters sm join public.academic_years y on y.id = sm.academic_year_id
        where sm.id = cl.semester_id and enrollment_start between y.starts_on and y.ends_on) then
      raise exception 'A valid section, admission year and enrollment date are required' using errcode = '22023';
    end if;
  end if;
  insert into public.user_profiles(auth_id,name,email,role,institution_id,department_id)
    values(auth_key,trim(full_name),lower(trim(account_email)),account_role,institution_key,department_key) returning id into profile_key;
  if account_role = 'student' then
    insert into public.students(user_id,roll_number,usn,class_id,department_id,admission_year,admission_batch)
      values(profile_key,upper(trim(identifier)),upper(trim(identifier)),class_key,department_key,admitted_year,cl.admission_batch)
      returning id into student_key;
    insert into public.enrollments(student_id,class_id,enrolled_from) values(student_key,class_key,enrollment_start);
  elsif account_role = 'teacher' then
    insert into public.teachers(user_id,employee_id,department_id,designation,qualification)
      values(profile_key,upper(trim(identifier)),department_key,coalesce(nullif(trim(designation_text),''),'Assistant Professor'),nullif(trim(qualification_text),''));
  end if;
  insert into public.audit_logs(user_name,action,entity,entity_id,details,institution_id,department_id)
    values('Provisioning operator','PROVISION_ACCOUNT','UserProfile',profile_key::text,'Linked a Supabase Auth account as ' || account_role,
      institution_key,department_key);
  return profile_key;
end;
$$;
revoke execute on function public.portal_provision_account(uuid,uuid,uuid,text,text,uuid,text,int,date,text,text) from public, anon, authenticated;
grant execute on function public.portal_provision_account(uuid,uuid,uuid,text,text,uuid,text,int,date,text,text) to service_role;

-- Students see a timetable instructor's display name without access to the instructor's profile.
create function attendance_private.timetable_teacher_name(slot_key uuid) returns text
language sql stable security definer set search_path = '' as $$
  select p.name from public.timetable_slots sl join public.teachers t on t.id = sl.teacher_id
    join public.user_profiles p on p.id = t.user_id
  where sl.id = slot_key and attendance_private.same_institution(sl.institution_id)
    and p.institution_id = sl.institution_id and (
      attendance_private.can_manage_session(sl.class_id,sl.subject_id,sl.teacher_id)
      or (attendance_private.in_class(sl.class_id) and attendance_private.valid_assignment(sl.teacher_id,sl.class_id,sl.subject_id,sl.academic_year))
    )
$$;
revoke execute on function attendance_private.timetable_teacher_name(uuid) from public, anon;
grant execute on function attendance_private.timetable_teacher_name(uuid) to authenticated;
create view public.portal_timetable with (security_invoker = true) as
  select sl.*, c.department_id, c.semester, c.section, attendance_private.timetable_teacher_name(sl.id) as teacher_name
  from public.timetable_slots sl join public.classes c on c.id = sl.class_id;
revoke all on public.portal_timetable from public, anon, authenticated;
grant select on public.portal_timetable to authenticated;
create function public.portal_send_advisory(student_key uuid, subject_line text, body text)
returns void language plpgsql security definer set search_path = '' as $$
declare st public.students;
begin
  select * into st from public.students where id = student_key;
  if not found or not attendance_private.can_read_student(student_key)
    or (attendance_private.actor()).role not in ('teacher','hod','admin') then
    raise exception 'Student access denied' using errcode = '42501';
  end if;
  if subject_line is null or length(trim(subject_line)) not between 1 and 200
    or body is null or length(trim(body)) not between 1 and 4000 then
    raise exception 'Enter an advisory subject and a message of up to 4000 characters' using errcode = '22023';
  end if;
  insert into public.notifications(user_id,title,message,type,link)
    values(st.user_id,trim(subject_line),trim(body),'alert','/student/overview');
  perform attendance_private.write_audit('SEND_ADVISORY','Student',student_key,st.department_id,'Sent a portal attendance advisory');
end;
$$;
revoke execute on function public.portal_send_advisory(uuid,text,text) from public, anon;
grant execute on function public.portal_send_advisory(uuid,text,text) to authenticated;

-- 20261125000600_admin_workspace.sql
-- University workspace. Existing people and attendance rows keep their identifiers.
alter table public.user_profiles add column archived_at timestamptz,
  add column auth_linked boolean generated always as (auth_id is not null) stored;
grant select(enabled,archived_at,auth_linked) on public.user_profiles to authenticated;
alter table public.institution_settings
  add column hod_roster_management boolean not null default false,
  add column notify_timetable boolean not null default true;
create table public.academic_holidays (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions,
  day date not null, name text not null check(length(trim(name)) between 1 and 150),
  unique(institution_id,day)
);
alter table public.academic_holidays enable row level security;
revoke all on public.academic_holidays from public,anon,authenticated;
grant select,insert,delete on public.academic_holidays to authenticated;
create policy holidays_read on public.academic_holidays for select to authenticated using(attendance_private.same_institution(institution_id));
create policy holidays_insert on public.academic_holidays for insert to authenticated with check(attendance_private.is_admin(institution_id));
create policy holidays_delete on public.academic_holidays for delete to authenticated using(attendance_private.is_admin(institution_id));
create trigger audit_holidays after insert or delete on public.academic_holidays for each row execute function attendance_private.audit_catalog();

create function public.workspace_preferences(short_label text, allow_hod_rosters boolean, timetable_notices boolean)
returns void language plpgsql security definer set search_path='' as $$
declare a public.user_profiles := attendance_private.actor();
begin
  if a.role is distinct from 'admin' then raise exception 'Institution administrator required' using errcode='42501'; end if;
  if coalesce(length(trim(short_label)),0) not between 1 and 60 then raise exception 'Enter a short institution name'; end if;
  update public.institution_settings set short_name=trim(short_label),hod_roster_management=allow_hod_rosters,
    notify_timetable=timetable_notices where institution_id=a.institution_id;
  perform attendance_private.write_audit('UPDATE_PREFERENCES','Institution',a.institution_id,null,'Updated branding, HOD roster permissions and timetable notifications');
end $$;
create function attendance_private.filter_schedule_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.link='/student/timetable' and exists(select 1 from public.user_profiles p join public.institution_settings s
    on s.institution_id=p.institution_id where p.id=new.user_id and not s.notify_timetable) then return null; end if;
  return new;
end $$;
revoke execute on function attendance_private.filter_schedule_notification() from public,anon,authenticated;
create trigger schedule_notification_preferences before insert on public.notifications for each row execute function attendance_private.filter_schedule_notification();

create function attendance_private.manage_roster(d uuid) returns boolean language sql stable security definer set search_path='' as $$
 select attendance_private.manages_department(d) and exists(select 1 from attendance_private.actor() a
   join public.institution_settings s on s.institution_id=a.institution_id where a.role='admin' or (a.role='hod' and s.hod_roster_management))
$$;
revoke execute on function attendance_private.manage_roster(uuid) from public,anon,authenticated;

create function public.workspace_account_status(profile_key uuid, new_status text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.user_profiles := attendance_private.actor(); p public.user_profiles;
begin
  select * into p from public.user_profiles where id=profile_key for update;
  if a.role is distinct from 'admin' or p.institution_id is distinct from a.institution_id or p.role not in ('teacher','student') or p.id is null then
    raise exception 'Account access denied' using errcode='42501';
  end if;
  if new_status is null or new_status not in ('active','inactive','archived') then raise exception 'Invalid account status'; end if;
  update public.user_profiles set enabled=new_status='active', archived_at=case when new_status='archived' then now() end where id=p.id;
  perform attendance_private.write_audit('ACCOUNT_STATUS','UserProfile',p.id,p.department_id,format('Changed account to %s',new_status));
end $$;

create function public.workspace_allocate(student_key uuid,section_key uuid,effective date)
returns void language plpgsql security definer set search_path='' as $$
declare s public.students; c public.classes; previous public.enrollments;
begin
  select * into s from public.students where id=student_key for update;
  select * into c from public.classes where id=section_key;
  if s.id is null or c.id is null or not attendance_private.manage_roster(s.department_id) or c.department_id<>s.department_id then
    raise exception 'Section allocation denied' using errcode='42501';
  end if;
  if effective is null or effective>current_date or not exists(select 1 from public.semesters sm join public.academic_years y on y.id=sm.academic_year_id
    where sm.id=c.semester_id and effective between y.starts_on and y.ends_on) then raise exception 'Choose a date within the section academic year through today'; end if;
  if s.class_id=c.id then return; end if;
  perform id from public.classes where id in (s.class_id,c.id) order by id for no key update;
  select * into strict previous from public.enrollments where student_id=s.id and class_id=s.class_id for update;
  if effective<=previous.enrolled_from or exists(select 1 from public.attendance_records r join public.attendance_sessions se on se.id=r.session_id
    where r.student_id=s.id and se.class_id=s.class_id and se.date>=effective) then raise exception 'Transfer date conflicts with enrollment or recorded attendance'; end if;
  update public.enrollments set enrolled_until=least(coalesce(enrolled_until,effective-1),effective-1) where id=previous.id;
  insert into public.enrollments(student_id,class_id,enrolled_from) values(s.id,c.id,effective);
  update public.students set class_id=c.id where id=s.id;
  perform attendance_private.write_audit('ALLOCATE_SECTION','Student',s.id,s.department_id,format('Moved from %s to %s effective %s',s.class_id,c.id,effective));
end $$;

-- The registrar creates academic records. Auth identity linking remains an operator action.
create function public.workspace_import_people(kind text,department_key uuid,section_key uuid,start_date date, people jsonb)
returns int language plpgsql security definer set search_path='' as $$
declare a public.user_profiles:=attendance_private.actor(); c public.classes; entry record; profile_key uuid; student_key uuid; imported int:=0;
begin
  if not attendance_private.manage_roster(department_key) then raise exception 'Roster access denied' using errcode='42501'; end if;
  if kind is null or kind not in ('student','teacher') or jsonb_typeof(people) is distinct from 'array' then raise exception 'Invalid roster'; end if;
  if jsonb_array_length(people) not between 1 and 500 then raise exception 'Import between 1 and 500 people'; end if;
  if kind='student' then
    select * into c from public.classes where id=section_key and department_id=department_key;
    if c.id is null or not exists(select 1 from public.semesters sm join public.academic_years y on y.id=sm.academic_year_id
      where sm.id=c.semester_id and start_date between y.starts_on and y.ends_on) then raise exception 'Invalid enrollment date or section'; end if;
  end if;
  for entry in select trim(name) as name,lower(trim(email)) as email,upper(trim(identifier)) as identifier
    from jsonb_to_recordset(people) r(name text,email text,identifier text) loop
    if coalesce(length(entry.name),0) not between 1 and 150 or coalesce(length(entry.identifier),0) not between 1 and 50
      or coalesce(entry.email,'') !~ '^[^ @[:space:]]+@[^ @[:space:]]+\.[^ @[:space:]]+$' then raise exception 'Invalid name, email or registration number at row %',imported+1; end if;
    insert into public.user_profiles(institution_id,department_id,name,email,role)
      values(a.institution_id,department_key,entry.name,entry.email,kind) returning id into profile_key;
    if kind='student' then
      insert into public.students(user_id,roll_number,usn,class_id,department_id,admission_year,admission_batch)
        values(profile_key,entry.identifier,entry.identifier,c.id,department_key,extract(year from start_date)::int,c.admission_batch) returning id into student_key;
      insert into public.enrollments(student_id,class_id,enrolled_from) values(student_key,c.id,start_date);
    else
      insert into public.teachers(user_id,department_id,employee_id) values(profile_key,department_key,entry.identifier);
    end if;
    perform attendance_private.write_audit('REGISTER_PERSON','UserProfile',profile_key,department_key,format('Registered %s %s',kind,entry.identifier));
    imported:=imported+1;
  end loop;
  return imported;
end $$;

create function public.workspace_link_identity(institution_key uuid, profile_key uuid, auth_key uuid)
returns void language plpgsql security definer set search_path='' as $$
declare p public.user_profiles;
begin
  select * into p from public.user_profiles where id=profile_key and institution_id=institution_key for update;
  if p.id is null or p.role not in ('student','teacher') or not p.enabled
    or not exists(select 1 from auth.users u where u.id=auth_key and lower(trim(u.email))=lower(trim(p.email))) then
    raise exception 'Choose an enabled academic profile and its matching Auth user' using errcode='22023';
  end if;
  if p.auth_id=auth_key then return; end if;
  if p.auth_id is not null then raise exception 'Profile already linked' using errcode='23505'; end if;
  update public.user_profiles set auth_id=auth_key where id=p.id;
  insert into public.audit_logs(user_name,action,entity,entity_id,details,institution_id,department_id)
    values(session_user,'LINK_IDENTITY','UserProfile',p.id::text,'Linked a registrar-created academic profile',p.institution_id,p.department_id);
end $$;
revoke all on function public.workspace_link_identity(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.workspace_link_identity(uuid,uuid,uuid) to service_role;

revoke all on function public.workspace_preferences(text,boolean,boolean), public.workspace_account_status(uuid,text),
 public.workspace_allocate(uuid,uuid,date),public.workspace_import_people(text,uuid,uuid,date,jsonb) from public,anon,authenticated;
grant execute on function public.workspace_preferences(text,boolean,boolean), public.workspace_account_status(uuid,text),
 public.workspace_allocate(uuid,uuid,date),public.workspace_import_people(text,uuid,uuid,date,jsonb) to authenticated;

-- 20261125000700_faculty_portal.sql
-- Faculty portal workflow: attendance statuses (late/excused), draft & locked finalization,
-- date-specific lecture cancellation/rescheduling, and substitute faculty approval workflow.

-- 1. Expand attendance statuses while preserving legacy 'leave' compatibility
alter table public.attendance_records drop constraint if exists attendance_records_status_check;
alter table public.attendance_records
  add constraint attendance_records_status_check
  check (status in ('present', 'absent', 'late', 'excused', 'leave'));

alter table public.correction_requests drop constraint if exists correction_status_valid;
alter table public.correction_requests
  add constraint correction_status_valid
  check (current_status in ('present', 'absent', 'late', 'excused', 'leave')) not valid;

alter table public.correction_requests drop constraint if exists correction_requests_requested_status_check;
alter table public.correction_requests
  add constraint correction_requests_requested_status_check
  check (requested_status in ('present', 'late', 'excused', 'leave'));

-- 2. Draft, finalization, locking, and substitute attribution on attendance_sessions
alter table public.attendance_sessions
  add column if not exists status text not null default 'finalized'
    check (status in ('draft', 'finalized', 'cancelled')),
  add column if not exists is_locked boolean not null default true,
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references public.user_profiles(id) on delete set null,
  add column if not exists cancelled_reason text,
  add column if not exists substitute_teacher_id uuid references public.teachers(id) on delete set null;

update public.attendance_sessions
  set submitted_at = coalesce(submitted_at, created_at)
  where status = 'finalized' and submitted_at is null;

grant select (status, is_locked, submitted_at, submitted_by, cancelled_reason, substitute_teacher_id)
  on public.attendance_sessions to authenticated;

-- 3. Date-specific lecture cancellations and one-off rescheduling
create table if not exists public.lecture_adjustments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  timetable_entry_id uuid not null references public.timetable_slots(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  original_date date not null,
  adjustment_type text not null check (adjustment_type in ('cancelled', 'rescheduled')),
  new_date date,
  new_start_time time,
  new_end_time time,
  new_classroom text,
  reason text not null check (length(trim(reason)) between 1 and 1000),
  status text not null default 'active' check (status in ('active', 'reverted')),
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint uq_lecture_adjustment_slot_date unique (timetable_entry_id, original_date),
  constraint chk_rescheduled_fields check (
    adjustment_type = 'cancelled'
    or (new_date is not null and new_start_time is not null and new_end_time is not null and new_end_time > new_start_time)
  )
);

create index if not exists idx_lecture_adjustments_teacher_date
  on public.lecture_adjustments(teacher_id, original_date);
create index if not exists idx_lecture_adjustments_class_date
  on public.lecture_adjustments(class_id, original_date);

-- 4. Substitute faculty requests with approval workflow
create table if not exists public.substitute_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  timetable_entry_id uuid not null references public.timetable_slots(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  original_teacher_id uuid not null references public.teachers(id) on delete cascade,
  substitute_teacher_id uuid not null references public.teachers(id) on delete cascade,
  lecture_date date not null,
  reason text not null check (length(trim(reason)) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by_profile_id uuid references public.user_profiles(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint chk_substitute_distinct_teachers check (original_teacher_id <> substitute_teacher_id)
);

create unique index if not exists uq_active_substitute_request
  on public.substitute_requests(timetable_entry_id, lecture_date)
  where status in ('pending', 'approved');
create index if not exists idx_substitute_requests_teachers
  on public.substitute_requests(original_teacher_id, substitute_teacher_id, lecture_date);

-- 5. RLS and helper updates
alter table public.lecture_adjustments enable row level security;
revoke all on public.lecture_adjustments from public, anon, authenticated;
grant select on public.lecture_adjustments to authenticated;

alter table public.substitute_requests enable row level security;
revoke all on public.substitute_requests from public, anon, authenticated;
grant select on public.substitute_requests to authenticated;

create or replace function attendance_private.approved_substitute_teacher(c uuid, s uuid, d date default null)
returns uuid language sql stable security definer set search_path = '' as $$
  select sr.substitute_teacher_id
  from public.substitute_requests sr
  where sr.class_id = c
    and sr.subject_id = s
    and sr.status = 'approved'
    and attendance_private.own_teacher(sr.substitute_teacher_id)
    and (d is null or sr.lecture_date = d)
  limit 1
$$;
revoke execute on function attendance_private.approved_substitute_teacher(uuid,uuid,date) from public, anon;
grant execute on function attendance_private.approved_substitute_teacher(uuid,uuid,date) to authenticated;

-- Allow approved substitute teachers to read their covered class & roster
create or replace function attendance_private.can_teach_class(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.teacher_assignments x
    where x.class_id = c
      and attendance_private.assigned_teacher(c, x.subject_id, x.teacher_id)
  ) or exists(
    select 1 from public.substitute_requests sr
    where sr.class_id = c
      and sr.status = 'approved'
      and attendance_private.own_teacher(sr.substitute_teacher_id)
  )
$$;

-- Students only see finalized attendance sessions (drafts stay private to faculty/admin)
create or replace function attendance_private.student_has_session(s uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.attendance_records r
    join public.attendance_sessions se on se.id = r.session_id
    join public.classes c on c.id = se.class_id
    join public.subjects su on su.id = se.subject_id
    join public.students st on st.id = r.student_id
    join public.teachers te on te.id = se.teacher_id
    join public.enrollments e on e.student_id = st.id and e.class_id = c.id
    where r.session_id = s
      and se.status = 'finalized'
      and attendance_private.own_student(st.id)
      and c.department_id = st.department_id
      and su.department_id = c.department_id
      and attendance_private.department_in_scope(te.department_id)
      and se.date >= e.enrolled_from
      and (e.enrolled_until is null or se.date <= e.enrolled_until)
  )
$$;

create or replace function attendance_private.can_manage_record(session uuid, student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.attendance_sessions se
    join public.classes cl on cl.id = se.class_id
    join public.students st on st.id = student and st.department_id = cl.department_id
    join public.enrollments e on e.student_id = st.id and e.class_id = cl.id
    where se.id = session
      and se.date >= e.enrolled_from
      and (e.enrolled_until is null or se.date <= e.enrolled_until)
      and (
        attendance_private.can_manage_session(se.class_id, se.subject_id, se.teacher_id)
        or (se.substitute_teacher_id is not null and attendance_private.own_teacher(se.substitute_teacher_id))
        or attendance_private.approved_substitute_teacher(se.class_id, se.subject_id, se.date) is not null
      )
  )
$$;

create policy lecture_adjustments_read on public.lecture_adjustments for select to authenticated
  using (
    attendance_private.same_institution(institution_id)
    and (
      attendance_private.can_manage_session(class_id, subject_id, teacher_id)
      or attendance_private.in_class(class_id)
      or attendance_private.approved_substitute_teacher(class_id, subject_id, original_date) is not null
    )
  );

create policy substitute_requests_read on public.substitute_requests for select to authenticated
  using (
    attendance_private.same_institution(institution_id)
    and (
      attendance_private.can_manage_class(class_id)
      or attendance_private.own_teacher(original_teacher_id)
      or attendance_private.own_teacher(substitute_teacher_id)
    )
  );

create policy subjects_read_substitute on public.subjects for select to authenticated
  using (
    exists (
      select 1 from public.substitute_requests sr
      where sr.subject_id = subjects.id
        and sr.status in ('pending', 'approved')
        and attendance_private.own_teacher(sr.substitute_teacher_id)
    )
  );

create policy timetable_read_substitute on public.timetable_slots for select to authenticated
  using (
    attendance_private.same_institution(institution_id)
    and exists (
      select 1 from public.substitute_requests sr
      where sr.timetable_entry_id = timetable_slots.id
        and sr.status in ('pending', 'approved')
        and attendance_private.own_teacher(sr.substitute_teacher_id)
    )
  );

create policy sessions_read_substitute on public.attendance_sessions for select to authenticated
  using (
    (substitute_teacher_id is not null and attendance_private.own_teacher(substitute_teacher_id))
    or attendance_private.approved_substitute_teacher(class_id, subject_id, date) is not null
  );

-- 6. Safe faculty colleague directory for substitute selection (not accessible to students)
create or replace function public.portal_faculty_directory()
returns table (
  teacher_id uuid,
  user_id uuid,
  name text,
  employee_id text,
  designation text,
  department_id uuid
) language sql stable security definer set search_path = '' as $$
  select t.id as teacher_id, p.id as user_id, p.name::text, t.employee_id::text, t.designation::text, t.department_id
  from public.teachers t
  join public.user_profiles p on p.id = t.user_id
  cross join attendance_private.actor() a
  where a.id is not null
    and a.role in ('teacher', 'hod', 'admin')
    and p.institution_id = a.institution_id
    and p.enabled = true
    and p.role = 'teacher'
  order by p.name
$$;
revoke all on function public.portal_faculty_directory() from public, anon, authenticated;
grant execute on function public.portal_faculty_directory() to authenticated;

-- 7. Upgrade portal_save_attendance with draft mode, locking, late/excused, and substitute support
drop function if exists public.portal_save_attendance(uuid,uuid,uuid,uuid,date,time,time,text,jsonb);

create function public.portal_save_attendance(
  session_key uuid,
  class_key uuid,
  subject_key uuid,
  teacher_key uuid,
  session_date date,
  starts time,
  ends time,
  kind text,
  roster jsonb,
  save_mode text default 'finalized',
  timetable_slot_key uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.user_profiles := attendance_private.actor();
  cl public.classes;
  result public.attendance_sessions;
  today date;
  expected int;
  marked_count int;
  approved_sub uuid;
begin
  if save_mode is null or save_mode not in ('draft', 'finalized') then
    raise exception 'Choose draft or finalized save mode' using errcode = '22023';
  end if;

  select * into cl from public.classes where id = class_key;
  approved_sub := attendance_private.approved_substitute_teacher(class_key, subject_key, session_date);

  if a.id is null or cl.id is null or (
    not attendance_private.can_manage_session(class_key, subject_key, teacher_key)
    and approved_sub is null
  ) then
    raise exception 'Attendance access denied' using errcode = '42501';
  end if;

  if session_key is null then
    select (now() at time zone coalesce((select time_zone from public.institution_settings where institution_id = a.institution_id), 'Asia/Kolkata'))::date into today;
    if session_date is null or session_date > today or starts is null or ends is null or starts >= ends
      or kind is null or kind not in ('lecture', 'lab', 'tutorial')
      or not exists (
        select 1 from public.semesters sm join public.academic_years y on y.id = sm.academic_year_id
        where sm.id = cl.semester_id and session_date between y.starts_on and y.ends_on
      ) then
      raise exception 'Choose a valid session date and time within the academic year' using errcode = '22023';
    end if;

    perform 1 from public.teacher_assignments
      where teacher_id = teacher_key and class_id = class_key and subject_id = subject_key and academic_year = cl.academic_year
      for share;
    if not found then
      raise exception 'Faculty assignment required' using errcode = '42501';
    end if;

    insert into public.attendance_sessions(
      class_id, subject_id, teacher_id, date, start_time, end_time, session_type,
      timetable_entry_id, status, is_locked, submitted_at, submitted_by, substitute_teacher_id
    )
    values (
      class_key, subject_key, teacher_key, session_date, starts, ends, kind,
      timetable_slot_key,
      save_mode,
      save_mode = 'finalized',
      case when save_mode = 'finalized' then now() else null end,
      case when save_mode = 'finalized' then a.id else null end,
      approved_sub
    ) returning * into result;
  else
    select * into result from public.attendance_sessions
      where id = session_key
        and class_id = class_key
        and subject_id = subject_key
        and teacher_id = teacher_key
        and date = session_date
      for update;
    if not found then
      raise exception 'Attendance session unavailable' using errcode = '42501';
    end if;
    if result.status = 'finalized' or result.is_locked then
      raise exception 'Finalized attendance sessions are locked. Use the authorized correction workflow to edit records.' using errcode = '42501';
    end if;
    if result.status = 'cancelled' then
      raise exception 'Cancelled sessions cannot be edited' using errcode = '22023';
    end if;
  end if;

  if jsonb_typeof(roster) is distinct from 'array' then
    raise exception 'An attendance roster is required' using errcode = '22023';
  end if;

  -- Serialize roster writes with enrollment changes.
  perform 1 from public.classes where id = class_key for no key update;
  select count(*) into expected
  from public.enrollments e
  join public.students st on st.id = e.student_id
  where e.class_id = class_key
    and st.department_id = cl.department_id
    and result.date >= e.enrolled_from
    and (e.enrolled_until is null or result.date <= e.enrolled_until);

  if expected = 0 then
    raise exception 'No enrolled students found for this section and date' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(roster) x(student_id uuid, status text, remarks text)
    where x.student_id is null
      or x.status is null
      or x.status not in ('present', 'absent', 'late', 'excused', 'leave', 'not_marked')
      or length(x.remarks) > 1000
      or not attendance_private.can_manage_record(result.id, x.student_id)
  ) then
    raise exception 'Roster contains an invalid student or attendance status' using errcode = '22023';
  end if;

  if (select count(distinct x.student_id) from jsonb_to_recordset(roster) x(student_id uuid))
      <> jsonb_array_length(roster) then
    raise exception 'Duplicate student entries are not allowed in a roster' using errcode = '22023';
  end if;

  if save_mode = 'finalized' then
    if jsonb_array_length(roster) <> expected
      or exists (
        select 1 from jsonb_to_recordset(roster) x(student_id uuid, status text)
        where x.status = 'not_marked'
      ) then
      raise exception 'Roster must include every enrolled student exactly once with a marked status before finalizing' using errcode = '22023';
    end if;

    insert into public.attendance_records(session_id, student_id, status, marked_by, remarks, updated_at)
    select result.id, x.student_id, x.status, 'teacher', nullif(trim(x.remarks), ''), now()
      from jsonb_to_recordset(roster) x(student_id uuid, status text, remarks text)
    on conflict (session_id, student_id) do update
      set status = excluded.status,
          marked_by = excluded.marked_by,
          remarks = excluded.remarks,
          updated_at = excluded.updated_at
      where (attendance_records.status, attendance_records.remarks) is distinct from (excluded.status, excluded.remarks);

    update public.attendance_sessions
      set status = 'finalized',
          is_locked = true,
          submitted_at = now(),
          submitted_by = a.id,
          substitute_teacher_id = coalesce(substitute_teacher_id, approved_sub)
      where id = result.id;

    perform attendance_private.write_audit(
      'SAVE_ATTENDANCE', 'AttendanceSession', result.id, cl.department_id,
      format('Finalized attendance for %s students', expected)
    );
  else
    -- Draft mode: persist only marked students, remove any student reset to not_marked
    delete from public.attendance_records
      where session_id = result.id
        and student_id not in (
          select x.student_id from jsonb_to_recordset(roster) x(student_id uuid, status text)
          where x.status <> 'not_marked'
        );

    insert into public.attendance_records(session_id, student_id, status, marked_by, remarks, updated_at)
    select result.id, x.student_id, x.status, 'teacher', nullif(trim(x.remarks), ''), now()
      from jsonb_to_recordset(roster) x(student_id uuid, status text, remarks text)
      where x.status <> 'not_marked'
    on conflict (session_id, student_id) do update
      set status = excluded.status,
          marked_by = excluded.marked_by,
          remarks = excluded.remarks,
          updated_at = excluded.updated_at
      where (attendance_records.status, attendance_records.remarks) is distinct from (excluded.status, excluded.remarks);

    select count(*) into marked_count from public.attendance_records where session_id = result.id;
    perform attendance_private.write_audit(
      'SAVE_ATTENDANCE_DRAFT', 'AttendanceSession', result.id, cl.department_id,
      format('Saved attendance draft (%s/%s marked)', marked_count, expected)
    );
  end if;

  return result.id;
end;
$$;

revoke all on function public.portal_save_attendance(uuid,uuid,uuid,uuid,date,time,time,text,jsonb,text,uuid) from public, anon, authenticated;
grant execute on function public.portal_save_attendance(uuid,uuid,uuid,uuid,date,time,time,text,jsonb,text,uuid) to authenticated;

-- 8. Update portal_correct_attendance & portal_request_correction for late/excused
create or replace function public.portal_correct_attendance(session_key uuid, student_key uuid, new_status text, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare d uuid;
begin
  if not attendance_private.can_manage_record(session_key, student_key) then
    raise exception 'Attendance access denied' using errcode = '42501';
  end if;
  if new_status is null or new_status not in ('present', 'absent', 'late', 'excused', 'leave')
    or reason is null or length(trim(reason)) not between 1 and 1000 then
    raise exception 'A valid status and reason are required' using errcode = '22023';
  end if;
  perform 1 from public.attendance_sessions where id = session_key for update;
  update public.attendance_records
    set status = new_status, remarks = trim(reason), marked_by = 'correction', updated_at = now()
    where session_id = session_key and student_id = student_key;
  if not found then raise exception 'Attendance record unavailable' using errcode = '22023'; end if;
  select department_id into d from public.students where id = student_key;
  perform attendance_private.write_audit('EDIT_ATTENDANCE', 'AttendanceSession', session_key, d, 'Updated one attendance record via authorized correction');
end;
$$;

create or replace function public.portal_request_correction(session_key uuid, requested text, reason_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.students;
declare r public.attendance_records;
declare se public.attendance_sessions;
declare request_key uuid;
begin
  select * into s from public.students where user_id = (attendance_private.actor()).id;
  if not found or not attendance_private.own_student(s.id) then
    raise exception 'Student access required' using errcode = '42501';
  end if;
  if requested is null or requested not in ('present', 'late', 'excused', 'leave') or reason_text is null
    or length(trim(reason_text)) not between 1 and 2000 then
    raise exception 'A valid correction and reason are required' using errcode = '22023';
  end if;
  if not attendance_private.student_has_session(session_key) then
    raise exception 'Select one of your attendance records' using errcode = '42501';
  end if;
  select * into se from public.attendance_sessions where id = session_key for update;
  select * into r from public.attendance_records where session_id = session_key and student_id = s.id;
  if not found or requested = r.status then
    raise exception 'Select an existing record and a different attendance status' using errcode = '22023';
  end if;
  if exists(select 1 from public.correction_requests where session_id = session_key and student_id = s.id and status = 'pending') then
    raise exception 'A correction is already pending for that record' using errcode = '23505';
  end if;
  insert into public.correction_requests(student_id, session_id, subject_id, date, current_status, requested_status, reason)
    values (s.id, se.id, se.subject_id, se.date, r.status, requested, trim(reason_text)) returning id into request_key;
  perform attendance_private.write_audit('REQUEST_CORRECTION', 'CorrectionRequest', request_key, s.department_id, 'Submitted a correction request');
  return request_key;
end;
$$;

-- 9. Lecture cancellation and date-specific rescheduling RPCs
create or replace function public.portal_adjust_lecture(
  slot_key uuid,
  lecture_date date,
  kind text,
  reason_text text,
  rescheduled_date date default null,
  starts time default null,
  ends time default null,
  room text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.user_profiles := attendance_private.actor();
  slot public.timetable_slots;
  cl public.classes;
  su public.subjects;
  adj_id uuid;
begin
  select * into slot from public.timetable_slots where id = slot_key for share;
  if not found or a.id is null or not attendance_private.same_institution(slot.institution_id)
    or not attendance_private.can_manage_session(slot.class_id, slot.subject_id, slot.teacher_id) then
    raise exception 'Lecture adjustment access denied' using errcode = '42501';
  end if;
  if lecture_date is null or kind is null or kind not in ('cancelled', 'rescheduled')
    or reason_text is null or length(trim(reason_text)) not between 1 and 1000 then
    raise exception 'A valid date, adjustment type, and reason are required' using errcode = '22023';
  end if;
  if kind = 'rescheduled' and (rescheduled_date is null or starts is null or ends is null or ends <= starts) then
    raise exception 'Provide a valid rescheduled date and time range' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.attendance_sessions se
    where se.class_id = slot.class_id and se.subject_id = slot.subject_id
      and se.date = lecture_date and se.start_time = slot.start_time and se.status = 'finalized'
  ) then
    raise exception 'Cannot cancel or reschedule a lecture with finalized attendance' using errcode = '22023';
  end if;

  select * into cl from public.classes where id = slot.class_id;
  select * into su from public.subjects where id = slot.subject_id;

  insert into public.lecture_adjustments(
    institution_id, timetable_entry_id, class_id, subject_id, teacher_id,
    original_date, adjustment_type, new_date, new_start_time, new_end_time, new_classroom,
    reason, status, created_by
  ) values (
    slot.institution_id, slot.id, slot.class_id, slot.subject_id, slot.teacher_id,
    lecture_date, kind,
    case when kind = 'rescheduled' then rescheduled_date else null end,
    case when kind = 'rescheduled' then starts else null end,
    case when kind = 'rescheduled' then ends else null end,
    case when kind = 'rescheduled' then coalesce(nullif(trim(room), ''), slot.classroom) else null end,
    trim(reason_text), 'active', a.id
  )
  on conflict (timetable_entry_id, original_date) do update set
    adjustment_type = excluded.adjustment_type,
    new_date = excluded.new_date,
    new_start_time = excluded.new_start_time,
    new_end_time = excluded.new_end_time,
    new_classroom = excluded.new_classroom,
    reason = excluded.reason,
    status = 'active',
    created_by = a.id,
    created_at = now()
  returning id into adj_id;

  insert into public.notifications(user_id, title, message, type, link)
  select distinct st.user_id,
    case when kind = 'cancelled' then su.code || ' lecture cancelled' else su.code || ' lecture rescheduled' end,
    case when kind = 'cancelled'
      then su.code || ' on ' || lecture_date || ' was cancelled. Reason: ' || trim(reason_text)
      else su.code || ' on ' || lecture_date || ' moved to ' || rescheduled_date || ' (' || starts || ' - ' || ends || '). Reason: ' || trim(reason_text)
    end,
    case when kind = 'cancelled' then 'warning' else 'info' end,
    '/student/timetable'
  from public.students st
  join public.enrollments e on e.student_id = st.id
  where e.class_id = cl.id
    and st.department_id = cl.department_id
    and e.enrolled_from <= lecture_date
    and (e.enrolled_until is null or e.enrolled_until >= lecture_date);

  perform attendance_private.write_audit(
    case when kind = 'cancelled' then 'CANCEL_LECTURE' else 'RESCHEDULE_LECTURE' end,
    'LectureAdjustment', adj_id, cl.department_id,
    format('%s %s on %s', upper(kind), su.code, lecture_date)
  );
  return adj_id;
end;
$$;

create or replace function public.portal_revert_lecture_adjustment(adjustment_key uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  adj public.lecture_adjustments;
  cl public.classes;
begin
  select * into adj from public.lecture_adjustments where id = adjustment_key for update;
  if not found or not attendance_private.same_institution(adj.institution_id)
    or not attendance_private.can_manage_session(adj.class_id, adj.subject_id, adj.teacher_id) then
    raise exception 'Lecture adjustment access denied' using errcode = '42501';
  end if;
  update public.lecture_adjustments set status = 'reverted' where id = adjustment_key;
  select * into cl from public.classes where id = adj.class_id;
  perform attendance_private.write_audit('REVERT_LECTURE_ADJUSTMENT', 'LectureAdjustment', adjustment_key, cl.department_id, 'Reverted lecture adjustment');
end;
$$;

-- 10. Substitute faculty request & approval RPCs
create or replace function public.portal_request_substitute(
  slot_key uuid,
  lecture_date date,
  substitute_key uuid,
  reason_text text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.user_profiles := attendance_private.actor();
  slot public.timetable_slots;
  cl public.classes;
  su public.subjects;
  sub_teacher public.teachers;
  sub_profile public.user_profiles;
  req_id uuid;
begin
  select * into slot from public.timetable_slots where id = slot_key for share;
  if not found or a.id is null or not attendance_private.same_institution(slot.institution_id)
    or not attendance_private.can_manage_session(slot.class_id, slot.subject_id, slot.teacher_id) then
    raise exception 'Substitute request access denied' using errcode = '42501';
  end if;
  if lecture_date is null or substitute_key is null or substitute_key = slot.teacher_id
    or reason_text is null or length(trim(reason_text)) not between 1 and 1000 then
    raise exception 'Select a different faculty member, lecture date, and reason' using errcode = '22023';
  end if;

  select t.* into sub_teacher from public.teachers t where t.id = substitute_key;
  if not found then raise exception 'Substitute faculty member not found' using errcode = '22023'; end if;
  select p.* into sub_profile from public.user_profiles p
    where p.id = sub_teacher.user_id and p.institution_id = slot.institution_id and p.enabled = true and p.role = 'teacher';
  if not found then
    raise exception 'Substitute must be an active faculty member in the same institution' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.timetable_slots conflict_slot
    where conflict_slot.teacher_id = substitute_key
      and conflict_slot.academic_year = slot.academic_year
      and conflict_slot.day_of_week = slot.day_of_week
      and conflict_slot.period_number = slot.period_number
  ) then
    raise exception 'Selected substitute already has a scheduled class during this period' using errcode = '23505';
  end if;

  select * into cl from public.classes where id = slot.class_id;
  select * into su from public.subjects where id = slot.subject_id;

  insert into public.substitute_requests(
    institution_id, timetable_entry_id, class_id, subject_id,
    original_teacher_id, substitute_teacher_id, lecture_date, reason, status
  ) values (
    slot.institution_id, slot.id, slot.class_id, slot.subject_id,
    slot.teacher_id, substitute_key, lecture_date, trim(reason_text), 'pending'
  ) returning id into req_id;

  -- Notify the requested substitute faculty member
  insert into public.notifications(user_id, title, message, type, link)
  values (
    sub_profile.id,
    'Substitute lecture request: ' || su.code,
    a.name || ' requested you to cover ' || su.code || ' (' || cl.name || ') on ' || lecture_date || '. Reason: ' || trim(reason_text),
    'info',
    '/teacher/corrections'
  );

  -- Notify department HOD(s)
  insert into public.notifications(user_id, title, message, type, link)
  select p.id,
    'Substitute approval needed: ' || su.code,
    a.name || ' requested ' || sub_profile.name || ' as substitute for ' || cl.name || ' on ' || lecture_date || '.',
    'warning',
    '/admin/corrections'
  from public.user_profiles p
  where p.institution_id = slot.institution_id
    and p.department_id = cl.department_id
    and p.role = 'hod'
    and p.enabled = true;

  perform attendance_private.write_audit(
    'REQUEST_SUBSTITUTE', 'SubstituteRequest', req_id, cl.department_id,
    format('Requested %s as substitute for %s on %s', sub_profile.name, su.code, lecture_date)
  );
  return req_id;
end;
$$;

create or replace function public.portal_review_substitute(
  request_key uuid,
  decision text,
  notes text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.user_profiles := attendance_private.actor();
  req public.substitute_requests;
  cl public.classes;
  su public.subjects;
  orig_user uuid;
  sub_user uuid;
begin
  select * into req from public.substitute_requests where id = request_key for update;
  if not found or a.id is null or not attendance_private.same_institution(req.institution_id) then
    raise exception 'Substitute request access denied' using errcode = '42501';
  end if;
  if decision is null or decision not in ('approved', 'rejected', 'cancelled') or length(notes) > 2000 then
    raise exception 'Choose a valid review decision' using errcode = '22023';
  end if;
  if req.status <> 'pending' then
    raise exception 'Only pending substitute requests can be updated' using errcode = '22023';
  end if;

  if decision = 'cancelled' then
    if not (attendance_private.own_teacher(req.original_teacher_id) or attendance_private.can_manage_class(req.class_id)) then
      raise exception 'Only the requesting faculty or department approver can cancel' using errcode = '42501';
    end if;
  else
    if not (attendance_private.can_manage_class(req.class_id) or attendance_private.own_teacher(req.substitute_teacher_id)) then
      raise exception 'Substitute approval denied' using errcode = '42501';
    end if;
  end if;

  update public.substitute_requests
    set status = decision,
        reviewed_by_profile_id = a.id,
        review_notes = nullif(trim(notes), ''),
        reviewed_at = now()
    where id = request_key;

  select * into cl from public.classes where id = req.class_id;
  select * into su from public.subjects where id = req.subject_id;
  select user_id into orig_user from public.teachers where id = req.original_teacher_id;
  select user_id into sub_user from public.teachers where id = req.substitute_teacher_id;

  if orig_user is not null and orig_user <> a.id then
    insert into public.notifications(user_id, title, message, type, link)
    values (
      orig_user,
      'Substitute request ' || decision,
      'Your substitute request for ' || su.code || ' on ' || req.lecture_date || ' was ' || decision || ' by ' || a.name || '.',
      case when decision = 'approved' then 'success' else 'info' end,
      '/teacher/timetable'
    );
  end if;

  if sub_user is not null and sub_user <> a.id then
    insert into public.notifications(user_id, title, message, type, link)
    values (
      sub_user,
      'Substitute assignment ' || decision,
      'Substitute assignment for ' || su.code || ' (' || cl.name || ') on ' || req.lecture_date || ' is now ' || decision || '.',
      case when decision = 'approved' then 'success' else 'info' end,
      '/teacher/timetable'
    );
  end if;

  perform attendance_private.write_audit(
    upper(decision) || '_SUBSTITUTE', 'SubstituteRequest', request_key, cl.department_id,
    format('Marked substitute request %s for %s on %s', decision, su.code, req.lecture_date)
  );
  return request_key;
end;
$$;

do $$
declare fn regprocedure;
begin
  for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname in (
      'portal_adjust_lecture',
      'portal_revert_lecture_adjustment',
      'portal_request_substitute',
      'portal_review_substitute'
    ) loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

-- Live roll calls stage marks separately until the instructor reviews and submits the roster.
alter table public.institution_settings add column unmarked_policy text not null default 'absent'
 check(unmarked_policy in ('absent','require_mark'));
create table public.lecture_roll_calls (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions,
 assignment_id uuid not null references public.teacher_assignments, slot_id uuid not null references public.timetable_slots,
 class_id uuid not null references public.classes, subject_id uuid not null references public.subjects,
 teacher_id uuid not null references public.teachers, day date not null, starts time not null, ends time not null,
 kind text not null check(kind in ('lecture','lab','tutorial')), phase text not null default 'draft' check(phase in ('draft','open','closed','finalized')),
 expires_at timestamptz, present_count int not null default 0, version bigint not null default 0,
 final_id uuid unique references public.attendance_sessions, unique(slot_id,day),unique(class_id,subject_id,day,starts)
);
create index roll_calls_teacher_day on public.lecture_roll_calls(teacher_id,day);
create table attendance_private.lecture_keys (
 call_id uuid primary key references public.lecture_roll_calls, pin text not null unique, token uuid not null unique
);
create table attendance_private.lecture_marks (
 call_id uuid not null references public.lecture_roll_calls, student_id uuid not null references public.students,
 status text not null check(status in ('present','absent','leave')), method text not null check(method in ('manual','code','qr')),
 primary key(call_id,student_id)
);
create table attendance_private.checkin_limits(profile_id uuid primary key references public.user_profiles, since timestamptz not null, attempts int not null);
revoke all on attendance_private.lecture_keys,attendance_private.lecture_marks,attendance_private.checkin_limits from public,anon,authenticated;
alter table public.lecture_roll_calls enable row level security;
revoke all on public.lecture_roll_calls from public,anon,authenticated;
grant select on public.lecture_roll_calls to authenticated;
create policy faculty_roll_calls on public.lecture_roll_calls for select to authenticated using
 (attendance_private.assigned_teacher(class_id,subject_id,teacher_id) and attendance_private.same_institution(institution_id));
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   alter publication supabase_realtime add table public.lecture_roll_calls;
 end if;
end $$;

create function public.lecture_draft(slot_key uuid,lecture_day date,session_kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare sl public.timetable_slots; a public.user_profiles:=attendance_private.actor(); assignment uuid; result uuid;
begin
 select * into strict sl from public.timetable_slots where id=slot_key for share;
 if not attendance_private.assigned_teacher(sl.class_id,sl.subject_id,sl.teacher_id) or sl.institution_id is distinct from a.institution_id
 then raise exception 'Assigned faculty required' using errcode='42501'; end if;
 select id into strict assignment from public.teacher_assignments where teacher_id=sl.teacher_id and class_id=sl.class_id and subject_id=sl.subject_id and academic_year=sl.academic_year;
 if exists(select 1 from public.academic_holidays where institution_id=a.institution_id and day=lecture_day) or not exists(select 1 from public.classes c join public.semesters sm on sm.id=c.semester_id join public.academic_years y on y.id=sm.academic_year_id
 join public.institution_settings cfg on cfg.institution_id=y.institution_id where c.id=sl.class_id and y.institution_id=a.institution_id and lecture_day between y.starts_on and y.ends_on
 and lecture_day<=(now() at time zone cfg.time_zone)::date and trim(to_char(lecture_day,'Day'))=sl.day_of_week)
 then raise exception 'Choose a scheduled teaching date within the academic year'; end if;
 perform 1 from public.classes where id=sl.class_id for no key update;
 if exists(select 1 from public.attendance_sessions where class_id=sl.class_id and subject_id=sl.subject_id and date=lecture_day and start_time=sl.start_time)
 then raise exception 'Attendance already submitted'; end if;
 insert into public.lecture_roll_calls(institution_id,assignment_id,slot_id,class_id,subject_id,teacher_id,day,starts,ends,kind)
 values(a.institution_id,assignment,sl.id,sl.class_id,sl.subject_id,sl.teacher_id,lecture_day,sl.start_time,sl.end_time,session_kind) returning id into result;
 perform attendance_private.write_audit('DRAFT_SESSION','Lecture',result,a.department_id,'Created scheduled roll call');
 return result;
end $$;

create function attendance_private.lock_lecture(k uuid) returns public.lecture_roll_calls language plpgsql security definer set search_path='' as $$
declare r public.lecture_roll_calls;
begin
 select * into r from public.lecture_roll_calls where id=k for update;
 if r.id is null or not attendance_private.assigned_teacher(r.class_id,r.subject_id,r.teacher_id) then raise exception 'Assigned faculty required' using errcode='42501'; end if;
 return r;
end $$;
create function attendance_private.lecture_roster(r public.lecture_roll_calls) returns table(student_id uuid,name text,identifier text,status text,method text)
language sql stable security definer set search_path='' as $$
 select s.id,p.name::text,coalesce(s.usn,s.roll_number)::text,m.status,m.method from public.enrollments e join public.students s on s.id=e.student_id join public.user_profiles p on p.id=s.user_id
 join public.classes c on c.id=e.class_id left join attendance_private.lecture_marks m on m.call_id=r.id and m.student_id=s.id
 where r.final_id is null and e.class_id=r.class_id and s.department_id=c.department_id and p.institution_id=r.institution_id and r.day>=e.enrolled_from and (e.enrolled_until is null or r.day<=e.enrolled_until) union all
 select s.id,p.name::text,coalesce(s.usn,s.roll_number)::text,ar.status::text,coalesce(m.method,'policy')
 from public.attendance_records ar join public.students s on s.id=ar.student_id join public.user_profiles p on p.id=s.user_id
 left join attendance_private.lecture_marks m on m.call_id=r.id and m.student_id=s.id where ar.session_id=r.final_id order by 3
$$;
create function public.lecture_review(call_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.lecture_roll_calls:=attendance_private.lock_lecture(call_key); pin text; token uuid;
begin
 if r.phase='open' and clock_timestamp()>=r.expires_at then
 update public.lecture_roll_calls set phase='closed',version=version+1 where id=r.id returning * into r;
 delete from attendance_private.lecture_keys where call_id=r.id;
 perform attendance_private.write_audit('CLOSE_SESSION','Lecture',r.id,(attendance_private.actor()).department_id,'Check-in window expired');
 end if;
 select k.pin,k.token into pin,token from attendance_private.lecture_keys k where k.call_id=r.id and r.phase='open';
 return jsonb_build_object('session',to_jsonb(r),'signature',(select md5(coalesce(string_agg(student_id::text,',' order by student_id),'') || ':' || (select unmarked_policy from public.institution_settings where institution_id=r.institution_id)) from attendance_private.lecture_roster(r)),'pin',pin,'token',token,'roster',coalesce((select jsonb_agg(to_jsonb(x)) from attendance_private.lecture_roster(r) x),'[]'::jsonb));
end $$;
-- Keep the established manual RPC for legacy sessions. The live roster uses the same
-- transactional writer only after the assigned instructor has reviewed it.
alter function public.portal_save_attendance(uuid,uuid,uuid,uuid,date,time,time,text,jsonb) set schema attendance_private;
revoke all on function attendance_private.portal_save_attendance(uuid,uuid,uuid,uuid,date,time,time,text,jsonb) from public,anon,authenticated;
create function public.portal_save_attendance(session_key uuid,class_key uuid,subject_key uuid,teacher_key uuid,session_date date,
 starts time,ends time,kind text,roster jsonb) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not attendance_private.can_manage_session(class_key,subject_key,teacher_key) then raise exception 'Attendance access denied' using errcode='42501'; end if;
 perform 1 from public.classes where id=class_key for no key update;
 if exists(select 1 from public.lecture_roll_calls r where r.final_id=session_key or
 (r.class_id,r.subject_id,r.day,r.starts)=(class_key,subject_key,session_date,portal_save_attendance.starts)) then raise exception 'Use the session review or documented correction workflow'; end if;
 return attendance_private.portal_save_attendance(session_key,class_key,subject_key,teacher_key,session_date,starts,ends,kind,roster);
end $$;
revoke all on function public.portal_save_attendance(uuid,uuid,uuid,uuid,date,time,time,text,jsonb) from public,anon;
grant execute on function public.portal_save_attendance(uuid,uuid,uuid,uuid,date,time,time,text,jsonb) to authenticated;

create function public.lecture_transition(call_key uuid,action text,minutes int default null,review_version bigint default null,review_roster text default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.lecture_roll_calls:=attendance_private.lock_lecture(call_key); cfg public.institution_settings; roster jsonb; final_key uuid; dept uuid:=(attendance_private.actor()).department_id;
begin
 select * into strict cfg from public.institution_settings where institution_id=r.institution_id for share;
 if action='open' and r.phase='draft' then
 if minutes is null or minutes not between 1 and 60 or r.day<>(clock_timestamp() at time zone cfg.time_zone)::date then raise exception 'Check-in requires today’s lecture and a window of 1–60 minutes'; end if;
 if not exists(select 1 from public.timetable_slots sl join public.teacher_assignments a on a.id=r.assignment_id where sl.id=r.slot_id
 and (sl.class_id,sl.subject_id,sl.teacher_id,sl.institution_id,sl.start_time,sl.end_time,sl.day_of_week,sl.academic_year)=(r.class_id,r.subject_id,r.teacher_id,r.institution_id,r.starts,r.ends,trim(to_char(r.day,'Day')),a.academic_year)
 and (a.class_id,a.subject_id,a.teacher_id)=(r.class_id,r.subject_id,r.teacher_id) for share of sl,a) then raise exception 'The scheduled lecture has changed'; end if;
 loop
 begin
 insert into attendance_private.lecture_keys values(r.id,lpad(((('x'||left(gen_random_uuid()::text,8))::bit(32)::bigint)%100000000)::text,8,'0'),gen_random_uuid()); exit;
 exception when unique_violation then null; end;
 end loop;
 update public.lecture_roll_calls set phase='open',expires_at=clock_timestamp()+make_interval(mins=>minutes),version=version+1 where id=r.id;
 elsif action='close' and r.phase in ('draft','open') then
 delete from attendance_private.lecture_keys where call_id=r.id;
 update public.lecture_roll_calls set phase='closed',version=version+1 where id=r.id;
 elsif action='finalize' and r.phase='closed' then
 if review_version is distinct from r.version then raise exception 'Roster changed. Review it again before submitting.'; end if;
 perform 1 from public.classes where id=r.class_id for no key update;
 if review_roster is distinct from (select md5(coalesce(string_agg(student_id::text,',' order by student_id),'') || ':' || (select unmarked_policy from public.institution_settings where institution_id=r.institution_id)) from attendance_private.lecture_roster(r)) then raise exception 'Enrollment or policy changed. Review the roster again.'; end if;
 if cfg.unmarked_policy='require_mark' and exists(select 1 from attendance_private.lecture_roster(r) where status is null) then raise exception 'Mark every student before submitting'; end if;
 select jsonb_agg(jsonb_build_object('student_id',x.student_id,'status',coalesce(x.status,'absent'))) into roster from attendance_private.lecture_roster(r) x;
 final_key:=attendance_private.portal_save_attendance(null,r.class_id,r.subject_id,r.teacher_id,r.day,r.starts,r.ends,r.kind,roster);
 update public.attendance_sessions set timetable_entry_id=r.slot_id where id=final_key;
 update public.attendance_records ar set marked_by='code' from attendance_private.lecture_marks m where ar.session_id=final_key and m.call_id=r.id and ar.student_id=m.student_id and m.method in ('qr','code');
 update public.lecture_roll_calls set phase='finalized',final_id=final_key,version=version+1 where id=r.id;
 else raise exception 'Session transition unavailable'; end if;
 perform attendance_private.write_audit(upper(action)||'_SESSION','Lecture',r.id,dept,'Faculty session transition');
end $$;

create function public.lecture_manual(call_key uuid,student_key uuid,mark text) returns void language plpgsql security definer set search_path='' as $$
declare r public.lecture_roll_calls:=attendance_private.lock_lecture(call_key);
begin
 if r.phase='finalized' or not exists(select 1 from attendance_private.lecture_roster(r) where student_id=student_key) then raise exception 'Roster is unavailable'; end if;
 insert into attendance_private.lecture_marks values(r.id,student_key,mark,'manual') on conflict(call_id,student_id) do update set status=excluded.status,method='manual';
 update public.lecture_roll_calls set version=version+1,present_count=(select count(*) from attendance_private.lecture_marks where call_id=r.id and status='present') where id=r.id;
 perform attendance_private.write_audit('MANUAL_MARK','Lecture',r.id,(attendance_private.actor()).department_id,format('Student %s marked %s',student_key,mark));
end $$;
create function public.lecture_checkin(credential text) returns text language plpgsql security definer set search_path='' as $$
declare a public.user_profiles:=attendance_private.actor(); r public.lecture_roll_calls; student uuid; attempts int; method text;
begin
 if a.role is distinct from 'student' then raise exception 'Sign in with a student account' using errcode='42501'; end if;
 insert into attendance_private.checkin_limits as l values(a.id,clock_timestamp(),1) on conflict(profile_id) do update
 set attempts=case when l.since<=clock_timestamp()-interval '1 minute' then 1 else least(l.attempts+1,9) end,
 since=case when l.since<=clock_timestamp()-interval '1 minute' then clock_timestamp() else l.since end returning l.attempts into attempts;
 if attempts>8 then return 'Too many attempts. Try again in one minute.'; end if;
 method:=case when credential ~ '^[0-9]{8}$' then 'code' else 'qr' end;
 select l.* into r from attendance_private.lecture_keys k join public.lecture_roll_calls l on l.id=k.call_id
 where l.institution_id=a.institution_id and (k.pin=credential or k.token::text=credential) for update of l;
 if r.id is null or r.phase<>'open' or r.expires_at<=clock_timestamp() then return 'Invalid or expired check-in. Ask your instructor for help.'; end if;
 select s.id into student from public.students s join public.enrollments e on e.student_id=s.id join public.classes c on c.id=e.class_id
 where s.user_id=a.id and e.class_id=r.class_id and s.department_id=c.department_id and r.day>=e.enrolled_from and (e.enrolled_until is null or r.day<=e.enrolled_until) for share of e;
 if student is null then return 'You are not enrolled in this lecture.'; end if;
 insert into attendance_private.lecture_marks values(r.id,student,'present',method) on conflict do nothing;
 if not found then return 'Attendance already recorded. Contact your instructor for changes.'; end if;
 update public.lecture_roll_calls set present_count=present_count+1,version=version+1 where id=r.id;
 perform attendance_private.write_audit('STUDENT_CHECKIN','Lecture',r.id,a.department_id,method||' check-in');
 return 'Checked in successfully.';
end $$;
create function public.lecture_policy(policy text) returns void language plpgsql security definer set search_path='' as $$
declare a public.user_profiles:=attendance_private.actor();
begin
 if a.role is distinct from 'admin' then raise exception 'Institution administrator required' using errcode='42501'; end if;
 update public.institution_settings set unmarked_policy=policy where institution_id=a.institution_id;
 perform attendance_private.write_audit('UPDATE_SESSION_POLICY','Institution',a.institution_id,null,policy);
end $$;
revoke all on function attendance_private.lock_lecture(uuid), attendance_private.lecture_roster(public.lecture_roll_calls) from public,anon,authenticated;
do $$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname in
 ('lecture_policy','lecture_draft','lecture_review','lecture_transition','lecture_manual','lecture_checkin') loop
 execute format('revoke all on function %s from public,anon,authenticated',f);
 execute format('grant execute on function %s to authenticated',f);
 end loop;
end $$;

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.teacher_assignments on delete cascade,
  created_at timestamptz not null default now()
);
create table public.classroom_members (
  classroom_id uuid not null references public.classrooms on delete cascade,
  student_id uuid not null references public.students on delete cascade,
  joined boolean not null default false,
  primary key (classroom_id, student_id)
);
create table public.classroom_posts (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms on delete cascade,
  kind text not null check (kind in ('announcement','note','assignment')),
  title text not null check (length(btrim(title)) between 1 and 160),
  body text not null check (length(btrim(body)) between 1 and 12000),
  due_date date,
  created_at timestamptz not null default now(),
  check (kind = 'assignment' or due_date is null)
);
create index classroom_posts_room_date on public.classroom_posts(classroom_id, created_at desc);
create index classroom_members_student on public.classroom_members(student_id, classroom_id);

create function attendance_private.classroom_teacher(room uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.classrooms cr join public.teacher_assignments a on a.id=cr.assignment_id
    where cr.id=room and attendance_private.assigned_teacher(a.class_id,a.subject_id,a.teacher_id)
  )
$$;
create function attendance_private.classroom_eligible(room uuid, learner uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.classrooms cr join public.teacher_assignments a on a.id=cr.assignment_id
    join public.classes c on c.id=a.class_id join public.departments d on d.id=c.department_id
    join public.institution_settings cfg on cfg.institution_id=d.institution_id
    join public.enrollments e on e.class_id=c.id join public.students s on s.id=e.student_id
    join public.user_profiles p on p.id=s.user_id
    where cr.id=room and s.id=learner and s.department_id=c.department_id and p.institution_id=d.institution_id
      and p.role='student' and p.enabled and p.department_id=d.id
      and e.enrolled_from <= (now() at time zone cfg.time_zone)::date
      and (e.enrolled_until is null or e.enrolled_until >= (now() at time zone cfg.time_zone)::date)
      and attendance_private.valid_assignment(a.teacher_id,a.class_id,a.subject_id,a.academic_year)
  )
$$;
create function attendance_private.classroom_student(room uuid, require_join boolean) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.classroom_members m where m.classroom_id=room
      and (m.joined or not require_join) and attendance_private.own_student(m.student_id)
      and attendance_private.classroom_eligible(room,m.student_id)
  )
$$;
revoke all on function attendance_private.classroom_teacher(uuid),attendance_private.classroom_eligible(uuid,uuid),
 attendance_private.classroom_student(uuid,boolean) from public,anon,authenticated;
grant execute on function attendance_private.classroom_teacher(uuid),attendance_private.classroom_student(uuid,boolean) to authenticated;

alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;
alter table public.classroom_posts enable row level security;
revoke all on public.classrooms,public.classroom_members,public.classroom_posts from public,anon,authenticated;
grant select on public.classrooms,public.classroom_posts to authenticated;
grant insert on public.classroom_posts to authenticated;
create policy classroom_read on public.classrooms for select to authenticated using (
 attendance_private.classroom_teacher(id) or attendance_private.classroom_student(id,false)
);
create policy classroom_post_read on public.classroom_posts for select to authenticated using (
 attendance_private.classroom_teacher(classroom_id) or attendance_private.classroom_student(classroom_id,true)
);
create policy classroom_post_insert on public.classroom_posts for insert to authenticated
 with check (attendance_private.classroom_teacher(classroom_id));
create trigger audit_classroom_posts after insert on public.classroom_posts
 for each row execute function attendance_private.audit_catalog();

-- School email lookups stay inside the actor's assigned section. No invitation email is sent.
create function public.classroom_manage(room uuid, school_email text, operation text) returns void
language plpgsql security definer set search_path='' as $$
declare learner uuid;
begin
 if not attendance_private.classroom_teacher(room) then raise exception 'Assigned faculty required' using errcode='42501'; end if;
 select s.id into learner from public.students s join public.user_profiles p on p.id=s.user_id
  where p.institution_id=(attendance_private.actor()).institution_id and lower(trim(p.email))=lower(trim(school_email))
  and attendance_private.classroom_eligible(room,s.id);
 if operation='remove' then
   delete from public.classroom_members m using public.students s, public.user_profiles p
    where m.classroom_id=room and s.id=m.student_id and p.id=s.user_id
      and lower(trim(p.email))=lower(trim(school_email)) returning m.student_id into learner;
   if not found then raise exception 'No classroom member matches that email'; end if;
 elsif operation in ('invite','add') then
   if learner is null then raise exception 'No eligible student in this section matches that college email'; end if;
   insert into public.classroom_members as m values(room,learner,operation='add')
    on conflict(classroom_id,student_id) do update set joined=m.joined or excluded.joined;
 else raise exception 'Unknown classroom action'; end if;
 perform attendance_private.write_audit('CLASSROOM_'||upper(operation),'Classroom',room,
   (attendance_private.actor()).department_id,'Student '||learner);
end $$;

create function public.classroom_create(assignment uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare room uuid;
begin
 if not exists(select 1 from public.teacher_assignments a where a.id=assignment
    and attendance_private.assigned_teacher(a.class_id,a.subject_id,a.teacher_id))
 then raise exception 'Assigned faculty required' using errcode='42501'; end if;
 insert into public.classrooms(assignment_id) values(assignment)
 on conflict(assignment_id) do nothing returning id into room;
 if room is null then select id into room from public.classrooms where assignment_id=assignment;
 else perform attendance_private.write_audit('CREATE_CLASSROOM','Classroom',room,(attendance_private.actor()).department_id,'Created classroom'); end if;
 return room;
end $$;

create function public.classroom_join(room uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.classroom_members m set joined=true where m.classroom_id=room
   and attendance_private.own_student(m.student_id) and attendance_private.classroom_eligible(room,m.student_id);
 if not found then raise exception 'An invitation for this section is required' using errcode='42501'; end if;
end $$;

-- Student-visible metadata comes from the authorized classroom rather than widening assignment permissions.
create function public.classroom_list() returns table (
 id uuid, assignment_id uuid, class_id uuid, subject_id uuid, teacher_id uuid,
 subject text, code text, section text, semester int, academic_year text, joined boolean
) language sql stable security definer set search_path='' as $$
 select cr.id,a.id,c.id,s.id,a.teacher_id,s.name::text,s.code::text,c.section::text,c.semester,c.academic_year::text,
  attendance_private.classroom_teacher(cr.id) or attendance_private.classroom_student(cr.id,true)
 from public.classrooms cr join public.teacher_assignments a on a.id=cr.assignment_id
 join public.classes c on c.id=a.class_id join public.subjects s on s.id=a.subject_id
 where attendance_private.classroom_teacher(cr.id) or attendance_private.classroom_student(cr.id,false)
 order by c.academic_year desc,s.code,c.section
$$;

create function public.classroom_people(room uuid) returns table(student_id uuid,name text,email text,joined boolean,eligible boolean)
language sql stable security definer set search_path='' as $$
 select s.id,p.name::text,p.email::text,m.joined,attendance_private.classroom_eligible(room,s.id)
 from public.classroom_members m join public.students s on s.id=m.student_id join public.user_profiles p on p.id=s.user_id
 where m.classroom_id=room and attendance_private.classroom_teacher(room) order by p.name
$$;
revoke all on function public.classroom_create(uuid),public.classroom_manage(uuid,text,text),public.classroom_join(uuid),
 public.classroom_list(),public.classroom_people(uuid) from public,anon,authenticated;
grant execute on function public.classroom_create(uuid),public.classroom_manage(uuid,text,text),public.classroom_join(uuid),
 public.classroom_list(),public.classroom_people(uuid) to authenticated;

create table public.schedule_versions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions,
  name text not null check (length(btrim(name)) between 1 and 100),
  effective date, published_at timestamptz, created_at timestamptz not null default now(),
  unique(institution_id,effective)
);
alter table public.timetable_slots add column version_id uuid references public.schedule_versions,
 add column on_date date, add column lecture_kind text not null default 'lecture'
 check(lecture_kind in ('lecture','lab','tutorial','elective','special'));
-- Preserve legacy uniqueness and allow independent immutable versions and dated replacements.
do $$ declare constraint_name text; begin
 for constraint_name in select conname from pg_constraint
 where conrelid='public.timetable_slots'::regclass and contype='u' loop
   execute format('alter table public.timetable_slots drop constraint %I',constraint_name);
 end loop;
end $$;
drop index public.timetable_room_period;
create unique index legacy_schedule_faculty on public.timetable_slots(teacher_id,academic_year,day_of_week,period_number) where version_id is null and on_date is null;
create unique index legacy_schedule_section on public.timetable_slots(class_id,academic_year,day_of_week,period_number) where version_id is null and on_date is null;
create unique index legacy_schedule_room on public.timetable_slots(institution_id,academic_year,day_of_week,period_number,lower(trim(classroom))) where version_id is null and on_date is null;
create index schedule_slots_version_day on public.timetable_slots(institution_id,version_id,day_of_week) where on_date is null;

create table public.schedule_events (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions,
 day date not null, title text not null check(length(btrim(title)) between 1 and 150),
 kind text not null check(kind in ('exam','event')), starts time not null, ends time not null check(ends>starts),
 place text not null default '' check(length(place)<=80)
);
create index schedule_events_day on public.schedule_events(institution_id,day);
create table public.schedule_requests (
 id uuid primary key default gen_random_uuid(), institution_id uuid not null references public.institutions,
 slot_id uuid not null references public.timetable_slots, day date not null,
 operation text not null check(operation in ('cancel','move','substitute')),
 new_day date, starts time, ends time, classroom text, substitute uuid references public.teachers,
 reason text not null check(length(btrim(reason)) between 1 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 replacement_id uuid unique references public.timetable_slots, reviewed_at timestamptz, created_at timestamptz not null default now()
);
create unique index schedule_requests_active on public.schedule_requests(slot_id,day) where status in ('pending','approved');
create index schedule_requests_day on public.schedule_requests(institution_id,day);
create index schedule_requests_moved_day on public.schedule_requests(institution_id,new_day) where status='approved';

alter table public.schedule_events enable row level security;
alter table public.schedule_versions enable row level security;
alter table public.schedule_requests enable row level security;
revoke all on public.schedule_events,public.schedule_versions,public.schedule_requests from public,anon,authenticated;
grant select on public.schedule_versions,public.schedule_requests to authenticated;
create policy schedule_versions_admin on public.schedule_versions for select to authenticated using(attendance_private.is_admin(institution_id));
create policy schedule_request_read on public.schedule_requests for select to authenticated using(
 attendance_private.is_admin(institution_id) or exists(select 1 from public.timetable_slots sl where sl.id=slot_id and attendance_private.own_teacher(sl.teacher_id))
);

create function attendance_private.schedule_current(tenant uuid, wanted date) returns uuid language sql stable security definer set search_path='' as $$
 select id from public.schedule_versions where institution_id=tenant and effective<=wanted and published_at is not null order by effective desc limit 1
$$;
create function attendance_private.schedule_day(tenant uuid,wanted date) returns setof public.timetable_slots
language sql stable security definer set search_path='' as $$
 select sl.* from public.timetable_slots sl join public.classes c on c.id=sl.class_id
 join public.semesters sm on sm.id=c.semester_id join public.academic_years y on y.id=sm.academic_year_id
 where sl.institution_id=tenant and wanted between y.starts_on and y.ends_on
 and attendance_private.valid_assignment(sl.teacher_id,sl.class_id,sl.subject_id,sl.academic_year)
 and not exists(select 1 from public.academic_holidays h where h.institution_id=tenant and h.day=wanted)
 and (
   (sl.on_date=wanted and exists(select 1 from public.schedule_requests req where req.replacement_id=sl.id and req.status='approved'))
   or (sl.on_date is null and sl.day_of_week=to_char(wanted,'FMDay')
   and sl.version_id is not distinct from attendance_private.schedule_current(tenant,wanted)
   and not exists(select 1 from public.schedule_requests req where req.slot_id=sl.id and req.day=wanted and req.status='approved'))
 )
$$;

-- Unified agenda with authenticated scope checked against dated enrollment.
create function public.schedule_agenda(first_day date,last_day date) returns table(
 entry_id uuid, day date, title text, code text, section text, teacher text, place text, starts time, ends time,
 kind text, state text, own boolean, utc_start timestamptz, utc_end timestamptz, class_id uuid, subject_id uuid, teacher_id uuid
) language plpgsql stable security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor();
begin
 if actor.id is null then raise exception 'Sign in to view the schedule' using errcode='42501'; end if;
 if first_day is null or last_day is null or last_day-first_day not between 0 and 62 then raise exception 'Select at most 63 days'; end if;
 return query
 with days as (select first_day+n as scheduled_day from generate_series(0,last_day-first_day) n),
 entries as (
   select sl.id slot,days.scheduled_day,case rq.operation when 'move' then 'rescheduled' when 'substitute' then 'substituted' else 'scheduled' end status
   from days cross join lateral attendance_private.schedule_day(actor.institution_id,days.scheduled_day) sl
   left join public.schedule_requests rq on rq.replacement_id=sl.id
   union all
   select rq.slot_id,rq.day,case rq.operation when 'move' then 'moved' when 'substitute' then 'reassigned' else 'cancelled' end
   from public.schedule_requests rq where rq.institution_id=actor.institution_id and rq.status='approved' and rq.day between first_day and last_day
 )
 select sl.id, e.scheduled_day, s.name::text,s.code::text,c.name::text,p.name::text,sl.classroom,sl.start_time,sl.end_time,
 sl.lecture_kind,e.status,attendance_private.own_teacher(sl.teacher_id),
 (e.scheduled_day+sl.start_time) at time zone cfg.time_zone, (e.scheduled_day+sl.end_time) at time zone cfg.time_zone,sl.class_id,sl.subject_id,sl.teacher_id
 from entries e join public.timetable_slots sl on sl.id=e.slot join public.classes c on c.id=sl.class_id
 join public.institution_settings cfg on cfg.institution_id=sl.institution_id
 join public.subjects s on s.id=sl.subject_id join public.teachers t on t.id=sl.teacher_id join public.user_profiles p on p.id=t.user_id
 where attendance_private.can_manage_class(c.id) or attendance_private.own_teacher(t.id) or (
   actor.role='student' and exists(select 1 from public.enrollments en where en.class_id=c.id
     and attendance_private.own_student(en.student_id) and en.enrolled_from<=e.scheduled_day
     and (en.enrolled_until is null or en.enrolled_until>=e.scheduled_day)))
 union all
 select h.id,h.day,h.name,null,null,null,null,null,null,'holiday','scheduled',false,null,null,null,null,null
 from public.academic_holidays h where h.institution_id=actor.institution_id and h.day between first_day and last_day
 union all
 select ev.id,ev.day,ev.title,null,null,null,ev.place,ev.starts,ev.ends,ev.kind,'scheduled',false,
 (ev.day+ev.starts) at time zone cfg.time_zone,(ev.day+ev.ends) at time zone cfg.time_zone,null,null,null
 from public.schedule_events ev join public.institution_settings cfg on cfg.institution_id=ev.institution_id where ev.institution_id=actor.institution_id and ev.day between first_day and last_day
 order by 2,8 nulls first,3;
end $$;

create function public.schedule_new(name text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor(); result uuid; previous uuid;
begin
 if actor.role is distinct from 'admin' then raise exception 'Institution administrator required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 select id into previous from public.schedule_versions where institution_id=actor.institution_id and published_at is not null order by effective desc limit 1;
 insert into public.schedule_versions(institution_id,name) values(actor.institution_id,btrim(name)) returning id into result;
 insert into public.timetable_slots(institution_id,teacher_id,subject_id,class_id,academic_year,classroom,day_of_week,period_number,start_time,end_time,version_id,lecture_kind)
 select sl.institution_id,sl.teacher_id,sl.subject_id,sl.class_id,sl.academic_year,sl.classroom,sl.day_of_week,sl.period_number,sl.start_time,sl.end_time,result,sl.lecture_kind
 from public.timetable_slots sl where sl.institution_id=actor.institution_id and sl.version_id is not distinct from previous and sl.on_date is null;
 return result;
end $$;

create function attendance_private.schedule_terms_overlap(first_section uuid,second_section uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.classes a join public.semesters sa on sa.id=a.semester_id
 join public.academic_years ya on ya.id=sa.academic_year_id
 cross join public.classes b join public.semesters sb on sb.id=b.semester_id
 join public.academic_years yb on yb.id=sb.academic_year_id
 where a.id=first_section and b.id=second_section and ya.starts_on<=yb.ends_on and yb.starts_on<=ya.ends_on)
$$;
revoke all on function attendance_private.schedule_terms_overlap(uuid,uuid) from public,anon,authenticated;

create function public.schedule_slot(draft uuid, slot uuid, assignment uuid, weekday text, room text, starts time, ends time, kind text, remove boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor(); a public.teacher_assignments;
begin
 if actor.role is distinct from 'admin' then raise exception 'Institution administrator required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 if not exists(select 1 from public.schedule_versions where id=draft and institution_id=actor.institution_id and published_at is null)
 then raise exception 'Select an editable draft' using errcode='42501'; end if;
 if slot is not null and not exists(select 1 from public.timetable_slots where id=slot and version_id=draft)
 then raise exception 'Slot unavailable in this draft' using errcode='42501'; end if;
 if remove then delete from public.timetable_slots where id=slot and version_id=draft; return; end if;
 select x.* into a from public.teacher_assignments x join public.classes c on c.id=x.class_id
 join public.departments d on d.id=c.department_id where x.id=assignment and d.institution_id=actor.institution_id;
 if a.id is null or not attendance_private.valid_assignment(a.teacher_id,a.class_id,a.subject_id,a.academic_year) then raise exception 'Select a valid teaching assignment'; end if;
 if exists(select 1 from public.timetable_slots s where s.version_id=draft and s.day_of_week=weekday and s.id is distinct from slot
  and attendance_private.schedule_terms_overlap(s.class_id,a.class_id) and s.start_time<ends and s.end_time>starts
  and (s.teacher_id=a.teacher_id or s.class_id=a.class_id or lower(btrim(s.classroom))=lower(btrim(room))))
 then raise exception 'This time overlaps a faculty, section or classroom allocation'; end if;
 if slot is null then
  insert into public.timetable_slots(institution_id,teacher_id,subject_id,class_id,academic_year,classroom,day_of_week,period_number,start_time,end_time,version_id,lecture_kind)
  values(actor.institution_id,a.teacher_id,a.subject_id,a.class_id,a.academic_year,btrim(room),weekday,1,starts,ends,draft,kind);
 else
  update public.timetable_slots set teacher_id=a.teacher_id,subject_id=a.subject_id,class_id=a.class_id,academic_year=a.academic_year,
   classroom=btrim(room),day_of_week=weekday,start_time=starts,end_time=ends,lecture_kind=kind where id=slot;
 end if;
end $$;

create function public.schedule_publish(draft uuid,from_day date) returns void language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor();
begin
 if actor.role is distinct from 'admin' then raise exception 'Institution administrator required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 if from_day is null or from_day<=(select (now() at time zone time_zone)::date from public.institution_settings where institution_id=actor.institution_id)
 or exists(select 1 from public.schedule_versions where institution_id=actor.institution_id and effective>=from_day) then
 raise exception 'Choose a future date after the latest published version'; end if;
 if exists(select 1 from public.lecture_roll_calls where institution_id=actor.institution_id and day>=from_day)
 then raise exception 'Choose an effective date after existing attendance sessions'; end if;
 if exists(select 1 from public.schedule_requests where institution_id=actor.institution_id and status='approved'
    and greatest(day,coalesce(new_day,day))>=from_day) then raise exception 'Choose an effective date after the approved lecture changes'; end if;
 if exists(select 1 from public.timetable_slots a join public.timetable_slots b on b.version_id=a.version_id and b.id>a.id
   and attendance_private.schedule_terms_overlap(a.class_id,b.class_id) and a.day_of_week=b.day_of_week and a.start_time<b.end_time and a.end_time>b.start_time
   where a.version_id=draft and (a.teacher_id=b.teacher_id or a.class_id=b.class_id or lower(btrim(a.classroom))=lower(btrim(b.classroom))))
 then raise exception 'Resolve overlapping faculty, section or classroom allocations before publishing'; end if;
 update public.schedule_versions set effective=from_day,published_at=now() where id=draft and institution_id=actor.institution_id and published_at is null;
 if not found then raise exception 'Draft unavailable' using errcode='42501'; end if;
 insert into public.notifications(user_id,title,message,link)
 select p.id,'Timetable published','The new timetable takes effect on '||from_day||'.','/student/timetable'
 from public.user_profiles p where p.institution_id=actor.institution_id and p.role='student' and p.enabled;
 perform attendance_private.write_audit('PUBLISH_TIMETABLE','ScheduleVersion',draft,null,'Effective '||from_day);
end $$;
create function public.schedule_request(source_slot uuid, source_day date, change_type text, reason_text text, target_day date default null,
 target_start time default null,target_end time default null,target_room text default null,substitute_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor(); sl public.timetable_slots; today date;
begin
 if actor.role is distinct from 'teacher' then raise exception 'Assigned faculty required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 select * into sl from attendance_private.schedule_day(actor.institution_id,source_day) where id=source_slot and on_date is null;
 if sl.id is null or not attendance_private.own_teacher(sl.teacher_id) then raise exception 'Assigned scheduled lecture required' using errcode='42501'; end if;
 select (now() at time zone time_zone)::date into today from public.institution_settings where institution_id=actor.institution_id;
 if source_day<today or (change_type='move' and (target_day is null or target_day<today or target_start is null or target_end is null
   or target_start>=target_end or coalesce(length(trim(target_room)),0) not between 1 and 80))
 then raise exception 'Choose a valid date, time and room'; end if;
 if change_type='substitute' and not exists(select 1 from public.teacher_assignments x where x.teacher_id=substitute_id and x.class_id=sl.class_id
 and x.subject_id=sl.subject_id and x.academic_year=sl.academic_year and x.teacher_id<>sl.teacher_id
 and attendance_private.valid_assignment(x.teacher_id,sl.class_id,sl.subject_id,sl.academic_year))
 then raise exception 'Choose a substitute assigned to this subject and section'; end if;
 insert into public.schedule_requests(institution_id,slot_id,day,operation,new_day,starts,ends,classroom,substitute,reason)
 values(actor.institution_id,sl.id,source_day,change_type,case when change_type='move' then target_day end,
 case when change_type='move' then target_start end,case when change_type='move' then target_end end,
 case when change_type='move' then trim(target_room) end,case when change_type='substitute' then substitute_id end,trim(reason_text));
 perform attendance_private.write_audit('REQUEST_TIMETABLE_CHANGE','TimetableSlot',sl.id,actor.department_id,change_type||' on '||source_day);
end $$;

create function public.schedule_review(request_id uuid,approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor(); req public.schedule_requests; sl public.timetable_slots;
 target_day date; target_start time; target_end time; target_room text; instructor uuid; replacement uuid;
begin
 if actor.role is distinct from 'admin' then raise exception 'Institution administrator required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 select * into req from public.schedule_requests where id=request_id and institution_id=actor.institution_id and status='pending' for update;
 if req.id is null or approve is null then raise exception 'Pending request unavailable'; end if;
 if approve then
   select * into sl from attendance_private.schedule_day(actor.institution_id,req.day) where id=req.slot_id;
   if sl.id is null or least(req.day,coalesce(req.new_day,req.day))<(select (now() at time zone time_zone)::date from public.institution_settings where institution_id=actor.institution_id)
     or exists(select 1 from public.lecture_roll_calls where slot_id=sl.id and day=req.day)
     or exists(select 1 from public.attendance_sessions where class_id=sl.class_id and subject_id=sl.subject_id and date=req.day and start_time=sl.start_time)
   then raise exception 'Lecture changed, has passed or already has attendance'; end if;
   if req.operation<>'cancel' then
     target_day:=coalesce(req.new_day,req.day); target_start:=coalesce(req.starts,sl.start_time);
     target_end:=coalesce(req.ends,sl.end_time); target_room:=coalesce(req.classroom,sl.classroom); instructor:=coalesce(req.substitute,sl.teacher_id);
     if to_char(target_day,'FMDay')='Sunday' or exists(select 1 from public.academic_holidays h where h.institution_id=actor.institution_id and h.day=target_day)
      or not exists(select 1 from public.classes c join public.semesters sm on sm.id=c.semester_id join public.academic_years y on y.id=sm.academic_year_id where c.id=sl.class_id and target_day between y.starts_on and y.ends_on)
      or not exists(select 1 from public.teacher_assignments x join public.teachers t on t.id=x.teacher_id join public.user_profiles p on p.id=t.user_id
        where x.teacher_id=instructor and x.class_id=sl.class_id and x.subject_id=sl.subject_id and x.academic_year=sl.academic_year and p.enabled)
      or not attendance_private.valid_assignment(instructor,sl.class_id,sl.subject_id,sl.academic_year)
     then raise exception 'Choose a teaching day and an eligible faculty assignment'; end if;
     if exists(select 1 from attendance_private.schedule_day(actor.institution_id,target_day) s
       where (s.id<>sl.id or req.day<>target_day) and s.start_time<target_end and s.end_time>target_start
       and (s.teacher_id=instructor or s.class_id=sl.class_id or lower(btrim(s.classroom))=lower(btrim(target_room))))
       or exists(select 1 from public.attendance_sessions s where s.date=target_day and s.class_id=sl.class_id and s.start_time<target_end and s.end_time>target_start)
       or exists(select 1 from public.lecture_roll_calls s where s.day=target_day and s.class_id=sl.class_id and s.starts<target_end and s.ends>target_start)
     then raise exception 'Replacement overlaps a faculty, section or classroom allocation'; end if;
     insert into public.timetable_slots(institution_id,teacher_id,subject_id,class_id,academic_year,classroom,day_of_week,period_number,start_time,end_time,version_id,on_date,lecture_kind)
     values(actor.institution_id,instructor,sl.subject_id,sl.class_id,sl.academic_year,target_room,to_char(target_day,'FMDay'),sl.period_number,target_start,target_end,sl.version_id,target_day,sl.lecture_kind)
     returning id into replacement;
   end if;
   insert into public.notifications(user_id,title,message,link)
   select distinct s.user_id,'Lecture schedule updated',su.code||' on '||req.day||' · '||
     case req.operation when 'cancel' then 'cancelled' when 'move' then 'moved to '||target_day||' at '||to_char(target_start,'HH24:MI') else 'substitute instructor assigned' end,
     '/student/timetable'
   from public.students s join public.enrollments en on en.student_id=s.id join public.subjects su on su.id=sl.subject_id
   where en.class_id=sl.class_id and (
     req.day between en.enrolled_from and coalesce(en.enrolled_until,'infinity'::date)
     or target_day between en.enrolled_from and coalesce(en.enrolled_until,'infinity'::date));
 end if;
 update public.schedule_requests set status=case when approve then 'approved' else 'rejected' end,reviewed_at=now(),replacement_id=replacement where id=req.id;
 perform attendance_private.write_audit('REVIEW_TIMETABLE_CHANGE','ScheduleRequest',req.id,null,case when approve then 'Approved' else 'Rejected' end);
end $$;

create function public.schedule_event(event_id uuid, event_day date, title_text text, event_kind text, begins time default null, finishes time default null,
 location_text text default '', remove boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor(); result uuid;
begin
 if actor.role is distinct from 'admin' then raise exception 'Institution administrator required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 if event_day is null or event_day<(select (now() at time zone time_zone)::date from public.institution_settings where institution_id=actor.institution_id)
 then raise exception 'Choose today or a future date'; end if;
 if event_kind='holiday' then
   if remove then delete from public.academic_holidays where id=event_id and institution_id=actor.institution_id and day=event_day;
   elsif event_id is not null then
     raise exception 'Use removal and addition to change a holiday';
   else
     insert into public.academic_holidays(institution_id,day,name) values(actor.institution_id,event_day,trim(title_text));
   end if;
 elsif remove then
   delete from public.schedule_events where id=event_id and institution_id=actor.institution_id and day=event_day returning id into result;
 elsif event_id is not null then
   update public.schedule_events set day=event_day,title=trim(title_text),kind=event_kind,starts=begins,ends=finishes,place=trim(location_text)
   where id=event_id and institution_id=actor.institution_id and day>=(select (now() at time zone time_zone)::date from public.institution_settings where institution_id=actor.institution_id)
   returning id into result;
   if result is null then raise exception 'Calendar entry unavailable'; end if;
 else
   insert into public.schedule_events(institution_id,day,title,kind,starts,ends,place)
   values(actor.institution_id,event_day,trim(title_text),event_kind,begins,finishes,trim(location_text)) returning id into result;
 end if;
 if event_kind<>'holiday' then perform attendance_private.write_audit(case when remove then 'DELETE_CALENDAR_EVENT' when event_id is not null then 'UPDATE_CALENDAR_EVENT' else 'ADD_CALENDAR_EVENT' end,'CalendarEvent',result,null,title_text); end if;
end $$;

create function attendance_private.guard_schedule_holiday() returns trigger
language plpgsql security definer set search_path='' as $$
declare holiday public.academic_holidays:=case when tg_op='DELETE' then old else new end;
begin
 perform pg_advisory_xact_lock(hashtext(holiday.institution_id::text));
 if holiday.day < (select (now() at time zone time_zone)::date from public.institution_settings where institution_id=holiday.institution_id)
  and exists(select 1 from public.schedule_versions where institution_id=holiday.institution_id and published_at is not null)
 then raise exception 'Published schedule history cannot be changed by a holiday edit'; end if;
 if tg_op='INSERT' and (
   exists(select 1 from public.lecture_roll_calls where institution_id=holiday.institution_id and day=holiday.day)
   or exists(select 1 from public.schedule_requests where institution_id=holiday.institution_id and status='approved' and (day=holiday.day or new_day=holiday.day))
   or exists(select 1 from public.attendance_sessions s join public.classes c on c.id=s.class_id join public.departments d on d.id=c.department_id
     where d.institution_id=holiday.institution_id and s.date=holiday.day)
 ) then raise exception 'This date already has attendance or approved lecture changes'; end if;
 return holiday;
end $$;
revoke all on function attendance_private.guard_schedule_holiday() from public,anon,authenticated;
create trigger guard_academic_holiday before insert or delete on public.academic_holidays
 for each row execute function attendance_private.guard_schedule_holiday();

-- Expose today's published weekly template to dashboard summaries, with dated
-- exceptions resolved by the calendar RPC.
create function attendance_private.schedule_weekly_visible(tenant uuid, version uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select attendance_private.same_institution(tenant) and version is not distinct from
 attendance_private.schedule_current(tenant,(now() at time zone cfg.time_zone)::date)
 from public.institution_settings cfg where cfg.institution_id=tenant
$$;
create function attendance_private.schedule_version_published(version uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.schedule_versions v where v.id=version
 and v.published_at is not null and attendance_private.same_institution(v.institution_id))
$$;
revoke all on function attendance_private.schedule_weekly_visible(uuid,uuid), attendance_private.schedule_version_published(uuid) from public,anon;
grant execute on function attendance_private.schedule_weekly_visible(uuid,uuid), attendance_private.schedule_version_published(uuid) to authenticated;
alter policy timetable_read on public.timetable_slots using (
 attendance_private.same_institution(institution_id) and (
 attendance_private.is_admin(institution_id) or (
 (version_id is null or attendance_private.schedule_version_published(version_id)) and (
 attendance_private.can_manage_session(class_id,subject_id,teacher_id)
 or (attendance_private.in_class(class_id) and attendance_private.valid_assignment(teacher_id,class_id,subject_id,academic_year))
 )))
);
create or replace view public.portal_timetable with (security_invoker=true) as
 select sl.id,sl.institution_id,sl.teacher_id,sl.subject_id,sl.class_id,sl.academic_year,sl.classroom,sl.day_of_week,
 sl.period_number,sl.start_time,sl.end_time,c.department_id,c.semester,c.section,attendance_private.timetable_teacher_name(sl.id) as teacher_name
 from public.timetable_slots sl join public.classes c on c.id=sl.class_id
 where sl.on_date is null and attendance_private.schedule_weekly_visible(sl.institution_id,sl.version_id);

-- Prevent browser writes into published versions or dated replacements.
revoke insert,delete on public.timetable_slots from authenticated;
create function attendance_private.guard_legacy_reschedule() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.version_id is not null or old.on_date is not null then
   if not exists(select 1 from public.schedule_versions where id=old.version_id and published_at is null) or old.on_date is not null then
     raise exception 'Published schedules are immutable. Use a lecture change request';
   end if;
 elsif exists(select 1 from public.schedule_versions where institution_id=old.institution_id and published_at is not null)
 or exists(select 1 from public.lecture_roll_calls where slot_id=old.id)
 or exists(select 1 from public.attendance_sessions where timetable_entry_id=old.id) then
   raise exception 'Use the academic calendar to change this schedule';
 end if;
 return new;
end $$;
create trigger guard_schedule_update before update on public.timetable_slots for each row execute function attendance_private.guard_legacy_reschedule();

alter function public.portal_reschedule_slot(uuid,text,int,time,time,text,text) set schema attendance_private;
revoke all on function attendance_private.portal_reschedule_slot(uuid,text,int,time,time,text,text) from public,anon,authenticated;
create function public.portal_reschedule_slot(slot_key uuid,new_day text,new_period int,starts time,ends time,room text,reason_text text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor();
begin
 if actor.role is distinct from 'admin' then raise exception 'Timetable access denied' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 if not exists(select 1 from public.timetable_slots where id=slot_key and institution_id=actor.institution_id and version_id is null and on_date is null)
 then raise exception 'Use a lecture change request' using errcode='42501'; end if;
 return attendance_private.portal_reschedule_slot(slot_key,new_day,new_period,starts,ends,room,reason_text);
end $$;
revoke all on function public.portal_reschedule_slot(uuid,text,int,time,time,text,text) from public,anon;
grant execute on function public.portal_reschedule_slot(uuid,text,int,time,time,text,text) to authenticated;

-- Existing attendance RPCs still own roster validation and submission. Validate the dated slot for every new roll call.
create function attendance_private.guard_scheduled_roll_call() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext(new.institution_id::text));
 if not exists(select 1 from attendance_private.schedule_day(new.institution_id,new.day) where id=new.slot_id)
 then raise exception 'This lecture is no longer scheduled on that date'; end if;
 return new;
end $$;
create trigger check_roll_call_schedule before insert on public.lecture_roll_calls for each row execute function attendance_private.guard_scheduled_roll_call();

alter function public.lecture_draft(uuid,date,text) set schema attendance_private;
revoke all on function attendance_private.lecture_draft(uuid,date,text) from public,anon,authenticated;
create function public.lecture_draft(slot_key uuid, lecture_day date, session_kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor();
begin
 if actor.role is distinct from 'teacher' then raise exception 'Assigned faculty required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 return attendance_private.lecture_draft(slot_key,lecture_day,session_kind);
end $$;
revoke all on function public.lecture_draft(uuid,date,text) from public,anon;
grant execute on function public.lecture_draft(uuid,date,text) to authenticated;

create function public.schedule_attendance(source_slot uuid, source_day date) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor(); sl public.timetable_slots; existing uuid;
begin
 if actor.role is distinct from 'teacher' then raise exception 'Assigned faculty required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext(actor.institution_id::text));
 select * into sl from attendance_private.schedule_day(actor.institution_id,source_day) where id=source_slot;
 if sl.id is null or not attendance_private.own_teacher(sl.teacher_id) then raise exception 'Assigned scheduled lecture required' using errcode='42501'; end if;
 select id into existing from public.lecture_roll_calls where slot_id=source_slot and day=source_day;
 if existing is not null then return existing; end if;
 return public.lecture_draft(source_slot,source_day,case when sl.lecture_kind in ('elective','special') then 'lecture' else sl.lecture_kind end);
end $$;

-- Substitute choices are limited to existing assignments for the same subject and section.
create function public.schedule_substitutes(source_slot uuid) returns table(id uuid,name text)
language sql stable security definer set search_path='' as $$
 select distinct t.id,p.name::text from public.timetable_slots sl join public.teacher_assignments a
 on (a.class_id,a.subject_id,a.academic_year)=(sl.class_id,sl.subject_id,sl.academic_year)
 join public.teachers t on t.id=a.teacher_id join public.user_profiles p on p.id=t.user_id
 where sl.id=source_slot and sl.teacher_id<>t.id and attendance_private.own_teacher(sl.teacher_id) and p.enabled
 and attendance_private.valid_assignment(t.id,sl.class_id,sl.subject_id,sl.academic_year) order by 2
$$;

revoke all on function attendance_private.schedule_current(uuid,date),attendance_private.schedule_day(uuid,date),
 attendance_private.guard_legacy_reschedule(),attendance_private.guard_scheduled_roll_call() from public,anon,authenticated;
do $$ declare rpc regprocedure; begin
 for rpc in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('schedule_agenda','schedule_new','schedule_slot','schedule_publish',
 'schedule_request','schedule_review','schedule_event','schedule_attendance','schedule_substitutes') loop
 execute format('revoke all on function %s from public,anon,authenticated',rpc);
 execute format('grant execute on function %s to authenticated',rpc);
 end loop;
end $$;

create table public.academic_calendar_ranges (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters,
  kind text not null check (kind in ('teaching','theory_exams','practical_exams','next_semester')),
  title text not null check (length(trim(title)) between 1 and 150),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  unique (semester_id, kind)
);
alter table public.academic_calendar_ranges enable row level security;
revoke all on public.academic_calendar_ranges from public,anon,authenticated;

-- Keep the exam windows date-only. The college notice does not specify the time of any exam.
alter function public.schedule_agenda(date,date) set schema attendance_private;
revoke all on function attendance_private.schedule_agenda(date,date) from public,anon,authenticated;

create function public.schedule_agenda(first_day date,last_day date) returns table(
 entry_id uuid, day date, title text, code text, section text, teacher text, place text, starts time, ends time,
 kind text, state text, own boolean, utc_start timestamptz, utc_end timestamptz,
 class_id uuid, subject_id uuid, teacher_id uuid
) language plpgsql stable security definer set search_path='' as $$
declare actor public.user_profiles:=attendance_private.actor();
begin
 if actor.id is null then raise exception 'Sign in to view the schedule' using errcode='42501'; end if;
 if first_day is null or last_day is null or last_day-first_day not between 0 and 62 then raise exception 'Select at most 63 days'; end if;
 return query
 select * from attendance_private.schedule_agenda(first_day,last_day)
 union all
 select r.id, greatest(first_day,r.starts_on)+days.day_offset,
   case when r.starts_on=r.ends_on then r.title else r.title || ' · through ' || to_char(r.ends_on,'DD Mon YYYY') end,
   null,null,null,null,null,null,
   case when r.kind in ('theory_exams','practical_exams') then 'exam_window' else 'term_milestone' end,
   'scheduled',false,null,null,null,null,null
 from public.academic_calendar_ranges r
 join public.semesters sm on sm.id=r.semester_id
 join public.academic_years y on y.id=sm.academic_year_id
 cross join lateral generate_series(0,least(last_day,r.ends_on)-greatest(first_day,r.starts_on)) as days(day_offset)
 where y.institution_id=actor.institution_id and r.kind<>'teaching' and (
   attendance_private.is_admin(y.institution_id) or exists (
     select 1 from public.classes cl where cl.semester_id=sm.id and (
       attendance_private.can_manage_class(cl.id) or attendance_private.can_teach_class(cl.id)
       or (actor.role='student' and exists (
         select 1 from public.enrollments e where e.class_id=cl.id
         and attendance_private.own_student(e.student_id)
         and e.enrolled_from<=r.ends_on and coalesce(e.enrolled_until,'infinity'::date)>=r.starts_on
       ))
     )
   )
 )
 order by 2,8 nulls first,3;
end $$;
revoke all on function public.schedule_agenda(date,date) from public,anon,authenticated;
grant execute on function public.schedule_agenda(date,date) to authenticated;

-- Create the minimum fictional academic data needed by the dashboard.
do $$
declare
  auth_key uuid;
  institution_key uuid;
  department_key uuid;
  programme_key uuid;
  year_key uuid;
  semester_key uuid;
  scheme_key uuid;
  class_key uuid;
  start_year int := extract(year from current_date)::int;
  year_label text := start_year::text || '-' || (start_year + 1)::text;
  enrollment_start date := make_date(start_year, 1, 1);
begin
  select id into auth_key from auth.users
  where lower(email) = 'student@attendance.example' and email_confirmed_at is not null;

  insert into public.institutions(name) values ('Fictional Test Institute') returning id into institution_key;
  insert into public.institution_settings(institution_id,institution_name,short_name,academic_term,current_academic_year)
    values (institution_key,'Fictional Test Institute','Test Institute','Semester 1',year_label);
  insert into public.departments(institution_id,code,name)
    values (institution_key,'CS','Computing') returning id into department_key;
  insert into public.programmes(department_id,code,name,degree_level,duration_years)
    values (department_key,'CS','Computer Science','UG',4) returning id into programme_key;
  insert into public.academic_years(institution_id,label,starts_on,ends_on)
    values (institution_key,year_label,enrollment_start,make_date(start_year + 1,12,31)) returning id into year_key;
  insert into public.semesters(academic_year_id,number)
    values (year_key,1) returning id into semester_key;
  insert into public.vtu_schemes(institution_id,code,name,effective_from_year,total_credits)
    values (institution_key,'TEST','Fictional Curriculum',start_year,160) returning id into scheme_key;
  insert into public.classes(name,department_id,programme_id,vtu_scheme_id,semester_id,semester,academic_year,section)
    values ('Computing 1A',department_key,programme_key,scheme_key,semester_key,1,year_label,'A') returning id into class_key;
  insert into public.subjects(code,name,abbreviation,department_id,programme_id,vtu_scheme_id,semester)
    values ('CS101','Introduction to Computing','Computing',department_key,programme_key,scheme_key,1);

  if auth_key is not null then
    perform public.portal_provision_account(
      auth_key,institution_key,department_key,'student','Fictional Test Student',
      class_key,'TEST-STU-01',start_year,enrollment_start
    );
  else
    raise notice 'Schema installed. Create and confirm student@attendance.example, then run link-test-student.sql.';
  end if;
end;
$$;

commit;
