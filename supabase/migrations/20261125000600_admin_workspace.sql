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
