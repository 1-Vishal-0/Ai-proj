# Smart Attendance & Academic Portal — Project context

This is the current handoff for the Windows workspace `C:\Users\USER\Documents\Ai-proj`. Start here when resuming work. See [Supabase setup and operations](SUPABASE_SETUP.md) for detailed operational procedures. The architecture, audit and roadmap documents describe earlier development stages and may use obsolete route names, persistence details or completion statuses.

## Product and architecture

The portal serves institutional administrators, department heads, faculty and students. It combines academic administration, class enrollment, timetables, attendance, correction requests, reports and subject classrooms. AMC Engineering College, Bangalore uses a separate institution from the fictional test institute within the configured Supabase project.

- React, TypeScript, Vite, React Router, Tailwind, Recharts and the Supabase JS SDK. The app entry and routes are in `src/app`, shared UI under `src/components`, feature pages under `src/features`, and programmatic data access under `src/services`.
- `src/services/supabaseClient.ts` creates the browser client with a publishable key. `src/features/auth/context/AuthContext.tsx` handles sessions, academic profile lookup, and password setup. Supabase Auth sessions persist in IndexedDB. Production data is read into an in-memory snapshot by `src/services/db/portalData.ts`. The PostgreSQL database is authoritative.
- Demo mode uses fictional data in memory and loses changes on reload. Set `VITE_PORTAL_MODE=demo` and restart Vite to use it. The production-style local app normally runs at `http://localhost:5173` with `VITE_PORTAL_MODE=production`. Only public Supabase configuration belongs in `VITE_*`.
- Row-level security and scoped PostgreSQL RPCs enforce access. Institutional admins manage their institution. HODs are department-scoped, with roster writes enabled through institutional permissions. Faculty access assigned courses and sections. Students access their own attendance and dated enrollments. Auth identities gain portal access by linking to an enabled academic profile.

## Implemented workflows

| Area | Current behaviour |
|---|---|
| Administration | Institution overview, department comparisons, attendance shortages, correction history, academic catalog, people directories, CSV preview/import, section transfers, faculty assignments and workload, settings, and audit trails. |
| Live attendance | Assigned faculty start from a scheduled lecture or open **Mark attendance**. The lifecycle is draft → open → closed → finalized. Manual marking, eight-digit codes, and QR check-in are supported. The server checks session expiry, authenticated enrollment, rate limits and duplicates. Closing or expiry stops student check-in. Finalization writes official marks after faculty review, using the institutional unmarked-student policy. Faculty counters use Supabase Realtime with a periodic refresh. Codes are shareable during their valid window, so faculty oversight still matters. |
| Subject classrooms | Faculty create one classroom per teaching assignment and invite or add currently enrolled students by college email. These invitations appear inside the portal. Students join once for materials and classroom access. Faculty can publish announcements, plain-text or Markdown notes, and assignment instructions with an optional due date. Classroom membership controls materials. Dated academic enrollment controls official lecture attendance. Assignment submissions and grading were left as future design decisions. |
| Academic scheduling | Day, week and month calendars, a mobile agenda, recurring weekly slots, lab/elective/special periods, faculty/room/section conflict checks, immutable published versions, holidays, exam windows and academic events. Faculty request cancellation, rescheduling or substitution. Approved requests apply to a specific occurrence and preserve the original state. A substitute must have an existing assignment for that subject and section. Students see their dated schedule and can export an ICS snapshot. |

Representative routes are `/admin/overview`, `/admin/timetable`, `/teacher/timetable`, `/teacher/mark`, `/teacher/classrooms`, `/student/timetable`, `/student/check-in`, and `/student/classrooms`. Standard production flows coexist with fictional demo views.

## Database and deployment state

The configured hosted project is `qmwaoukmwmsxalvvueqv`. The conversation rollout applied migrations through `20261125001000_academic_calendar_ranges.sql` directly to that project. The SQL is in [the migration directory](../supabase/migrations). Verify hosted migration history before using `supabase db push`, because direct application can leave the CLI ledger out of sync. The [fresh-project setup](../supabase/fresh-project-setup.sql) includes the schema and fictional data for an empty test project. `supabase/schema.sql` is a historical baseline.

