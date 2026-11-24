# Comprehensive Project Audit — University Attendance Management System

**Repository**: `https://github.com/1-Vishal-0/Ai-proj` (`HEAD`: `0c157ab`)  
**Audit Scope**: Full static, architectural, functional, UX, responsiveness, performance, and security inspection across all tracked files without modifying application code.

---

## 1. Build, Type-Check, Lint & Test Execution Results

### 1.1 Production Build & TypeScript Check (`npm run build`)
- **Command**: `tsc -b && vite build`
- **Exit Code**: `0` (**PASS**)
- **Execution Time**: `3.95s` (`2,611` modules transformed via Vite v8.3.8)
- **Output Artifacts**:
  - `dist/index.html` — `1.24 kB` (`0.67 kB` gzip)
  - `dist/assets/index-eAH3Yjtk.css` — `36.69 kB` (`6.78 kB` gzip)
  - `dist/assets/index-BDnPTxGe.js` — **`1,050.97 kB` (`268.50 kB` gzip)**
- **Build Warning Recorded**:
  - `(!) Some chunks are larger than 500 kB after minification.` Entire application, Recharts, Lucide icons, and the 1,904-line `seedData.ts` compile into a single >1 MB JavaScript bundle due to zero route/component code splitting.
- **TypeScript Config Caveat**: `tsconfig.app.json` sets `"noUnusedLocals": false`, `"noUnusedParameters": false`, and omits `"strict": true`!

### 1.2 Static Linting (`npm run lint`)
- **Command**: `oxlint` (v1.90.0, 116 rules across 46 files in `145ms`)
- **Exit Code**: `0` (**0 errors, 167 warnings**)
- **Warning Breakdown by Rule**:

| Rule Code | Count | Impact |
| :--- | ---: | :--- |
| `eslint(no-unused-vars)` | **149** | Dead icon imports, unused state variables (`refreshTrigger`), unused props (`onNavigate`), unused data queries (`programmes`, `departments`, `classes`, `studentCorrections`) across almost every page. |
| `react(purity)` | **9** | Calling impure `new Date()` directly during component render (`AdminOverviewPage.tsx:40`, `TeacherOverviewPage.tsx:57,59`, `TeacherTimetablePage.tsx:32,50`, `TeacherMarkAttendancePage.tsx:31`, `QuickAttendanceModal.tsx:45`, `StudentTimetablePage.tsx:14`, `StudentCorrectionPage.tsx:29`). Prevents React Compiler optimization and causes subtle midnight/UTC boundary drift. |
| `react(set-state-in-effect)` | **5** | Synchronous `setState` inside `useEffect` triggering cascading renders (`App.tsx:45`, `AuthContext.tsx:53`, `QuickAttendanceModal.tsx:63`, `RescheduleSlotModal.tsx:54`, `TeacherMarkAttendancePage.tsx:59`). |
| `react-hooks(exhaustive-deps)` | **3** | Missing hook dependencies: `currentView` in `App.tsx:44`; `classStudents` in `QuickAttendanceModal.tsx:84` and `TeacherMarkAttendancePage.tsx:68`. |
| `react(only-export-components)` | **1** | `AuthContext.tsx:171` exports both `AuthProvider` component and `useAuth` hook, breaking Vite Fast Refresh boundaries. |

### 1.3 Programmatic Verification Script (`verify-e2e.ts`)
- **Command**: `node verify-e2e.ts` (Node.js `v24.15.0`)
- **Exit Code**: `1` (**BROKEN**)
- **Failure**: `Error [ERR_UNSUPPORTED_DIR_IMPORT]: Directory import '...\src\types' is not supported resolving ES modules imported from ...\src\services\db\database.ts`.
- **Root Cause**: `verify-e2e.ts` is not wired into `package.json`, is excluded from `tsconfig.json`, and relies on bundler-style directory/extensionless imports (`../../types`, `./seedData`) without `tsx` or `vitest` installed in `devDependencies`.

---

## 2. Page-by-Page Audit

