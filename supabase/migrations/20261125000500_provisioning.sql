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
