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