### 2.1 Auth & Layout Components
| Component / Page | File | Status | Key Findings |
| :--- | :--- | :--- | :--- |
| **Login Page** | `src/pages/auth/LoginPage.tsx` | **Demo-Only** | Clean UI with email/password form and 3 instant login cards (`loginAsUser`). Unreachable on initial visit because `AuthContext` auto-logs into Admin on cold load. Reads `settings` (`line 13`) but never uses it—hardcodes all college branding strings. |
| **Top Header** | `src/components/layout/Header.tsx` | **Partially Implemented** | Displays page title, DB badge, `Reset Data` button, Persona Switcher, and Notification Bell. **Bugs**: (1) `isSupabaseConfigured` badge claims `"Supabase Postgres"` if env vars exist even though DB still uses `localStorage`; (2) `Reset Data` and `Persona Switcher` are exposed to all roles; (3) Line 171 hardcodes `'Student (1AM22CS089)'` for every student user (even though seed student is `ENG22CS089`); (4) Notification click handler (`lines 236-240`) ignores `/student/corrections` and `/admin/timetable` links; (5) Mark-all-read does not re-render for Admin. |
| **Sidebar** | `src/components/layout/Sidebar.tsx` | **Functional (with Demo Controls)** | Responsive slide-over drawer on mobile + fixed `w-72` rail on desktop (`lg:static`). **Issues**: (1) `pendingCorrectionsCount` (`line 47`) counts **all** global pending corrections rather than filtering to the logged-in teacher's assigned subjects; (2) Embeds global 1-click `Demo Persona Switch`; (3) Uses invalid Tailwind class `py-0.2` (`line 191`); (4) Missing `AdminActivitiesPage` nav item. |