| Migration range | Responsibility |
|---|---|
| 00100–00500 | Original schema, multi-tenant academic model, RLS, transactional attendance and correction operations, and authorized provisioning. |
| 00600 | University workspace, roster imports, account lifecycle, enrollment transfer, policies, holidays and trusted identity linking. |
| 00700 | Live roll calls, private check-in credentials, limits, review/finalization and Realtime publication. |
| 00800 | Subject classrooms, invited membership and posts. |
| 00900 | Versioned academic scheduling, dated exceptions, requests and the calendar RPC. |
| 01000 | Semester calendar ranges and date-only exam windows. |

The frontend was served locally during the rollout. A public production frontend URL and custom SMTP delivery were not verified. A QR generated on localhost is useful only on the device hosting that address. Real phone testing needs a reachable frontend URL.

## AMC Engineering College, Bangalore rollout

- Computer Science and Engineering, Semester 5, Section F, academic year **2026–2027**. Prof. Suchitra S is the class teacher. The import committed 51 students, 8 faculty, 9 subjects and 23 weekly teaching slots. Room **513** is the regular section room.
- Main section enrollment is shared by all 51 students. Each student also has a separate enrollment in exactly one lab section. F1 has 26 students and F2 has 25. On Monday, 14:00–15:50, F1 has Computer Networks in Lab 211 and F2 has Web Technology in Lab 210. Thursday uses the opposite groups at the same time. CC means free period and is excluded from lecture scheduling.
- Teaching runs **7 September–30 December 2026**. The published stop version takes effect **31 December 2026**. Theory exams are **4 January–5 February 2027**. Practical and viva exams are **8–20 February 2027**. The next semester begins **22 February 2027**. The initial academic-year bounds reflect the supplied calendar window. Confirm the full academic-year end date before adding later terms. The credit and scheme values are provisional.
- All 8 AMC faculty have verified temporary sign-ins using non-deliverable login aliases. Update the existing Auth identity and academic profile together when official emails are provided, keeping the profile IDs and teaching assignments.
- All 51 AMC students have verified logins using their lowercase USN at `amceducation.in` and distinct randomly generated passwords. Each sign-in was checked against its main section and lab enrollment. No student invitation emails were sent. A trusted operator should give each student their own credentials privately.
- The separate fictional teacher login was verified to have no access to AMC student records or exam windows. An authorized AMC administrator still needs to be identified and provisioned.
- The source CSVs and credential handoff files are under `%LOCALAPPDATA%\AttendancePortal\section-5f` on the original Windows machine. The private files are intentionally outside the repository. The importer at [scripts/import-amc-section-5f.mjs](../scripts/import-amc-section-5f.mjs) is a transactional initial-load script and refuses to overwrite an existing AMC institution. Use trusted scoped maintenance operations for subsequent changes.

## Working locally and verifying changes

```text
npm ci
npm run dev
npm run build
npm run lint
npm run test:db
npx playwright install chromium
npm run test:auth
```

- Copy `.env.example` to the ignored `.env.local` and configure the project URL and publishable key. Use `CHROME_PATH` for a locally installed Chrome executable if needed.
- `npm run test:db` runs PostgreSQL-compatible migration and RLS tests, including invitations, attendance, scheduling and legacy schema compatibility. `npm run test:session-races` uses two native PostgreSQL connections against a disposable local database and requires a dedicated loopback test cluster. See the setup guide.
- Browser regression tests use a fixture API. They covered admin overview charts and navigation after sign-in/reload, faculty QR display, mobile check-in, classroom join and notes, timetable views, attendance launch and ICS download. The hosted rollout verified publication and grants. Cross-device hosted Realtime delivery remains unverified.
- Build and lint passed after the AMC import. Vite reports a chunk-size warning. The feature code and deployed migration work can exist in the working tree before it is included in a Git commit. Check `git status` before assuming history reflects the deployed feature set.

## Open work

1. Provision an explicitly authorized AMC administrator account.
2. Gather official faculty email addresses and migrate the temporary login aliases.
3. Confirm and deploy the public frontend, configure Supabase Auth URLs and SMTP, and verify a recovery email using an existing student account. Student sign-in accounts already exist.
4. Confirm college holidays, official credits and the full academic-year end date. Add later sections and terms only from verified source data.
5. Exercise a real scheduled phone QR check-in and verify live faculty counters end to end.
