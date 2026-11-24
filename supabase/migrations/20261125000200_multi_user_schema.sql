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
