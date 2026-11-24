-- Run after fresh-project-setup.sql and after confirming the test account in Authentication > Users.
do $$
declare
  auth_key uuid;
  profile_key uuid;
  institution_key uuid;
  department_key uuid;
  class_key uuid;
  enrollment_start date;
begin
  select id into auth_key from auth.users
  where lower(email) = 'student@attendance.example' and email_confirmed_at is not null;
  if auth_key is null then
    raise exception 'Authentication > Users must contain the confirmed account student@attendance.example in this project.';
  end if;

  select i.id, d.id, c.id, ay.starts_on
  into strict institution_key, department_key, class_key, enrollment_start
  from public.institutions i
  join public.departments d on d.institution_id = i.id
  join public.classes c on c.department_id = d.id
  join public.semesters sm on sm.id = c.semester_id
  join public.academic_years ay on ay.id = sm.academic_year_id
  where i.name = 'Fictional Test Institute' and d.code = 'CS' and c.name = 'Computing 1A';

  if exists (select 1 from public.user_profiles where auth_id = auth_key) then
    if exists (select 1 from public.user_profiles p join public.students s on s.user_id = p.id
      where p.auth_id = auth_key and p.enabled and p.role = 'student' and p.institution_id = institution_key
        and p.department_id = department_key and s.class_id = class_key) then
      return;
    end if;
    raise exception 'This Auth account already has a different portal profile.';
  end if;

  -- Reattach the same fictional student if its previous Auth account was deleted.
  update public.user_profiles p
  set auth_id = auth_key
  where p.auth_id is null and p.enabled and p.role = 'student'
    and lower(trim(p.email)) = 'student@attendance.example'
    and p.institution_id = institution_key and p.department_id = department_key
    and exists (
      select 1 from public.students s
      join public.enrollments e on e.student_id = s.id and e.class_id = s.class_id
      where s.user_id = p.id and s.department_id = department_key and s.class_id = class_key
    )
  returning p.id into profile_key;
  if profile_key is not null then
    insert into public.audit_logs(user_name,action,entity,entity_id,details,institution_id,department_id)
    values ('Provisioning operator','LINK_TEST_ACCOUNT','UserProfile',profile_key::text,
      'Linked existing fictional student to a confirmed Auth account',institution_key,department_key);
    return;
  end if;

  perform public.portal_provision_account(
    auth_key,institution_key,department_key,'student','Fictional Test Student',
    class_key,'TEST-STU-01',extract(year from enrollment_start)::int,enrollment_start
  );
end;
$$;
