<<<<<<< HEAD
﻿# Smart Attendance & Academic Portal — Project context

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
=======
# Project Context — University Attendance & Academic Management System

## 1. Executive Summary

The **Smart Attendance & Academic Management Portal** (`ai-proj`) is a multi-role web application built for engineering colleges and technical universities (modeled on autonomous / VTU Choice-Based Credit System [CBCS] institutions in Bengaluru, India). Its product goal is to centralize institutional curriculum governance, weekly class timetables, faculty lecture attendance marking, student shortage/debarment tracking (75% mandatory exam eligibility threshold), attendance dispute resolution, and RFC 4180 CSV reporting across three distinct personas:

1. **Admin / HOD Console** — Institution-wide analytics, academic regulation schemes (2021 & 2022 CBCS), departments, classes, course catalogue, master timetables, student/faculty directories, master session logs, reports, threshold settings, and audit trails.
2. **Faculty / Teacher Console** — Daily & weekly teaching schedules, 1-click modal and full-sheet lecture attendance marking, slot rescheduling with collision detection, low-attendance defaulter tracking with advisory dispatch, dispute request review, and course CSV exports.
3. **Student Portal** — Real-time overall and subject-wise attendance standing, safe-buffer / deficit lecture calculator, weekly class timetable, personal lecture attendance log, attendance correction/dispute submission, and in-app academic notifications.

Currently, the application runs entirely in the browser as a **client-side single-page application (SPA)** backed by a custom in-memory + `localStorage` relational store (`smart_academic_portal_v6`), accompanied by a partial PostgreSQL DDL blueprint (`supabase/schema.sql`) and an unlinked Supabase client stub (`src/services/supabaseClient.ts`).

---

## 2. Technology Stack & Tooling

| Layer | Package / Tool | Version (`package.json`) | Role in Codebase |
| :--- | :--- | :--- | :--- |
| **UI Runtime** | `react`, `react-dom` | `^19.3.1` | Component rendering (`StrictMode`) |
| **Language** | `typescript` | `~7.0.2` | Static typing (`tsc -b` build gate) |
| **Bundler / Dev Server** | `vite`, `@vitejs/plugin-react` | `^8.3.6` / `^6.1.2` | Dev server & Rolldown production bundler |
| **Styling** | `tailwindcss`, `postcss`, `autoprefixer` | `^3.4.19` | Utility-first styling (`tailwind.config.js`) |
| **Class Utilities** | `clsx`, `tailwind-merge` | `^2.1.1` / `^3.7.1` | Installed in `dependencies` (**currently unused in `src/`**) |
| **Data Visualization** | `recharts` | `^3.11.0` | Area, Bar, and Donut/Pie analytics charts |
| **Iconography** | `lucide-react` | `^1.78.0` | UI icons across navigation, cards, tables, modals |
| **Backend SDK (Stub)** | `@supabase/supabase-js` | `^2.119.2` | Instantiated in `src/services/supabaseClient.ts` (**not wired to data layer**) |
| **Linter** | `oxlint` | `^1.90.0` | Rust-based linter (`react`, `typescript`, `oxc` plugins) |

---

## 3. Domain Model & Institutional Rules

### 3.1 Academic Hierarchy
- **Regulation Schemes (`VTUScheme`)**: Multi-scheme curriculum support (`2022 CBCS Regulation` and `2021 CBCS Regulation`, 160 total credits; legacy 2018 scheme and scholarship modules were intentionally purged per `verify-e2e.ts`).
- **Departments (`Department`)**: 11 engineering departments seeded (`CSE`, `CSE-AIML`, `AIML`, `CSE-DS`, `ISE`, `ECE`, `EEE`, `ME`, `CV`, `AE`, `MT`).
- **Programmes (`Programme`)**: 11 UG (`B.E.`) 4-year programmes mapped 1:1 to departments.
- **Academic Classes (`AcademicClass`)**: 23 class batches across Semesters 3 and 5 (e.g., `CSE-5th Sem-Sec A`, `AIML-5th Sem-Sec A`) for academic year `2026-2027`.
- **Subjects (`Subject`)**: 41 VTU CBCS courses with official subject codes (`BCS501`, `BMATS101`, `BAI501`, `21CS51`, etc.), categories (`BSC`, `ESC`, `PCC`, `PEC`, `OEC`, `HSMC`, `AEC`, `SEC`, `PCCL`, `PROJ`, `INT`, `MC`), delivery types (`theory`, `practical`, `integrated`), credits, CIE/SEE marks (`50/50` or `100/100`), and teaching hours.
- **Timetable (`TimetableEntry`)**: Monday–Saturday period schedule (`Period 1` to `Period 7`) linking class, subject, faculty, and classroom, with a `TimetableChangeLog` audit trail when faculty reschedule slots.