### 2.2 Admin / HOD Pages (`src/pages/admin/`)
| Page | Route ID | Classification | Findings & Code Evidence |
| :--- | :--- | :--- | :--- |
| **Admin Overview** | `admin-overview` | **Partially Implemented** | Renders KPIs, 3 Recharts charts, defaulter watchlist, and recent audit logs. **Bugs**: (1) Hardcodes `"Dr. A.G. Nataraj • Professor & HOD"` (`line 120`); (2) Trend chart injects synthetic `88.5%` (`18/20`) on days with 0 sessions (`database.ts:1483-1493`); (3) Department chart claims `"all 11 engineering departments"` (`line 353`) while `getDepartmentStats()` slices only `.slice(0, 6)` and fabricates `85.0%` for empty departments (`database.ts:1504,1512`); (4) Watchlist misflags high-attendance students who have `>= 2` lifetime absences (`database.ts:1441-1445`). |
| **Admin Schemes** | `admin-schemes` | **Partially Implemented** | Scheme listing, filtering, and new `VTUScheme` creation work. **Demo-Only Stub**: `"Upload Syllabus PDF"` modal (`lines 293-332`) has no `<input type="file">`, accepts no files, and triggers a fake `window.alert('Syllabus file verified and indexed...')` (`line 323`). Also lacks edit/deactivate scheme controls. |
| **Admin Academics** | `admin-academics` | **Partially Implemented** | Tabbed view + creation modals for Departments, Classes, and Subjects. **Bugs**: (1) `handleCreateClass` (`lines 51-60`) hardcodes invalid `programme_id: 'prog-be-cse'` (actual seed ID is `'prog-cse'`), `section: 'A'`, `vtu_scheme_id: 'scheme-vtu-2022'`, and `admission_batch: '2024–2028'`; (2) `handleCreateSubject` (`lines 68-82`) duplicates `AdminSubjectsPage` with hardcoded `semester: 5, category: 'PCC'`; (3) Tables lack `overflow-x-auto` for mobile screens; (4) Create-only—no Edit or Delete actions. |
| **Admin Subjects** | `admin-subjects` | **Functional (Create/Read)** | Multi-filter catalogue (Scheme, Semester, Dept, Search) + comprehensive VTU subject creation modal. Missing Edit/Delete/Deactivate actions and duplicate subject-code validation (`createSubject` allows duplicate `code`s!). |
| **Admin Timetable** | `admin-timetable` | **Partially Implemented** | Displays Mon–Sat x Period 1–6 grid, schedules new slots, lists reschedule logs. **Bugs**: (1) `handleDelete` (`lines 70-74`) calls `db.deleteTimetableEntry(id)` without local state update—UI **fails to re-render** for Admin until view change; (2) Delete icon uses `opacity-0 group-hover:opacity-100` (`line 153`), unusable on touchscreens; (3) Grid omits **Period 7** (`RescheduleSlotModal` allows Period 7, causing rescheduled slots to vanish from the master grid!); (4) `periods` array (`lines 37-39`) uses `'01:15'`, `'02:00 - 03:00'`, `'03:00 - 04:00'` (12h format instead of `'13:15'`, `'14:00'`, `'15:00'`); (5) `createTimetableEntry` skips class-section double-booking check; (6) Subject dropdown (`line 343`) filters only by `semester`, ignoring `department_id` and `vtu_scheme_id`. |
| **Admin Students** | `admin-students` | **Functional (Create/Read)** | Search + Scheme/Dept/Class filters + dynamic department-to-class enrollment modal. **Bugs**: (1) Newly enrolled students in classes with past sessions show `100%` (`0/0 sessions`) instead of counting missed sessions or showing `N/A`; (2) Assigns hardcoded password `'student123'` (`line 120`) and fixed Unsplash woman avatar (`line 122`) to all enrolled students; (3) No Edit/Delete/Transfer/Bulk CSV import. |
| **Admin Teachers** | `admin-teachers` | **Functional (Create/Read)** | Faculty cards, custom `'Other'` Designation & Qualification inputs, and course-to-class assignment modal. **Gaps**: `Trash2` imported (`line 7`) for removing course assignments, **never wired up**—cannot unassign a course or edit/delete a faculty member. |
| **Admin Attendance Master** | `admin-attendance` | **Functional (Read-Only)** | Filterable session list + `"Inspect Roster"` modal. **UI Mismatch**: Column header says `"Proxy Code"` (`line 123`), cell renders `'Timetable Session' : 'Direct Session'` (`line 173`), and sessions marked via `QuickAttendanceModal` wrongly display `'Direct Session'` because `timetable_entry_id` is never saved. |
| **Admin Reports** | `admin-reports` | **Partially Implemented** | 4 working report views (`student`, `low-attendance`, `class`, `subject`) + CSV export + `window.print()`. **Bugs**: (1) Unused `'daily'` union member (`line 19`); (2) Division-by-zero (`Infinity` / `NaN`) in `deficit` (`line 124`) if `thresholdInput === 100`; (3) `low-attendance` report includes students above threshold if `absent >= 2`; (4) Print view is clipped by `App.tsx`'s `h-screen overflow-hidden` layout. |
| **Admin Settings** | `admin-settings` | **Broken (Form Validation Block)** | **Bug**: `defaultDuration` initializes to `10` (`seedData.ts:34`), while `<input type="number" min={15} max={180}>` (`AdminSettingsPage.tsx:178-180`) enforces `min=15`! Attempting to change thresholds or institution name and click `"Save Institutional Configuration"` **fails HTML5 validation** unless the user also manually raises duration `>= 15`. Furthermore, `auto_alerts_enabled` is a no-op across the codebase, and `leave_counts_as_present` has no UI control. |
| **Admin Audit Logs** | `admin-audit` | **Functional** | Search, role/action filters, 100-entry view, and CSV export. Minor: Column header says `"Timestamp (UTC)"` (`line 107`) while `toLocaleString()` (`line 127`) renders local time; missing `ip_address` defaults to hardcoded `'127.0.0.1'` (`line 155`). |
| **Admin Activities** | *(Unrouted)* | **Broken / Orphaned** | `src/pages/admin/AdminActivitiesPage.tsx` (213 lines) is fully coded and backed by `db.getAcademicActivities()` + 4 seeded records, **but is never imported in `App.tsx` or `Sidebar.tsx`**, making it 100% unreachable. |

