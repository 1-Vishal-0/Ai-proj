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
