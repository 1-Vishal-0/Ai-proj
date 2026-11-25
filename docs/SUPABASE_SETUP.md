# Supabase setup and database operations

## Fresh test project in the SQL Editor

1. In the new project's **Authentication → Users**, use **Add user → Create new user**. Set the email to `student@attendance.example`, choose a private password, and enable **Auto Confirm User** for this fictional account.
2. In **SQL Editor → New query**, paste the full contents of [fresh-project-setup.sql](../supabase/fresh-project-setup.sql) and run it once. It installs the ten portal migrations and links the existing Auth identity to a fictional student. Keep the Auth account password in the dashboard workflow.
3. Set the app's Project URL and publishable key and sign in with the fictional email and the password you chose.

The SQL Editor applies the schema directly. Before using `supabase db push` on this project later, compare its migration history to the database and mark the ten applied versions if their changes are present. [Supabase migration history](https://supabase.com/docs/guides/deployment/database-migrations)

## Configure Auth and the frontend

1. Create a separate Supabase staging project and keep test accounts and data there.
2. In Supabase Auth, enable the email provider, disable public sign-ups and anonymous sign-ins, and configure your SMTP provider. Set a minimum password length of at least 12 and configure email confirmation. Set the Site URL to the HTTPS origin of the portal and allow the exact `/auth/reset` redirect at that origin. For local testing, use the configured Vite origin. Configure your web host to serve `index.html` for app routes. [Auth configuration](https://supabase.com/docs/guides/auth/general-configuration) · [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
3. In **Authentication → Email Templates**, set the invite and recovery links below. Keep the Site URL on the correct project origin and disable link rewriting in SMTP. Auth verifies the one-time link before the password form can update the account. [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Older projects can supply their legacy anon key through `VITE_SUPABASE_ANON_KEY`. Keep server credentials in operator tooling. Run `npm ci` and `npm run dev` or build the frontend with `npm run build`.

Invite template

```html
<p><a href="{{ .SiteURL }}/auth/reset?token_hash={{ .TokenHash }}&amp;type=invite">Accept your portal invitation</a></p>
```

Recovery template

```html
<p><a href="{{ .SiteURL }}/auth/reset?token_hash={{ .TokenHash }}&amp;type=recovery">Reset your portal password</a></p>
```

## Apply migrations

`supabase/migrations` is the deployment source of truth. `supabase/schema.sql` is the original schema retained as a reference for existing installations.

1. Back up the target and test restoring the backup to a staging database. Check for installations that changed the original table constraints, grants or policies. The migration closes the legacy API surface and refuses to layer new policies over pre-existing policies on managed tables. Reconcile any custom RLS in staging before applying to production.
2. Apply the migrations in timestamp order from the repository root. A fresh Supabase project and a project that ran the original baseline SQL both use the same history. If the project already has a Supabase migration history, reconcile the remote history with its source repository before pushing. Review the pending migrations before pushing. [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations)

   ```powershell
   supabase init
   supabase link --project-ref <staging-project-ref>
   supabase db push --dry-run
   supabase db push
   ```

   Run `supabase init` only if you need local CLI config. Keep Supabase default roles and Auth tables available. Use staging verification below before repeating the deployment on the approved production target. If needed, recover from the backup or roll forward with a reviewed migration.

3. Initialize the institution, settings and academic catalog as a database operator. The abbreviated fixture below creates a working catalog for a new staging tenant. Choose actual term dates and institutional time zone for deployment.

```sql
with institution as (
  insert into public.institutions(name) values ('Fictional North Institute') returning id
), settings as (
  insert into public.institution_settings(institution_id,institution_name,current_academic_year,time_zone)
  select id,'Fictional North Institute','2026-2027','Asia/Kolkata' from institution
), department as (
  insert into public.departments(institution_id,code,name)
  select id,'CS','Computing' from institution returning id,institution_id
), programme as (
  insert into public.programmes(department_id,code,name,degree_level,duration_years)
  select id,'CS','Computing','UG',4 from department returning id,department_id
), academic_year as (
  insert into public.academic_years(institution_id,label,starts_on,ends_on)
  select id,'2026-2027','2026-08-01','2027-07-31' from institution returning id
), term as (
  insert into public.semesters(academic_year_id,number)
  select id,1 from academic_year returning id
), scheme as (
  insert into public.vtu_schemes(institution_id,code,name,effective_from_year,total_credits)
  select id,'2026','2026 Curriculum',2026,160 from institution returning id
), section as (
  insert into public.classes(name,department_id,programme_id,vtu_scheme_id,semester_id,semester,academic_year,section,admission_batch)
  select 'Computing 1A',department_id,programme.id,scheme.id,term.id,1,'2026-2027','A','2026-2030'
  from programme cross join scheme cross join term returning id,department_id
)
select institution.id as institution_id,section.department_id,section.id as class_id
from institution cross join section;
```

## Provision authorized accounts

A trusted Supabase operator verifies the person's email, role and academic scope, then invites them through **Authentication → Users → Invite user**. After invitation, copy the Auth UUID and link the account through the SQL editor in the correct project. The operator account performs this step for students, faculty, HODs and institutional administrators. `portal_provision_account` validates the link, creates the associated student/faculty row and initial student enrollment as applicable, and writes a provisioning audit entry. A user whose Auth account has no authorized profile cannot open a dashboard. [Supabase Auth invitations](https://supabase.com/docs/guides/auth/users)

Replace the angle-bracket placeholders with approved UUIDs. For students, use the actual enrollment date within the academic year.

```sql
select public.portal_provision_account('<auth-uuid>', '<institution-uuid>', null, 'admin', 'Olive Fixture');
select public.portal_provision_account('<auth-uuid>', '<institution-uuid>', '<department-uuid>', 'hod', 'Morgan Fixture');
select public.portal_provision_account('<auth-uuid>', '<institution-uuid>', '<department-uuid>', 'teacher', 'Casey Fixture',
  identifier => 'FAC-FX01', designation_text => 'Instructor');
select public.portal_provision_account('<auth-uuid>', '<institution-uuid>', '<department-uuid>', 'student', 'Robin Fixture',
  '<class-uuid>', 'STU-FX01', 2026, '2026-08-01');
```

The operator can provision through a trusted backend using the same RPC with the Supabase service role. A failed link leaves the invited identity without portal access. Correct the input and rerun the link. To revoke portal access, disable the profile using `user_profiles.enabled = false` by its Auth UUID. Auth sessions and login events are managed in Supabase Auth. Department assignment, role changes, transfers and academic year setup are operator workflows. Preserve historical enrollments by specifying `enrolled_until` when moving a student and add an enrollment for the new section. Update `students.class_id` to the current section in the same transaction.

## Existing data

Rows retain their original UUIDs. Legacy departments, profiles, settings and audit rows initially have no institution, and remain outside the portal until explicitly assigned. Accounts require a verified Auth UUID. Build a reviewed import in staging that:

- Assigns an institution to each department, links authorized profiles to verified `auth.users` UUIDs, and records their institution and department.
- Adds programmes, academic years, semesters and schemes, then links the existing `classes` (sections) and `subjects`. Verify each class and subject belongs to the intended academic scope.
- Adds historical `enrollments` before opening historical attendance records. Reconcile rows whose attendance session subject, class, faculty or student fall outside the intended institution or department.
- Links one settings row per institution. Review any invalid time ranges, thresholds, orphaned Auth IDs and legacy pending correction duplicates. Validate the migration's `NOT VALID` constraints once staging data is clean.
- Leaves old browser demo data in the browser. Import approved real records using a reviewed database import with explicit mappings. Existing demo passwords and session codes have no live authentication meaning.

## Database and API model

| Area | Tables and rules |
| --- | --- |
| Identity and tenant | `institutions`, `departments` and `user_profiles`. Auth UUID identifies the user. The live PostgreSQL profile supplies role, department and institution. Browser clients have read-only scoped profiles. |
| Academic catalog | `programmes`, `academic_years`, `semesters`, `vtu_schemes`, `classes` (sections), `subjects` and `academic_activities`. Department ownership and term, programme and scheme links validate class and subject setup. |
| People and assignments | `students`, `teachers`, `enrollments` and `teacher_assignments`. Section/date enrollment and an exact subject/class/faculty assignment authorize attendance writes. |
| Attendance | One `attendance_sessions` row per class, subject, date and start time. Unique `attendance_records` per session and student. Attendance save locks and validates the date-specific roster and writes the ledger and audit event in one transaction. Failed rosters roll back session creation. |
| Corrections | `correction_requests` allows one pending request per record. Review locks the session and request, checks the original status before approval, and atomically changes the record, creates a notification and writes an audit event. |
| Timetable | `timetable_slots` has unique class, faculty and room periods per academic year. `portal_timetable` supplies display names without exposing faculty contact records to students. Rescheduling writes `timetable_change_logs` and affected students' portal notifications. |
| Settings and audit | One `institution_settings` row per institution. `notifications` are recipient-scoped. Writes record the actor from Auth on the server in `audit_logs`. Auth events are available in Supabase Auth audit logs. |

Students read their own records and enrolled timetable. Faculty read assigned section rosters and manage attendance and corrections for their exact assignments. HODs manage the assigned department. Institutional administrators act within the linked institution. PostgreSQL RLS and API grants enforce these rules independently of the router. Faculty advisories go to student portal notifications.

The browser uses Supabase's session management with IndexedDB for Auth storage and keeps academic data in memory. It refreshes on focus and after committed writes. Reads page through authorized data by primary key. Dashboards currently hydrate their permitted records up front, so verify load time with a staging dataset that reflects your institution's size.

## Fictional test accounts

Use email aliases controlled by your team to exercise live invitations and delivery. The `.example` addresses below identify the personas and have no mailboxes. Set distinct passwords through each invitation. Repeat the catalog bootstrap with a second institution and add a second department within the first institution to exercise both boundaries.

| Staging persona | Fictional identifier | Scope |
| --- | --- | --- |
| Olive Fixture | `admin@north.attendance.example` | North institution |
| Morgan Fixture | `hod-cs@north.attendance.example` | North Computing |
| Casey Fixture | `faculty-cs@north.attendance.example` | Computing 1A / CS101 |
| Robin Fixture | `student-1@north.attendance.example` | Computing 1A |
| Jamie Fixture | `student-2@north.attendance.example` | Computing 1A, separate record owner |
| Avery Fixture | `admin@south.attendance.example` | South institution |

## Verify staging

- Run `npm run test:db` or execute `supabase/tests/authorization.sql` with `psql -v ON_ERROR_STOP=1 -f supabase/tests/authorization.sql` against a disposable staging database. The test fixtures roll back. Tests cover scope, attempts to grant privileged roles, direct writes, duplicate sessions and corrections, roster rollback and atomic review.
- Run `npm run test:auth` with Playwright Chromium installed, or set `CHROME_PATH` to an installed Chrome executable. The browser fixture exercises bad credentials, sign-in, reload, a protected route, logout and the password reset flow. It also checks administrator navigation and CSV preview with duplicate emails and identifiers.
- Against the real staging site, open an invitation, set a password, sign in, reload a protected page, log out and try a protected URL. Request a reset link, open it, set a different password, then confirm sign-in with the new password. Test Auth delivery using addresses you control.
- Add a subject through the portal, assign it to the staged instructor and submit attendance once. Verify the second student cannot read the first student's attendance or correction, the HOD cannot modify a second department, and the South administrator cannot read North data.


## University administrator workspace

To test this workspace in the fictional project, create and auto-confirm a separate `admin@attendance.example` account with a private password in **Authentication → Users**. Then run [link-test-admin.sql](../supabase/link-test-admin.sql) in SQL Editor and sign in with that email. This script is scoped to Fictional Test Institute.

For a project already running migrations 00100 through 00500, paste only the contents of [the workspace migration](../supabase/migrations/20261125000600_admin_workspace.sql) into SQL Editor, between `begin;` and `commit;`, and run the query once. Deploy the matching frontend build after the migration. Existing academic and Auth identifiers are preserved.

The institution overview summarizes the signed-in administrator's institution. Department heads see their department. Pending attendance compares elapsed periods on the current timetable with recorded sessions for the chosen teaching date, excluding holidays and dates outside the academic year. Attendance shortages require at least one recorded class. Faculty workload reports scheduled weekly hours for the selected year.

Use **Academic Management → Academic hierarchy** to set up the calendar, regulations, programmes and sections. Use **People → Enrollment & import** to enter a student or faculty member or preview a CSV with the exact headers `name,email,identifier`. Student imports require a department, section and enrollment date. Faculty imports require a department. A failed row rolls back the whole batch. Section transfers close the previous enrollment and retain attendance history. Profile deactivation and archival revoke portal access while preserving academic records.

Imported academic records appear in the directory immediately. To enable sign-in, a trusted operator creates or invites the matching email in Supabase Authentication, checks the identity and institution, then runs this SQL with the three actual UUIDs. The profile ID is the `entity_id` of the corresponding `REGISTER_PERSON` audit entry. Repeat calls for the same pair are safe.

```sql
select public.workspace_link_identity(
  institution_key => 'INSTITUTION_UUID'::uuid,
  profile_key => 'ACADEMIC_PROFILE_UUID'::uuid,
  auth_key => 'AUTH_USER_UUID'::uuid
);
```

**Administration → Branding & permissions** controls the portal display name, department-head roster management and student timetable notifications. Student and faculty accounts cannot change roles. Use the trusted provisioning procedure above for a separately authorized administrator. Audit events record the affected record ID, actor, action, time and department when applicable.

## Live attendance sessions

On an existing six-migration installation, run [the live attendance migration](../supabase/migrations/20261125000700_live_attendance.sql) once in SQL Editor inside a transaction (`begin;` before the file and `commit;` after it). Fresh projects can use the full setup file. The migration preserves existing attendance records and publishes the faculty roll-call table to the Supabase Realtime publication when present. Verify that `public.lecture_roll_calls` is enabled in that publication. The student roster, PINs and QR tokens stay in private tables. [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)

Faculty open **Mark attendance**, select a scheduled lecture and create a draft. Select a window of 1–60 minutes and open check-in. Students sign in and enter the eight-digit code under **Lecture check-in**, or scan the instructor’s QR with their phone camera and confirm check-in. Use a portal HTTPS address reachable from the student’s phone for QR testing. A QR generated at localhost points back to the scanning device.

Faculty can manually mark students in the draft, open or closed roster. Closing or expiry ends self-check-in. A closed session still requires faculty review and explicit finalization. Under **Branding & permissions**, administrators can require a mark for everyone or record unmarked students as absent at submission. Reporting uses the committed attendance records. Post-submission changes follow the documented attendance correction workflow.

Numeric codes and QR tokens can be shared while valid. Faculty should compare the live roster with the students present. The server checks the signed-in student, institution, dated enrollment and expiry on every submission, and permits eight attempts per account per minute. The faculty screen refreshes the authorized roster when counters change and periodically reconciles it if the connection drops.

Run `npm run test:db` for role, expiry, duplicate and lifecycle checks. For the concurrency test, point `ATTENDANCE_TEST_POSTGRES_URL` at a dedicated loopback PostgreSQL test cluster with database-creation privileges and run `npm run test:session-races`. It creates a disposable database, adds missing Supabase fixture roles to the local cluster, and runs overlapping transactions on two connections. `npm run test:auth` exercises mobile QR sign-in, numeric feedback and the faculty display against a fixture API.


## Subject classrooms

Apply the classroom migration 20261125000800 after the live attendance migration. Faculty open **My classrooms** and create one classroom per teaching assignment. Faculty invite or add an existing student by college email from **People**. An invitation appears in the student's **My classrooms**. The student joins there. Access to classroom materials follows active section enrollment and classroom membership.

Use **Attendance** to open the existing scheduled lecture workflow or review recorded attendance. Classroom membership governs access to materials. The registrar's dated section enrollment governs the official lecture roster and individual lecture marks. Faculty can post announcements, import plain-text or Markdown notes for display as text, and publish assignments with instructions and an optional due date.

## Academic scheduling

Apply migration 20261125000900 after the classroom migration. In the live portal, open **Academic timetable → Versions** to create a draft, choose an existing teaching assignment for each weekly slot and publish with a future effective date. The calendar uses the version effective on the day being viewed. Students receive a version announcement when institutional timetable notifications are enabled.

Faculty open a lecture in **Timetable** to start attendance or request a cancellation, move, or substitute. A substitute needs an existing teaching assignment for the subject and section. Administrators review requests under **Requests**. Approval applies to the selected occurrence. The original remains visible with its changed status. Existing attendance locks that occurrence against a schedule change.

Use **Events** to manage institution-wide holidays, examinations and academic events. Holidays suppress weekly lectures for the date. Examinations and academic events appear as calendar entries. Use a timetable slot when a session needs faculty, section and room allocation checks.

Students can download an ICS snapshot of the displayed dates. Timed entries use institutional time converted to UTC. Holidays are all-day entries. [iCalendar specification](https://www.rfc-editor.org/rfc/rfc5545)