### 2.3 Faculty / Teacher Pages (`src/pages/teacher/`)
| Page | Route ID | Classification | Findings & Code Evidence |
| :--- | :--- | :--- | :--- |
| **Teacher Overview** | `teacher-overview` | **Partially Implemented** | Rich dashboard with today's schedule, 1-click `QuickAttendanceModal`, `RescheduleSlotModal`, trend chart, low-attendance card, and 1-click dispute review. **Bugs**: (1) Hardcodes `"Prof. Sandhya S."` and `"Department of Computer Science & Engineering"` (`lines 108, 114`) for ALL teachers; (2) 7-day trend chart calls global `db.getAttendanceTrend(7)` (`line 86`) instead of filtering to this teacher's courses—and displays fake `88.5%` data on empty days; (3) `refreshTrigger` state (`line 41`) is incremented on save/review but never read. |
| **Teacher Timetable** | `teacher-timetable` | **Partially Implemented** | Mon–Sat pills, slot cards with `"Take Attendance"` & `"Reschedule"`, plus `"Change History"` tab. **Bug**: Clicking `"Take Attendance"` while viewing another day tab (e.g., viewing `Friday` on a `Tuesday`) opens `QuickAttendanceModal` without passing `sessionDate`, so it records attendance for **today's UTC date** rather than the selected day, while `isSubmitted` only checks `activeDay === currentDayName` (`lines 131-138`). |
| **Teacher Mark Attendance** | `teacher-mark` | **Functional (Core)** | Full attendance sheet with search, status filter, bulk `All Present` / `All Absent` / `Invert`, per-student remarks, and duplicate-safe upsert. **Bugs**: (1) Matches existing session only by `(class_id, subject_id, date)` (`lines 51-56`), colliding if two periods of the same course occur on the same day; (2) Class & Subject dropdowns (`lines 25-26`) are not cross-filtered (if Teacher teaches Sub A to Class 1 and Sub B to Class 2, they can mark Sub A for Class 2); (3) Roster `<table>` (`line 398`) lacks `overflow-x-auto` on mobile; (4) Calls `db.calculateStudentAttendance(student.id)` inside render loop on every keystroke (`line 419`). |
| **Teacher History** | `teacher-history` | **Functional** | Lists teacher's sessions, opens roster modal, and provides an `"Authorized Attendance Record Correction"` sub-modal requiring justification (`marked_by: 'correction'`). Minor: Column header still mentions `"Proxy Code"` (`line 96`). |
| **Teacher Low Attendance** | `teacher-low` | **Partially Implemented / Demo-Only Email** | Lists flagged students in assigned classes + dispatches in-app notification & audit log. **Issues**: (1) Email sending to guardian (`guardian_email`) is **simulated** (`handleSendSimulatedEmail` only creates an in-app student `Notification`); (2) `"Declining Attendance"` card claims `"Missed 2+ consecutive lectures"` (`line 106`), whereas `database.ts:1441` checks total lifetime absences `stats.absent >= 2`, which also pollutes `"Below Threshold"` (`lowStudents.length`) with students above 75%! |
| **Teacher Corrections** | `teacher-corrections` | **Functional** | Pending & Decision History tabs + Approve/Reject review modal updating `AttendanceRecord` and notifying the student. **Gap**: `getEnrichedCorrectionRequests(teacherId)` (`database.ts:938-940`) filters by `allowedSubjectIds` only (not `class_id`), so if two teachers teach `BCS501` to different sections (`Sec A` vs `Sec B`), both teachers see each other's correction requests. |
| **Teacher Reports** | `teacher-reports` | **Functional** | Per-class, per-subject student summary table + Print + CSV export. Hardcodes `< 75` (`lines 30, 141, 148`) instead of reading `settings.threshold_percentage`. |

### 2.4 Student Pages (`src/pages/student/`)
| Page | Route ID | Classification | Findings & Code Evidence |
| :--- | :--- | :--- | :--- |
| **Student Overview** | `student-overview` | **Partially Implemented** | Displays turnout gauge, buffer/deficit calculator, subject cards, recent records, and notices. **Major Bugs**: (1) `calculateSubjectWiseAttendanceForStudent` (`database.ts:1401-1403`) forgets to filter by `department_id`, rendering **all 18 5th-sem subjects across CSE, AIML, ECE, EEE, ME, and Civil** on CSE student Rahul M.'s dashboard at `100% (0/0 Attended)`!; (2) Hardcodes `"Department of Computer Science & Engineering"` and `"5th Semester, Section A"` (`lines 86, 97, 162`); (3) Subject `trend` (`database.ts:1415`) is hardcoded to `'stable' as const`, making the `Improving` / `Declining` UI branches (`lines 274-284`) dead code. |
| **Student Timetable** | `student-timetable` | **Functional** | Clean Mon–Sat class timetable viewer dynamically reflecting teacher-rescheduled slots. |
| **Student History** | `student-history` | **Partially Implemented** | Session history log + Print + CSV export + `"Request Correction"` button. **Bugs**: (1) Course filter dropdown (`lines 106-111`) lists all 41 subjects across all departments/semesters; (2) Clicking `"Request Correction"` (`line 191`) only navigates to `'student-correction'` without passing the session's `subject_id` or `date`—forcing the student to re-enter them manually; (3) Missing `AttendanceRecord` rows display as `'ABSENT'` here while `calculateStudentAttendance` ignores them. |
| **Student Correction** | `student-correction` | **Partially Implemented** | Submits dispute requests and lists past statuses. **Bugs**: (1) Subject dropdown (`lines 119-123`) lists all 41 subjects institution-wide; (2) Allows arbitrary dates with no conducted session, fabricating `session-dummy-${Date.now()}` (`line 52`) which silently skips teacher notification (`database.ts:966`) and creates orphaned records if approved; (3) Allows duplicate pending requests for the same session. |
| **Student Notifications** | `student-notifications` | **Functional** | Lists student notifications, marks individual or all read, and routes to related student views. |

