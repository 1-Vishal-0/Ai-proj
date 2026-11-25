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
