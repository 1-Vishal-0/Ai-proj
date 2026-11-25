import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import Papa from 'papaparse';

const folder = process.argv[2];
const project = process.env.ATTENDANCE_IMPORT_PROJECT;
const password = process.env.ATTENDANCE_IMPORT_PASSWORD;
const caFile = process.env.ATTENDANCE_IMPORT_CA;
if (!folder || !/^[a-z0-9]{20}$/.test(project ?? '') || !password || !caFile) {
  throw new Error(
    'Provide the import folder, Supabase project reference, database password and CA certificate.',
  );
}

async function csv(name) {
  const parsed = Papa.parse(await readFile(join(folder, name), 'utf8'), {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
  });
  assert.equal(parsed.errors.length, 0, name + ' has invalid CSV');
  return parsed.data;
}

const [students, groups, subjects, slots, calendar] = await Promise.all([
  csv('students-5f.csv'),
  csv('lab-groups-5f.csv'),
  csv('subject-faculty-5f.csv'),
  csv('weekly-timetable-5f.csv'),
  csv('academic-calendar-5f.csv'),
]);
const institution = 'AMC Engineering College, Bangalore';
const term = calendar.find((row) => row.kind === 'teaching');
const next = calendar.find((row) => row.kind === 'next_semester');
const batchByUsn = new Map(
  groups.map((row) => [row.identifier, row.lab_group]),
);
const facultyNames = [...new Set(subjects.map((row) => row.faculty))];
assert.equal(students.length, 51);
assert.equal(batchByUsn.size, 51);
assert.equal(subjects.length, 9);
assert.equal(facultyNames.length, 8);
assert.equal(slots.length, 23);
assert.equal(calendar.length, 4);
assert.ok(term && next);
for (const [index, student] of students.entries()) {
  const number = 263 + index;
  assert.equal(student.identifier, '1AM24CS' + number);
  assert.equal(
    student.email,
    student.identifier.toLowerCase() + '@amceducation.in',
  );
  assert.equal(batchByUsn.get(student.identifier), number <= 288 ? 'F1' : 'F2');
  assert.ok(student.name);
}
for (const slot of slots) {
  assert.ok(
    subjects.some(
      (subject) =>
        subject.subject_code === slot.subject_code &&
        subject.faculty === slot.faculty,
    ),
  );
  assert.ok(['', 'F1', 'F2'].includes(slot.batch));
  assert.ok(slot.start < slot.end && slot.room);
}
const client = new pg.Client({
  host: 'db.' + project + '.supabase.co',
  port: 5432,
  user: 'postgres',
  database: 'postgres',
  password,
  ssl: { ca: await readFile(caFile, 'utf8'), rejectUnauthorized: true },
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
});
function dayAfter(day) {
  const value = new Date(day + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
const endEffective = dayAfter(term.ends_on);
const query = async (sql, args) => (await client.query(sql, args)).rows;
const insertId = async (sql, args) =>
  (await query(sql + ' returning id', args))[0].id;
await client.connect();
try {
  await query('begin');
  await query("set local lock_timeout='5s'");
  await query(
    "select pg_advisory_xact_lock(hashtext('amc-section-5f-import'))",
  );
  if (
    (
      await query(
        'select 1 from public.institutions where lower(name)=lower($1)',
        [institution],
      )
    ).length
  ) {
    throw new Error(
      'The college already exists. Inspect the existing records before changing them.',
    );
  }
  const rangesMigration = await readFile(
    new URL(
      '../supabase/migrations/20261125001000_academic_calendar_ranges.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const [rangeState] = await query(
    "select to_regclass('public.academic_calendar_ranges') is not null as installed",
  );
  if (!rangeState.installed) await query(rangesMigration);
  const institutionId = await insertId(
    'insert into public.institutions(name) values($1)',
    [institution],
  );
  await query(
    `insert into public.institution_settings(institution_id,institution_name,short_name,location,academic_term,current_academic_year,time_zone)
    values($1,$2,'AMC Engineering College','Bangalore','Semester 5',$3,'Asia/Kolkata')`,
    [institutionId, institution, term.academic_year],
  );
  const department = await insertId(
    "insert into public.departments(institution_id,name,code) values($1,'Computer Science and Engineering','CS')",
    [institutionId],
  );
  const programme = await insertId(
    "insert into public.programmes(department_id,name,code,degree_level,duration_years) values($1,'Computer Science and Engineering','CSE','UG',4)",
    [department],
  );
  // Only the dates covered by the supplied college notice are asserted here.
  const year = await insertId(
    'insert into public.academic_years(institution_id,label,starts_on,ends_on) values($1,$2,$3,$4)',
    [institutionId, term.academic_year, term.starts_on, next.ends_on],
  );
  const semester = await insertId(
    'insert into public.semesters(academic_year_id,number) values($1,5)',
    [year],
  );
  const scheme = await insertId(
    `insert into public.vtu_schemes(institution_id,name,code,effective_from_year,total_credits,description)
    values($1,'Section 5-F supplied subject list','5F-2026',2026,0,'Imported timetable. Official scheme and credit totals pending confirmation.')`,
    [institutionId],
  );
  const sectionIds = new Map();
  for (const [key, name, label] of [
    ['', '5-F', 'F'],
    ['F1', '5-F · Lab F1', 'F1'],
    ['F2', '5-F · Lab F2', 'F2'],
  ]) {
    sectionIds.set(
      key,
      await insertId(
        `insert into public.classes(name,department_id,programme_id,vtu_scheme_id,semester_id,semester,academic_year,section,admission_batch)
      values($1,$2,$3,$4,$5,5,$6,$7,'2024')`,
        [
          name,
          department,
          programme,
          scheme,
          semester,
          term.academic_year,
          label,
        ],
      ),
    );
  }
  for (const range of calendar) {
    await query(
      'insert into public.academic_calendar_ranges(semester_id,kind,title,starts_on,ends_on) values($1,$2,$3,$4,$5)',
      [semester, range.kind, range.title, range.starts_on, range.ends_on],
    );
  }
  const roster = students.map((student) => ({
    ...student,
    lab_section: sectionIds.get(batchByUsn.get(student.identifier)),
  }));
  await query(
    `with profiles as (
    insert into public.user_profiles(name,email,role,institution_id,department_id)
    select r.name,r.email,'student',$1,$2 from jsonb_to_recordset($4) r(name text,email text)
    returning id,email
  ), learners as (
    insert into public.students(user_id,roll_number,usn,class_id,department_id,admission_year,admission_batch)
    select p.id,r.identifier,r.identifier,$3,$2,2024,'2024'
    from profiles p join jsonb_to_recordset($4) r(email text,identifier text) on r.email=p.email
    returning id,usn
  )
  insert into public.enrollments(student_id,class_id,enrolled_from)
  select l.id,section.id,$5 from learners l
  join jsonb_to_recordset($4) r(identifier text,lab_section uuid) on r.identifier=l.usn
  cross join lateral (values ($3::uuid),(r.lab_section)) section(id)`,
    [
      institutionId,
      department,
      sectionIds.get(''),
      JSON.stringify(roster),
      term.starts_on,
    ],
  );

  const teacherIds = new Map();
  for (const [index, name] of facultyNames.entries()) {
    const placeholder = 'amc-5f-faculty-' + String(index + 1).padStart(2, '0');
    const profile = await insertId(
      `insert into public.user_profiles(name,email,role,institution_id,department_id)
      values($1,$2,'teacher',$3,$4)`,
      [name, placeholder + '@example.invalid', institutionId, department],
    );
    teacherIds.set(
      name,
      await insertId(
        'insert into public.teachers(user_id,employee_id,department_id,designation) values($1,$2,$3,$4)',
        [
          profile,
          placeholder.toUpperCase(),
          department,
          name === 'Prof. Suchitra S' ? 'Section 5-F class teacher' : 'Faculty',
        ],
      ),
    );
  }
  const subjectIds = new Map();
  for (const subject of subjects) {
    const code = subject.subject_code;
    const kind =
      code === 'BCSL504'
        ? 'practical'
        : code === 'BCS502'
          ? 'integrated'
          : 'theory';
    const category =
      { BCSL504: 'PCCL', BCS515B: 'PEC', BCS586: 'PROJ', BXXK559: 'MC' }[
        code
      ] || 'PCC';
    const subjectId = await insertId(
      `insert into public.subjects(code,name,abbreviation,department_id,programme_id,vtu_scheme_id,semester,credits,category,course_type)
      values($1::text,$2,$1::text,$3,$4,$5,5,0,$6,$7)`,
      [code, subject.subject, department, programme, scheme, category, kind],
    );
    subjectIds.set(code, subjectId);
    // Include subjects listed on the notice even when it does not give them a weekly period.
    const assigned = new Set(
      slots
        .filter((slot) => slot.subject_code === code)
        .map((slot) => slot.batch),
    );
    if (!assigned.size) assigned.add('');
    for (const batch of assigned) {
      await query(
        'insert into public.teacher_assignments(teacher_id,subject_id,class_id,academic_year) values($1,$2,$3,$4)',
        [
          teacherIds.get(subject.faculty),
          subjectId,
          sectionIds.get(batch),
          term.academic_year,
        ],
      );
    }
  }
  const version = await insertId(
    `insert into public.schedule_versions(institution_id,name,effective,published_at)
    values($1,'Section 5-F · Semester 5', $2,now())`,
    [institutionId, term.starts_on],
  );
  await query(
    `insert into public.schedule_versions(institution_id,name,effective,published_at)
    values($1,'Section 5-F · Teaching ended',$2,now())`,
    [institutionId, endEffective],
  );
  for (const slot of slots) {
    const type = slot.batch
      ? 'lab'
      : slot.subject_code === 'BCS515B'
        ? 'elective'
        : slot.subject_code === 'BCS586'
          ? 'special'
          : 'lecture';
    const periods = [
      '09:15',
      '10:10',
      '11:20',
      '12:15',
      '14:00',
      '14:55',
      '15:50',
    ];
    await query(
      `insert into public.timetable_slots(institution_id,teacher_id,subject_id,class_id,academic_year,classroom,
       day_of_week,period_number,start_time,end_time,version_id,lecture_kind) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        institutionId,
        teacherIds.get(slot.faculty),
        subjectIds.get(slot.subject_code),
        sectionIds.get(slot.batch),
        term.academic_year,
        slot.room,
        slot.day,
        periods.indexOf(slot.start) + 1,
        slot.start,
        slot.end,
        version,
        type,
      ],
    );
  }

  const [verified] = await query(
    `select
    (select count(*)::int from public.user_profiles where institution_id=$1 and role='student' and auth_id is null) students,
    (select count(*)::int from public.user_profiles where institution_id=$1 and role='teacher' and auth_id is null) faculty,
    (select count(*)::int from public.subjects where department_id=$2) subjects,
    (select count(*)::int from public.enrollments where class_id=$3) f1,
    (select count(*)::int from public.enrollments where class_id=$4) f2,
    (select count(*)::int from public.timetable_slots where version_id=$5) weekly_slots,
    (select count(*)::int from attendance_private.schedule_day($1,$6::date) where lecture_kind='lab') first_day_labs,
    (select count(*)::int from attendance_private.schedule_day($1,$7::date)) after_teaching,
    (select count(*)::int from public.academic_calendar_ranges where semester_id=$8) calendar_ranges`,
    [
      institutionId,
      department,
      sectionIds.get('F1'),
      sectionIds.get('F2'),
      version,
      term.starts_on,
      endEffective,
      semester,
    ],
  );
  assert.deepEqual(verified, {
    students: 51,
    faculty: 8,
    subjects: 9,
    f1: 26,
    f2: 25,
    weekly_slots: 23,
    first_day_labs: 2,
    after_teaching: 0,
    calendar_ranges: 4,
  });
  await query(
    `insert into public.audit_logs(institution_id,user_name,action,entity,entity_id,details)
    values($1,'Provisioning operator','IMPORT_ACADEMIC_SECTION','Class',$2,'Imported AMC Section 5-F roster, assignments, lab groups and calendar')`,
    [institutionId, sectionIds.get('')],
  );
  await query("notify pgrst,'reload schema'");
  await query('commit');
  console.log('Committed and verified AMC Section 5-F', verified);
} catch (error) {
  await query('rollback');
  throw error;
} finally {
  await client.end();
}