---

## 3. Complete Feature Classification Matrix

Every capability referenced in the codebase, UI, schema, or `README.md` is classified below as **Functional**, **Partially Implemented**, **Demo-Only**, **Broken**, or **Missing**:

| Domain | Feature | Classification | Evidence & Justification |
| :--- | :--- | :--- | :--- |
| **Auth & RBAC** | Email + Password Login | **Demo-Only** | Seeded users have no `password_hash` (any password works); `'password123'` is a hardcoded universal backdoor; email prefix `admin@...` spoofing active (`AuthContext.tsx:96`, `database.ts:198`). |
| **Auth & RBAC** | Session Persistence & Logout | **Broken** | Cold load and post-logout page refresh (`F5`) hit `AuthContext.tsx:64-72` and **auto-authenticate as Admin** without credentials. |
| **Auth & RBAC** | Quick Role / Persona Switcher | **Demo-Only** | Works in `LoginPage`, `Header`, and `Sidebar`, but unrestricted in production builds. |
| **Auth & RBAC** | View-Level Role Guards | **Partially Implemented** | `App.tsx:71-84` prevents cross-role view rendering in UI, but zero backend/RLS enforcement exists. |
| **Database** | LocalStorage Relational Store | **Functional** | Persists 18 collections under `smart_academic_portal_v6` with seed reset. Lacks cross-tab sync and Admin re-render reactivity on non-state mutations. |
| **Database** | Supabase Cloud Integration | **Demo-Only (Stub)** | `supabaseClient.ts` creates client, but **zero queries/mutations use it**; `Header.tsx` displays false `"Supabase Postgres"` badge if env vars are set. |
| **Database** | PostgreSQL Schema (`schema.sql`) | **Broken / Outdated** | Missing 5 of 18 tables (`programmes`, `vtu_schemes`, `timetable`, `timetable_change_logs`, `academic_activities`), missing VTU columns, and **zero RLS policies**. |
| **Admin** | Institutional Analytics Dashboard | **Partially Implemented** | Charts render via Recharts, but 7-day trend fabricates `88.5%` on empty days and Dept chart truncates to 6 depts & fabricates `85%` for 0-student depts. |
| **Admin** | Academic Schemes Management | **Partially Implemented** | View & create schemes work; no edit/delete. |
| **Admin** | Syllabus PDF Upload & Extraction | **Demo-Only** | `AdminSchemesPage.tsx:293-332` is a mock modal firing `alert(...)` with no file input or PDF parser. |
| **Admin** | Department, Class & Subject CRUD | **Partially Implemented** | Create & Read work (`AdminSubjectsPage` is solid); Edit & Delete are missing; `AdminAcademicsPage` class creation writes invalid `'prog-be-cse'` FK. |
| **Admin** | Academic Activities Module | **Broken (Orphaned)** | `AdminActivitiesPage.tsx` exists with DB methods & seed data, but is not routed in `App.tsx` or `Sidebar.tsx`. |
| **Admin** | Master Timetable Management | **Partially Implemented** | Create & view Periods 1–6 work; Delete fails to re-render UI; Period 7 is hidden; class double-booking check missing on Admin create. |
| **Admin** | Student Enrollment & Directory | **Partially Implemented** | Search, filter, and enroll work; Edit/Delete/Bulk CSV upload missing; `0`-record students show `100%`. |
| **Admin** | Faculty Directory & Allocations | **Partially Implemented** | Create teacher (with custom `'Other'` fields) & assign course work; cannot unassign courses or edit/delete faculty. |
| **Admin** | Master Attendance Session Log | **Functional** | Filter by class/subject/date + inspect student roster modal works. |
| **Admin** | Institutional Reports & CSV Export | **Partially Implemented** | 4 report types + CSV download work; `'daily'` report type is unimplemented; print layout clips scrollable content; defaulter filter bug (`absent >= 2`). |
| **Admin** | Thresholds & Institution Settings | **Broken** | Blocked on submit by `defaultDuration=10` violating `<input min={15}>`; `auto_alerts_enabled` is a no-op; `leave_counts_as_present` has no UI toggle. |
| **Admin** | Audit Trail & CSV Export | **Functional (Local)** | Logs actions, filters by role/action, exports CSV (mutable in `localStorage`). |
| **Faculty** | Timetable 1-Click Attendance Modal | **Partially Implemented** | `QuickAttendanceModal` marks/updates attendance cleanly, but omits `timetable_entry_id`, collides on multi-period same-day courses, and uses today's date even when clicked from another weekday tab. |
| **Faculty** | Full Manual Attendance Sheet | **Functional** | `TeacherMarkAttendancePage` supports individual, bulk, invert, search, filter, and remarks (subject to same-day multi-period collision). |
| **Faculty** | Smart Proxy Attendance Code (6-Digit OTP & Live Monitor) | **Missing (UI Purged, Backend Orphaned)** | Highlighted in `README.md:21,34-40` and supported in `database.ts:723,834`, **but 100% of Teacher & Student UI for generating/entering codes is missing**. |
| **Faculty** | Self-Service Slot Rescheduling | **Functional** | `RescheduleSlotModal` checks 3-way collisions (teacher, classroom, class), updates timetable, logs `TimetableChangeLog`, and notifies students + Admin. |
| **Faculty** | Historical Record Correction | **Functional** | `TeacherHistoryPage` allows per-student status correction with mandatory justification and audit log. |
| **Faculty** | Low-Attendance Warning Dispatch | **Demo-Only (Email) / Functional (In-App)** | Sends in-app student notification + audit log; external parent/guardian email delivery is simulated. |
| **Faculty** | Dispute Request Review | **Functional** | Approve/Reject workflow updates `AttendanceRecord` (`marked_by: 'correction'`) and notifies student. |
| **Student** | Overall & Subject Attendance Standing | **Partially Implemented** | Overall math & buffer/deficit work (for marked sessions), **but subject breakdown leaks all 18 cross-department subjects** for the semester, and `trend` is hardcoded to `'stable'`. |
| **Student** | Weekly Class Timetable | **Functional** | Displays class schedule and reflects teacher rescheduling live. |
| **Student** | Personal Attendance Log & CSV | **Partially Implemented** | Filter, CSV export, and view work; unrecorded sessions show `'ABSENT'` while aggregate gauge ignores them. |
| **Student** | Attendance Dispute Submission | **Partially Implemented** | Works when matching an existing session date/subject; fabricates broken `session-dummy-*` IDs when no session matches; lacks evidence file upload. |
| **Student** | In-App Notifications | **Partially Implemented** | `StudentNotificationsPage` works; `Header.tsx` bell dropdown fails to navigate on `/student/corrections` links. |
| **Ops / QA** | Automated Unit / E2E Test Suite | **Broken / Missing** | No Vitest/Jest/Playwright setup; `verify-e2e.ts` crashes under Node ESM. |

