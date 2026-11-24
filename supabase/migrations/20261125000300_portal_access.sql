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

