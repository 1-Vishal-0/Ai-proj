-- Run against a disposable Supabase database after applying migrations. All fixture data is rolled back.
begin;
create schema attendance_test;
grant usage on schema attendance_test to authenticated, anon;
create function attendance_test.assert(ok boolean, detail text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Assertion failed: %',detail; end if;
end
$$;
create function attendance_test.denied(sql text, expected text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'Expected SQLSTATE % for %',expected,sql;
exception when others then
  if sqlstate <> expected then raise; end if;
end
$$;
create function attendance_test.id(i int) returns uuid language sql immutable as $$
  select ('f1170000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid
$$;
set local search_path = attendance_test, public, extensions;
insert into auth.users(id,email)
select attendance_test.id(i),format('portal-fixture-%s@attendance.example',i) from generate_series(100,109) g(i);
insert into institutions(id,name) values (id(1),'Fictional North Institute'),(id(2),'Fictional South Institute');
insert into institution_settings(institution_id,institution_name) values (id(1),'Fictional North Institute'),(id(2),'Fictional South Institute');
insert into departments(id,institution_id,name,code) values
  (id(11),id(1),'Computing','CS'),(id(12),id(1),'Engineering','EE'),(id(13),id(2),'Computing','CS');
insert into academic_years(id,institution_id,label,starts_on,ends_on) values
  (id(21),id(1),'2020-2021','2020-01-01','2021-12-31'),(id(22),id(2),'2020-2021','2020-01-01','2021-12-31');
insert into semesters(id,academic_year_id,number) values (id(31),id(21),1),(id(32),id(22),1);
insert into programmes(id,department_id,name,code,degree_level,duration_years) values
  (id(41),id(11),'CS UG','CS','UG',4),(id(42),id(12),'EE UG','EE','UG',4),(id(43),id(13),'CS UG','CS','UG',4);
insert into vtu_schemes(id,institution_id,name,code,effective_from_year,total_credits) values
  (id(51),id(1),'Scheme','2020',2020,100),(id(52),id(2),'Scheme','2020',2020,100);
insert into classes(id,department_id,name,programme_id,vtu_scheme_id,semester_id,semester,academic_year,section) values
  (id(61),id(11),'CS 1A',id(41),id(51),id(31),1,'2020-2021','A'),
  (id(62),id(12),'EE 1A',id(42),id(51),id(31),1,'2020-2021','A'),
  (id(63),id(13),'CS 1A',id(43),id(52),id(32),1,'2020-2021','A');
insert into subjects(id,department_id,code,name,programme_id,vtu_scheme_id,semester) values
  (id(71),id(11),'CS101','Computing 101',id(41),id(51),1),
  (id(72),id(12),'EE101','Engineering 101',id(42),id(51),1),
  (id(73),id(11),'CS102','Computing 102',id(41),id(51),1),
  (id(74),id(13),'CS101','Computing 101',id(43),id(52),1);
select portal_provision_account(id(100),id(1),null,'admin','North Administrator');
select portal_provision_account(id(101),id(1),id(11),'hod','Computing HOD');
select portal_provision_account(id(102),id(1),id(11),'teacher','Computing Faculty',identifier=>'FAC-CS');
select portal_provision_account(id(103),id(1),id(11),'student','Student One',id(61),'CS-01',2020,'2020-01-01');
select portal_provision_account(id(104),id(1),id(11),'student','Student Two',id(61),'CS-02',2020,'2020-01-01');
select portal_provision_account(id(105),id(1),id(12),'student','Student Three',id(62),'EE-01',2020,'2020-01-01');
select portal_provision_account(id(106),id(2),null,'admin','South Administrator');
select portal_provision_account(id(107),id(1),id(12),'teacher','Engineering Faculty',identifier=>'FAC-EE');
select portal_provision_account(id(108),id(2),id(13),'student','South Student',id(63),'CS-01',2020,'2020-01-01');
-- Fixed fixture keys make it possible to guess identifiers from the other roles in assertions.
update teachers set id = attendance_test.id(81) where employee_id = 'FAC-CS';
update teachers set id = attendance_test.id(82) where employee_id = 'FAC-EE';
insert into teacher_assignments(teacher_id,class_id,subject_id,academic_year) values
  (id(81),id(61),id(71),'2020-2021'),(id(82),id(62),id(72),'2020-2021');
insert into timetable_slots(id,institution_id,teacher_id,subject_id,class_id,academic_year,classroom,day_of_week,period_number,start_time,end_time)
values (id(91),id(1),id(81),id(71),id(61),'2020-2021','Room A','Monday',1,'09:00','10:00');

set local role anon;
select denied('select id from departments','42501');
select denied('select portal_profile_id()','42501');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub',attendance_test.id(109)::text,true);
select assert(portal_profile_id() is null,'Unprovisioned Auth identity has no role');
select assert((select count(*) = 0 from departments),'Unprovisioned identity has no tenant data');
select set_config('request.jwt.claim.sub',attendance_test.id(102)::text,true);
select assert((select count(*) = 1 from teacher_assignments),'Faculty sees only their assignment');
select assert((select count(*) = 2 from students),'Faculty sees only their class roster');
select denied($q$select portal_provision_account(id(104),id(1),null,'admin','Escalation')$q$,'42501');
select denied($q$update user_profiles set role = 'admin' where id = portal_profile_id()$q$,'42501');
select denied($q$select portal_save_attendance(null,id(62),id(72),id(82),'2020-10-20','09:00','10:00','lecture','[]')$q$,'42501');
select denied($q$select portal_save_attendance(null,id(61),id(73),id(81),'2020-10-20','09:00','10:00','lecture','[]')$q$,'42501');
select denied($q$select portal_save_attendance(null,id(61),id(71),id(81),'2020-10-20','09:00','10:00','lecture','[]')$q$,'22023');
select assert((select count(*) = 0 from attendance_sessions),'Failed roster rolled back its session');
select denied($q$select portal_save_attendance(null,id(61),id(71),id(81),'2020-10-20','09:00','10:00','lecture',
  (select jsonb_agg(jsonb_build_object('student_id',s.id,'status','absent')) from students s cross join generate_series(1,2) where s.roll_number = 'CS-01'))$q$,'22023');
select assert((select count(*) = 0 from attendance_records),'Duplicate roster rolled back all records');
select portal_save_attendance(null,id(61),id(71),id(81),'2020-10-20','09:00','10:00','lecture',
  (select jsonb_agg(jsonb_build_object('student_id',s.id,'status','absent')) from students s));
select denied($q$select portal_save_attendance(null,id(61),id(71),id(81),'2020-10-20','09:00','10:00','lecture',
  (select jsonb_agg(jsonb_build_object('student_id',s.id,'status','present')) from students s))$q$,'23505');
select assert((select count(*) = 2 and bool_and(status = 'absent') from attendance_records),'Duplicate session preserved original records');
select set_config('attendance_test.session', (select id::text from attendance_sessions),true);

select set_config('request.jwt.claim.sub',attendance_test.id(103)::text,true);
select assert((select count(*) = 1 from students),'Student sees only their student row');
select assert((select count(id) = 1 from user_profiles),'Student sees only their user profile');
select assert((select count(*) = 1 from attendance_records),'Student sees only their attendance');
select assert((select count(*) = 0 from teachers),'Student cannot read faculty directory');
select assert((select teacher_name = 'Computing Faculty' from portal_timetable),'Student timetable includes instructor display name');
select denied('select code from attendance_sessions','42501');
select denied($q$update attendance_records set status = 'present'$q$,'42501');
select denied($q$select portal_correct_attendance(current_setting('attendance_test.session')::uuid,(select id from students),'present','Spoof')$q$,'42501');
select portal_request_correction(current_setting('attendance_test.session')::uuid,'present','Fictional reason');
select denied($q$select portal_request_correction(current_setting('attendance_test.session')::uuid,'leave','Another request')$q$,'23505');
select set_config('attendance_test.request',(select id::text from correction_requests),true);

select set_config('request.jwt.claim.sub',attendance_test.id(104)::text,true);
select assert((select count(*) = 0 from correction_requests),'Another student cannot see the request');
select assert((select count(*) = 1 from attendance_records),'Each student sees one record');
select denied($q$select portal_review_correction(current_setting('attendance_test.request')::uuid,'approved','No')$q$,'42501');

select set_config('request.jwt.claim.sub',attendance_test.id(107)::text,true);
select assert((select count(*) = 0 from attendance_sessions),'Unrelated faculty has no access');
select denied($q$select portal_review_correction(current_setting('attendance_test.request')::uuid,'approved','No')$q$,'42501');
select denied($q$select portal_reschedule_slot(id(91),'Tuesday',1,'09:00','10:00','Room B','Unrelated')$q$,'42501');

select set_config('request.jwt.claim.sub',attendance_test.id(101)::text,true);
select assert((select count(*) = 1 from departments),'HOD sees their department');
select assert((select count(*) = 1 from classes),'HOD sees their own classes');
select assert((select count(*) = 2 from attendance_records),'HOD sees department records');
select denied($q$insert into subjects(department_id,code,name,vtu_scheme_id) values(id(12),'EE203','Forbidden',id(51))$q$,'42501');
select denied($q$select portal_update_settings('{"threshold_percentage":40}')$q$,'42501');
select portal_review_correction(current_setting('attendance_test.request')::uuid,'approved','Verified');
select denied($q$select portal_review_correction(current_setting('attendance_test.request')::uuid,'rejected','Already decided')$q$,'22023');

select set_config('request.jwt.claim.sub',attendance_test.id(103)::text,true);
select assert((select status = 'present' from attendance_records),'Approved correction updated attendance');
select assert((select count(*) = 1 from notifications),'Approval created a notification');
select portal_read_notifications();
select assert((select is_read from notifications),'Student can mark their own notification read');

select set_config('request.jwt.claim.sub',attendance_test.id(100)::text,true);
select assert((select count(*) = 2 from departments),'Administrator sees their two departments');
select assert((select count(*) = 3 from students),'Administrator sees institution students only');
select denied($q$insert into departments(institution_id,name,code) values(id(2),'Foreign','NO')$q$,'42501');
select assert((select count(*) >= 3 from audit_logs where action in ('SAVE_ATTENDANCE','REQUEST_CORRECTION','APPROVED_CORRECTION')),'Server writes audit events');
select set_config('request.jwt.claim.sub',attendance_test.id(106)::text,true);
select assert((select count(*) = 1 from departments),'Other administrator has a separate scope');
select assert((select count(*) = 0 from attendance_records),'Other institution cannot see attendance');
select assert((select count(*) = 0 from audit_logs where action = 'SAVE_ATTENDANCE'),'Other institution cannot see audit history');
reset role;
update public.user_profiles set enabled = false where auth_id = attendance_test.id(102);
set local role authenticated;
select set_config('request.jwt.claim.sub',attendance_test.id(102)::text,true);
select assert(portal_profile_id() is null,'Disabled account loses access with the same Auth UID');
select assert((select count(*) = 0 from attendance_records),'Disabled account cannot read attendance');
select set_config('request.jwt.claim.sub',attendance_test.id(103)::text,true);
select denied($q$select workspace_preferences('X',true,false)$q$,'42501');
select denied($q$select workspace_account_status(portal_profile_id(),'active')$q$,'42501');
select denied($q$select workspace_link_identity(id(1),portal_profile_id(),id(103))$q$,'42501');
select set_config('request.jwt.claim.sub',attendance_test.id(101)::text,true);
select denied($q$select workspace_import_people('teacher',id(11),null,null,'[]')$q$,'42501');
select set_config('request.jwt.claim.sub',attendance_test.id(100)::text,true);
select workspace_preferences('North',true,false);
select portal_reschedule_slot(id(91),'Tuesday',1,'09:00','10:00','Room B','Check disabled notices');
select assert((select count(*)=0 from notifications where link='/student/timetable'),'Timetable preference suppresses notices');
select workspace_preferences('North',true,true);
select portal_reschedule_slot(id(91),'Monday',1,'09:00','10:00','Room A','Check enabled notices');
select set_config('request.jwt.claim.sub',attendance_test.id(103)::text,true);
select assert((select count(*)=1 from notifications where link='/student/timetable'),'Re-enabled notices reach students');
select set_config('request.jwt.claim.sub',attendance_test.id(100)::text,true);
insert into academic_holidays(institution_id,day,name) values(id(1),'2020-11-01','Founders Day');
select denied($q$insert into academic_holidays(institution_id,day,name) values(id(2),'2020-12-01','Foreign')$q$,'42501');
select denied($q$insert into academic_holidays(institution_id,day,name) values(id(1),'2020-11-01','Duplicate')$q$,'23505');
insert into classes(id,department_id,name,programme_id,vtu_scheme_id,semester_id,semester,academic_year,section)
 values(id(64),id(11),'CS 1B',id(41),id(51),id(31),1,'2020-2021','B');
select set_config('request.jwt.claim.sub',attendance_test.id(101)::text,true);
select denied($q$select workspace_import_people('teacher',id(12),null,null,'[]')$q$,'42501');
select assert(workspace_import_people('student',id(11),id(61),'2020-09-01',
 '[{"name":"New Student","email":"Portal-Fixture-109@attendance.example","identifier":"cs-99"}]')=1,'Authorized department batch');
select denied($q$select workspace_import_people('student',id(11),id(61),'2020-09-01',
 '[{"name":"First","email":"first@attendance.example","identifier":"TEMP"},{"name":"Second","email":"second@attendance.example","identifier":"CS-99"}]')$q$,'23505');
select assert((select count(*)=0 from user_profiles where email='first@attendance.example'),'Batch rolled back');
select workspace_allocate((select id from students where usn='CS-99'),id(64),'2020-10-01');
select assert((select enrolled_until='2020-09-30' from enrollments where class_id=id(61) and student_id=(select id from students where usn='CS-99')),'Historical enrollment dates retained');
select denied($q$select workspace_allocate((select id from students where usn='CS-99'),id(62),'2020-10-02')$q$,'42501');
select denied($q$select workspace_allocate((select id from students where usn='CS-01'),id(64),'2020-10-19')$q$,'P0001');
select set_config('attendance_test.profile',(select user_id::text from students where usn='CS-99'),true);
reset role;
select workspace_link_identity(id(1),current_setting('attendance_test.profile')::uuid,id(109));
set local role authenticated;
select set_config('request.jwt.claim.sub',attendance_test.id(109)::text,true);
select assert(portal_profile_id()=current_setting('attendance_test.profile')::uuid,'Imported student can sign in after trusted linking');
select set_config('request.jwt.claim.sub',attendance_test.id(106)::text,true);
select assert((select count(*)=0 from academic_holidays),'Foreign calendar is hidden');
select denied($q$select workspace_account_status(current_setting('attendance_test.profile')::uuid,'archived')$q$,'42501');
select set_config('request.jwt.claim.sub',attendance_test.id(100)::text,true);
select workspace_account_status(current_setting('attendance_test.profile')::uuid,'archived');
select assert((select archived_at is not null and not enabled from user_profiles where id=current_setting('attendance_test.profile')::uuid),'Archived profile retained');
select set_config('request.jwt.claim.sub',attendance_test.id(109)::text,true);
select assert(portal_profile_id() is null,'Archived user immediately loses access');
select set_config('request.jwt.claim.sub',attendance_test.id(100)::text,true);
select workspace_account_status(current_setting('attendance_test.profile')::uuid,'active');
select assert((select count(*)=2 from audit_logs where entity_id=current_setting('attendance_test.profile') and action='ACCOUNT_STATUS' and user_role='admin'),'Lifecycle changes attributed to admin');
reset role;
rollback;