---

## 4. Deep-Dive Technical Audit by Category

### 4.1 Security Vulnerabilities

| Severity | Vulnerability | Location | Technical Details |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | **Unauthenticated Auto-Admin Login & Logout Bypass** | `src/context/AuthContext.tsx:49-72` | When `AUTH_USER_KEY` is absent from `localStorage` (initial visit OR refreshing the page after clicking `Logout`), `AuthProvider` automatically signs the user in as `admin` (`Dr. A.G. Nataraj`). |
| **CRITICAL** | **Passwordless Accounts & Hardcoded Universal Master Password** | `src/context/AuthContext.tsx:96`, `src/services/db/seedData.ts:1496-1524` | Seeded users omit `password_hash`, bypassing password verification completely. Even when `password_hash` exists on newly enrolled accounts, `password !== 'password123'` grants universal access to every account, and passwords are stored in plaintext (`'student123'`, `'teacher123'`). |
| **CRITICAL** | **Unrestricted Privilege Escalation Controls in UI** | `Header.tsx:110-182`, `Sidebar.tsx:206-253`, `AuthContext.tsx:135-151` | `loginAsUser()`, `switchRole()`, and `db.resetToSeed()` (`Reset Data`) are rendered unconditionally for all users—any student can switch to Admin or wipe institutional data in 1 click. |
| **HIGH** | **`.env` Secrets Not Ignored by Git** | `.gitignore:1-24` | `.gitignore` only excludes `*.local`, NOT `.env`. Following `README.md:96` (`Create a .env file`) exposes Supabase keys to accidental git commits. |
| **HIGH** | **Missing Supabase Row-Level Security (RLS)** | `supabase/schema.sql:1-169` | Zero `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` rules. Deploying `schema.sql` with `VITE_SUPABASE_ANON_KEY` exposes all tables to arbitrary client read/write/delete operations. |
| **MEDIUM** | **Email Prefix Account Spoofing** | `src/services/db/database.ts:198-201` | `getUserByEmail()` matches any email starting with `admin@`, `teacher@`, or `student@` to the first user with that prefix. |
| **MEDIUM** | **Tamperable Client-Side Data & Audit Trail** | `src/services/db/database.ts:116-126` | Entire database and `"Immutable"` security audit logs reside in plaintext `window.localStorage` (`smart_academic_portal_v6`). |
| **LOW** | **CSV Formula Injection Risk** | `src/services/export.service.ts:5-12` | Student names, reasons, or remarks starting with `=`, `+`, `-`, or `@` are exported unprefixed into CSV cells, enabling spreadsheet formula execution in Excel. |

