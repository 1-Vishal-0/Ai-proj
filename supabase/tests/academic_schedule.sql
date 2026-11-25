reset role;
select set_config('attendance_test.effective', ((current_setting('attendance_test.today')::date+1)+(8-extract(isodow from current_setting('attendance_test.today')::date+1)::int)%7)::text,true);
update public.academic_years set ends_on=greatest(ends_on,current_date+60) where id=id(21);
select set_config('attendance_test.official', (select final_id::text from public.lecture_roll_calls where id=current_setting('attendance_test.call')::uuid),true);
set local role authenticated;
select set_config('request.jwt.claim.sub',id(100)::text,true);
select set_config('attendance_test.version',schedule_new('Winter timetable')::text,true);
select set_config('attendance_test.assignment',(select id::text from teacher_assignments where teacher_id=id(81) and subject_id=id(71)),true);
-- A new Monday slot leaves the original fixture lecture and attendance untouched.
select schedule_slot(current_setting('attendance_test.version')::uuid,null,current_setting('attendance_test.assignment')::uuid,'Monday','Scheduling Lab','14:00','15:30','lab');
select set_config('attendance_test.scheduled',(select id::text from timetable_slots where version_id=current_setting('attendance_test.version')::uuid and classroom='Scheduling Lab'),true);
select denied($q$select schedule_slot(current_setting('attendance_test.version')::uuid,null,current_setting('attendance_test.assignment')::uuid,'Monday','Another room','15:00','16:00','lab')$q$,'P0001');
select schedule_slot(current_setting('attendance_test.version')::uuid,null,current_setting('attendance_test.assignment')::uuid,'Tuesday','Scheduling Lab','14:00','15:30','elective');
select set_config('request.jwt.claim.sub',id(103)::text,true);
select assert((select count(*)=0 from timetable_slots where id=current_setting('attendance_test.scheduled')::uuid),'Draft slots cannot be read by students');
select denied($q$select schedule_new('Unauthorized')$q$,'42501');
select set_config('request.jwt.claim.sub',id(100)::text,true);
select schedule_publish(current_setting('attendance_test.version')::uuid,current_setting('attendance_test.effective')::date);
select denied($q$select schedule_slot(current_setting('attendance_test.version')::uuid,null,current_setting('attendance_test.assignment')::uuid,'Monday','Room X','18:00','19:00','lecture')$q$,'42501');
select set_config('request.jwt.claim.sub',id(103)::text,true);
select assert((select count(*)=1 from schedule_agenda(current_setting('attendance_test.effective')::date,current_setting('attendance_test.effective')::date)
 where entry_id=current_setting('attendance_test.scheduled')::uuid and kind='lab' and utc_start is not null),'Student sees published laboratory schedule');
select assert((select count(*)=1 from notifications where title='Timetable published'),'Student received version notification');
select set_config('request.jwt.claim.sub',id(105)::text,true);
select assert((select count(*)=0 from schedule_agenda(current_setting('attendance_test.effective')::date,current_setting('attendance_test.effective')::date) where code='CS101'),'Other section cannot see this lecture');
select set_config('request.jwt.claim.sub',id(107)::text,true);
select denied($q$select schedule_request(current_setting('attendance_test.scheduled')::uuid,current_setting('attendance_test.effective')::date,'cancel','Unauthorized')$q$,'42501');
select set_config('request.jwt.claim.sub',id(102)::text,true);
select schedule_request(current_setting('attendance_test.scheduled')::uuid,current_setting('attendance_test.effective')::date,'move','Classroom unavailable',
 current_setting('attendance_test.effective')::date+1,'14:30','15:00','Room X');
select set_config('attendance_test.request',(select id::text from schedule_requests where status='pending'),true);
select set_config('request.jwt.claim.sub',id(100)::text,true);
select denied($q$select schedule_review(current_setting('attendance_test.request')::uuid,true)$q$,'P0001');
select schedule_review(current_setting('attendance_test.request')::uuid,false);
select set_config('request.jwt.claim.sub',id(102)::text,true);
select schedule_request(current_setting('attendance_test.scheduled')::uuid,current_setting('attendance_test.effective')::date,'move','Alternate time',
 current_setting('attendance_test.effective')::date+1,'16:00','17:00','Room X');
select set_config('attendance_test.request',(select id::text from schedule_requests where status='pending'),true);
select set_config('request.jwt.claim.sub',id(100)::text,true);
select schedule_review(current_setting('attendance_test.request')::uuid,true);
select assert((select count(*)=1 from schedule_agenda(current_setting('attendance_test.effective')::date,current_setting('attendance_test.effective')::date+1) where state='rescheduled'),'Replacement lecture appears');
select assert((select count(*)=1 from schedule_agenda(current_setting('attendance_test.effective')::date,current_setting('attendance_test.effective')::date) where state='moved'),'Original occurrence has a moved state');
select schedule_event(null,current_setting('attendance_test.effective')::date+7,'University holiday','holiday');
select assert((select count(*)=0 from schedule_agenda(current_setting('attendance_test.effective')::date+7,current_setting('attendance_test.effective')::date+7) where code='CS101'),'Holiday suppresses recurring classes');
select assert((select count(*)=2 from attendance_records where session_id=current_setting('attendance_test.official')::uuid),'Existing attendance survived scheduling changes');
reset role;
insert into public.teacher_assignments(teacher_id,class_id,subject_id,academic_year) values(id(82),id(61),id(71),'2020-2021');
set local role authenticated;
select set_config('request.jwt.claim.sub',id(102)::text,true);
select assert((select count(*)=1 from schedule_substitutes(current_setting('attendance_test.scheduled')::uuid) c where c.id=attendance_test.id(82)),'Substitute list uses valid teaching assignments');
select schedule_request(current_setting('attendance_test.scheduled')::uuid,current_setting('attendance_test.effective')::date+14,'substitute','Conference',substitute_id=>id(82));
select schedule_request(current_setting('attendance_test.scheduled')::uuid,current_setting('attendance_test.effective')::date+21,'cancel','Section excursion');
select set_config('request.jwt.claim.sub',id(100)::text,true);
select schedule_review(id,true) from schedule_requests where status='pending';
select assert((select count(*)=1 from schedule_agenda(current_setting('attendance_test.effective')::date+21,current_setting('attendance_test.effective')::date+21) where state='cancelled'),'Cancellation persists on the original date');
select schedule_event(null,current_setting('attendance_test.effective')::date+3,'Computing exam','exam','08:00','09:30','Main hall');
select schedule_event(entry_id,day,'Revised computing exam','exam','09:00','10:30','Main hall')
 from schedule_agenda(current_setting('attendance_test.effective')::date+3,current_setting('attendance_test.effective')::date+3) where kind='exam';
select assert((select count(*)=1 from schedule_agenda(current_setting('attendance_test.effective')::date+3,current_setting('attendance_test.effective')::date+3)
  where kind='exam' and starts='09:00' and title='Revised computing exam'),'Calendar events can be edited');
select set_config('request.jwt.claim.sub',id(107)::text,true);
select assert((select count(*)=1 from schedule_agenda(current_setting('attendance_test.effective')::date+14,current_setting('attendance_test.effective')::date+14) where state='substituted' and own),'Substitute sees their replacement lecture');
