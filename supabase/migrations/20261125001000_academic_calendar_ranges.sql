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