### 4.2 Attendance Marking & Calculation Logic Defects
1. **Unrecorded Student Paradox (`100%` Gauge vs. `ABSENT` History)**:
   - `calculateStudentAttendance` (`database.ts:1372-1375`) divides by `studentRecords.length` instead of `relevantSessions.length` and returns `100%` when `studentRecords.length === 0`. Meanwhile `StudentOverviewPage.tsx:314` and `StudentHistoryPage.tsx:42` display `status = rec?.status || 'absent'`.
2. **Cross-Department Subject Leakage (`database.ts:1401-1403`)**:
   - `calculateSubjectWiseAttendanceForStudent` filters by `vtu_scheme_id` and `semester` without `department_id` (or class timetable/assignments), exposing 18 subjects from 6 engineering branches to a single CSE student.
3. **False-Positive Defaulter Classification (`database.ts:1441-1445`)**:
   - `getLowAttendanceStudents()` sets `declining = stats.absent >= 2` and filters `overallPercentage < cutoff || item.declining`, flagging students with `>= 75%` attendance as defaulters once they accumulate 2 lifetime absences.
4. **Same-Day Multi-Period Session Overwrite (`QuickAttendanceModal.tsx:72-74`, `TeacherMarkAttendancePage.tsx:51-56`)**:
   - Session lookup ignores `start_time` and `timetable_entry_id`, overwriting earlier periods of the same subject on the same date.
5. **Synthetic Chart Data Fabrication (`database.ts:1483-1493, 1504-1513`)**:
   - `getAttendanceTrend()` returns `88.5%` (`18/20`) on days with `0` sessions; `getDepartmentStats()` slices only 6 of 11 departments and returns `85.0%` for departments with `0` students.
6. **Inconsistent Leave Counting**:
   - `leave_counts_as_present` is respected only in `calculateStudentAttendance()`, while session/subject/daily turnout percentages across 7 other files hardcode `present / total`.
7. **UTC vs. Local Date Drift**:
   - `new Date().toISOString().split('T')[0]` uses UTC date while `new Date().getDay()` uses local timezone (`+05:30` IST), causing a 5.5-hour daily mismatch window (`00:00–05:30 IST`).

