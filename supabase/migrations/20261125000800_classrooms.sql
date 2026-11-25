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