### 3.2 Attendance & Eligibility Rules
- **Statuses**: `'present' | 'absent' | 'leave'`.
- **Recording Channels (`MarkedBy`)**: `'teacher' | 'code' | 'correction'`.
- **Thresholds (`InstitutionSettings`)**:
  - **Mandatory Exam Eligibility Threshold**: `75%` (`threshold_percentage`). Students `< 75%` are flagged as `"critical"` / `"Debarred Risk"`.
  - **Early Warning Threshold**: `80%` (`warning_threshold`). Students between `75%` and `79.9%` are flagged as `"warning"`.
  - **Safe Standing**: `>= 80%` (`"safe"`).
- **Configurable Leave Rule**: `leave_counts_as_present` (boolean, defaults to `false` in `seedData.ts`), intended to control whether approved leave counts in the numerator of the attendance formula.

---

## 4. User Personas & Demo Accounts

> **Important Documentation Drift Note**: `README.md` (lines 61–66) documents four legacy `"@niet.edu"` accounts (`Dr. Arthur Vance`, `Prof. Priya Sharma`, `Arjun Kumar`, `Devin Thorne`). The actual codebase (`src/services/db/seedData.ts:1496-1554`, `src/pages/auth/LoginPage.tsx:29-54`, and `verify-e2e.ts:21-43`) enforces **exactly three** seeded accounts:

| Role | Seeded Name | Email | User ID | Profile / Identifier | Seeded Data Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin / HOD** | Dr. A.G. Nataraj | `admin@portal.edu` | `user-amcec-admin` | HOD, CSE | Full institutional console; 2 initial audit log entries |
| **Faculty / Teacher** | Prof. Sandhya S. | `teacher@portal.edu` | `user-amcec-teacher` | `FAC-CSE-028` (`teacher-amcec-1`) | Assigned `BCS501` (SEPM) & `BCS502` (CN) for `CSE-5th Sem-Sec A`; 7 weekly timetable slots; 4 conducted sessions |
| **Student** | Rahul M. | `student@portal.edu` | `user-amcec-student` | USN/Roll: `ENG22CS089` (`stu-amcec-1`) | Enrolled in `CSE-5th Sem-Sec A` (2022 Scheme); 3 present / 1 absent (`75%`); 1 pending correction request (`corr-1`) |

---

## 5. Application Surface Area (Pages & Views)

Routing is managed in `src/App.tsx` via an in-memory `currentView` state string rather than URL paths. There are **25 page components** in `src/pages/` (**24 reachable**, **1 orphaned**):

### 5.1 Authentication (`src/pages/auth/`)
| View / Component | File | Purpose |
| :--- | :--- | :--- |
| Login Screen | `src/pages/auth/LoginPage.tsx` | Email/password login form + 1-click Demo Persona cards |

### 5.2 Admin / HOD Console (`src/pages/admin/`)
| `currentView` ID | File | Purpose |
| :--- | :--- | :--- |
| `admin-overview` | `AdminOverviewPage.tsx` | KPI cards, 7-day trend AreaChart, status PieChart, department BarChart, low-attendance watchlist, recent audit logs |
| `admin-schemes` | `AdminSchemesPage.tsx` | View/create CBCS academic schemes (`VTUScheme`) + demo PDF syllabus upload modal |
| `admin-academics` | `AdminAcademicsPage.tsx` | Tabbed view & creation modals for Departments, Classes, and Subjects |
| `admin-subjects` | `AdminSubjectsPage.tsx` | Searchable/filterable master subject catalogue + detailed VTU subject creation modal |
| `admin-timetable` | `AdminTimetablePage.tsx` | Class-wise Mon–Sat x Period 1–6 timetable matrix, slot creation/deletion, and reschedule audit table |
| `admin-students` | `AdminStudentsPage.tsx` | Searchable/filterable student directory with attendance progress bars + student enrollment modal |
| `admin-teachers` | `AdminTeachersPage.tsx` | Faculty directory cards, custom designation/qualification support, and course-to-class allocation modal |
| `admin-attendance` | `AdminAttendanceMasterPage.tsx` | Institution-wide conducted session log with class/subject/date filters and roster inspection modal |
| `admin-reports` | `AdminReportsPage.tsx` | Student-wise, Low-Attendance Defaulters, Class-wise, and Subject-wise report previews, Print, and CSV export |
| `admin-settings` | `AdminSettingsPage.tsx` | Thresholds (`75%` / `80%`), institution name/term, lecture duration, and auto-alerts toggle |
| `admin-audit` | `AdminAuditLogsPage.tsx` | Searchable/filterable system audit log viewer (up to 100 entries) with CSV export |
| *(Unrouted / Orphaned)* | `AdminActivitiesPage.tsx` | Academic activities & mandatory courses (`NSS`, `SCR`, `UHV`, `IPR`) viewer & creation modal (**not imported in `App.tsx` or `Sidebar.tsx`**) |