### 4.3 Reusable vs. Duplicated Components
- **Well-Reused Components**: `Badge.tsx` (used in 18 files), `Modal.tsx` (used in 11 files), `AttendanceTrendChart.tsx` (used in Admin & Teacher overviews).
- **Major Duplications Requiring Extraction**:
  1. **Attendance Roster Table & Status Segmented Control**: Duplicated between `QuickAttendanceModal.tsx` (`lines 282-357`) and `TeacherMarkAttendancePage.tsx` (`lines 397-504`).
  2. **Session History & Roster Inspection Modal**: Nearly identical session table + `"Inspect/View Roster"` modal duplicated between `AdminAttendanceMasterPage.tsx` (`lines 114-289`) and `TeacherHistoryPage.tsx` (`lines 88-240`).
  3. **Institutional Hero Banner**: Dark `#0f172a` banner with `<School>` icon and hardcoded persona text duplicated across `AdminOverviewPage.tsx`, `TeacherOverviewPage.tsx`, and `StudentOverviewPage.tsx`.
  4. **Subject Creation Modal**: Duplicated between `AdminSubjectsPage.tsx` (complete) and `AdminAcademicsPage.tsx` (incomplete/hardcoded defaults).
  5. **Day-of-Week Selector & `currentDayName` Calculation**: Copy-pasted across `TeacherOverviewPage.tsx`, `TeacherTimetablePage.tsx`, and `StudentTimetablePage.tsx`.

### 4.4 UI/UX, Styling & Mobile Responsiveness Issues
1. **Invalid Tailwind CSS v3 Utilities**:
   - `shadow-xs` is used **23 times** across `QuickAttendanceModal`, `TeacherOverviewPage`, `TeacherTimetablePage`, and `StudentOverviewPage`, and `py-0.2` is used twice (`Sidebar.tsx:191`, `TeacherTimetablePage.tsx:108`). Neither exists in Tailwind CSS `v3.4.19`—they silently generate zero CSS.
2. **Hardcoded Persona Identity in Dashboards & Header**:
   - Creating a new teacher or student and logging in as them still shows `"Prof. Sandhya S."`, `"Department of Computer Science & Engineering"`, `"5th Semester, Section A"`, or `"Student (1AM22CS089)"` in banners and switchers.
3. **Mobile Table Overflow & Touch Inaccessibility**:
   - `TeacherMarkAttendancePage.tsx:397` and all 3 tables in `AdminAcademicsPage.tsx:171,204,238` lack `overflow-x-auto`, causing horizontal page blowouts on `<640px` viewports.
   - `AdminTimetablePage.tsx:152` hides the slot delete `<Trash2>` button behind `opacity-0 group-hover:opacity-100`, making slot deletion inaccessible on mobile/tablet touchscreens.
4. **Broken Print Layout (`window.print()`)**:
   - `AdminReportsPage`, `TeacherReportsPage`, and `StudentHistoryPage` expose `"Print"` buttons, and `src/index.css:30-41` defines `.no-print`. However, neither `Sidebar.tsx` nor `Header.tsx` has `.no-print`, and `App.tsx:147` locks the viewport to `flex h-screen overflow-hidden`—so printing outputs the dark sidebar and truncates reports to the visible scroll area.
5. **Accessibility Gaps**:
   - `Modal.tsx` lacks `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and Tab focus trapping; form labels are not linked via `htmlFor`/`id`; external Unsplash avatar `<img>` tags have no fallback initials if offline or blocked.

### 4.5 Performance & Maintainability
- **Bundle Bloat**: `1,050.97 kB` single JS chunk (`seedData.ts` alone is ~75 kB of static TS objects bundled into main chunk; `recharts` + all 24 pages eagerly loaded before login).
- **Unmemoized Render-Loop Queries**: `db.get*()` clones arrays via spread (`[...this.state.x]`) and executes nested `.filter()` / `.find()` joins inside component bodies without `useMemo` or indexed lookup maps.
- **Installed Unused Packages & Dead Files**:
  - Unused packages in `package.json`: `clsx`, `tailwind-merge`, `@supabase/supabase-js` (effectively unused).
  - Dead files: `src/App.css`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`, `public/favicon.svg`, and unrouted `src/pages/admin/AdminActivitiesPage.tsx`.