### 5.3 Faculty / Teacher Console (`src/pages/teacher/`)
| `currentView` ID | File | Purpose |
| :--- | :--- | :--- |
| `teacher-overview` | `TeacherOverviewPage.tsx` | Faculty KPIs, today's teaching schedule with 1-click `QuickAttendanceModal` & `RescheduleSlotModal`, 7-day chart, defaulters, quick dispute review |
| `teacher-timetable` | `TeacherTimetablePage.tsx` | Day-by-day weekly schedule pills, 1-click attendance & slot rescheduling, and faculty reschedule history tab |
| `teacher-mark` | `TeacherMarkAttendancePage.tsx` | Full-page manual attendance sheet with class/subject/date/time/type selectors, search, status filter, bulk actions (`All Present`, `All Absent`, `Invert`), and remarks |
| `teacher-history` | `TeacherHistoryPage.tsx` | Conducted sessions table with roster modal and individual record edit sub-modal (requiring justification) |
| `teacher-low` | `TeacherLowAttendancePage.tsx` | Assigned-class low-attendance tracker + simulated parent/student warning notice modal |
| `teacher-corrections` | `TeacherCorrectionsPage.tsx` | Pending & reviewed student attendance dispute queue with approve/reject modal |
| `teacher-reports` | `TeacherReportsPage.tsx` | Class + Subject attendance summary sheet with Print and CSV export |

### 5.4 Student Portal (`src/pages/student/`)
| `currentView` ID | File | Purpose |
| :--- | :--- | :--- |
| `student-overview` | `StudentOverviewPage.tsx` | Student banner, aggregate turnout gauge, safe-buffer / deficit calculator, subject cards, recent sessions, recent notices |
| `student-timetable` | `StudentTimetablePage.tsx` | Day-by-day weekly class lecture schedule |
| `student-history` | `StudentHistoryPage.tsx` | Filterable personal attendance session log with Print, CSV export, and shortcut to dispute absent records |
| `student-correction` | `StudentCorrectionPage.tsx` | Attendance dispute submission form and personal request status history |
| `student-notifications` | `StudentNotificationsPage.tsx` | Notification feed with mark-all-read and target view navigation |

---

## 6. Baseline Build, Lint & Verification Status

| Check | Command | Exit Code | Summary Result |
| :--- | :--- | :--- | :--- |
| **TypeScript + Production Build** | `npm run build` (`tsc -b && vite build`) | `0` (Pass) | Compiles cleanly in `3.95s`, but emits a **single `1,050.97 kB` (`268.50 kB` gzip) JS chunk** exceeding Vite's 500 kB warning limit. |
| **Static Linting** | `npm run lint` (`oxlint`) | `0` (Pass w/ warnings) | **0 errors, 167 warnings** across 46 files (`149` unused vars/imports, `9` impure `new Date()` calls in render, `5` synchronous `setState` in `useEffect`, `3` missing hook dependencies, `1` Fast Refresh export warning). |
| **Programmatic Verification Suite** | `node verify-e2e.ts` | `1` (Fail) | Not wired into `package.json`; fails under Node.js v24.15.0 native ESM (`ERR_UNSUPPORTED_DIR_IMPORT` on `../../types` inside `database.ts`) because `tsx` is not installed. |
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
