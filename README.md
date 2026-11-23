# Smart Attendance & Teacher Management Portal

An institutional academic attendance and faculty management platform designed for universities and colleges. The portal reduces teachers' administrative burden, eliminates proxy attendance, enforces strict attendance thresholds, provides real-time analytics, and automates institutional report generation.

---

## Key Features & Capabilities

### 1. Multi-Role Institutional Access Control
- **Admin / HOD Portal**:
  - Global institutional overview and daily turnout metrics.
  - Student and Faculty directory with full CRUD operations and enrollments.
  - Course curriculum management (Departments, Classes, Subjects).
  - Teacher course allocations (`TeacherAssignments`).
  - Master attendance sessions audit across the institution.
  - Attendance threshold management (e.g. 75% exam requirement, 80% warning threshold).
  - Full system audit trail tracking every modification with IP address and timestamp.
- **Faculty / Teacher Portal**:
  - Assigned courses and classes overview.
  - Interactive attendance marking sheet with individual and bulk actions (All Present, All Absent, Invert).
  - **Smart Proxy Attendance Prevention**: Generate time-limited 6-digit attendance codes with countdown timers and live student check-in monitor.
  - Low-attendance defalcation tracker with formal advisory notice dispatch.
  - Attendance correction requests review with 1-click Approve / Reject actions.
  - Course-level report generation and CSV export.
- **Student Portal**:
  - Real-time overall and subject-wise attendance percentages.
  - Visual standing indicators (Safe, Warning, Critical Defalcation).
  - Smart calculation of exact lectures needed to reach/maintain the 75% threshold.
  - In-class live code check-in widget.
  - Full personal lecture attendance log.
  - Attendance correction request submission workflow.
  - Academic notifications and shortage alerts.

### 2. Smart Proxy Attendance Prevention
- Teachers generate dynamic, time-limited 6-digit attendance codes (e.g., `748 392`).
- Linked to a specific class, subject, and active lecture session.
- Configurable validity timer (5, 10, 15, 30 minutes) with automatic self-expiration.
- Enforces class enrollment verification (only students in that class can submit).
- Strict duplicate attendance prevention (rejects duplicate submissions).
- Real-time live check-in monitor showing students checking in live on the faculty screen.

### 3. Analytics & Automation
- Interactive attendance trend charts powered by Recharts (7-day daily turnout, department comparisons, status breakdown).
- Automated calculation of attendance shortages with defalcation warnings.
- Real-time notification system dispatching alerts for low attendance, code check-in confirmations, and correction updates.

### 4. Report Generation & CSV Export
- Student-wise attendance reports.
- Class-wise turnout summaries.
- Subject-wise lecture reports.
- Low-attendance defalcation shortage lists.
- RFC 4180-compliant CSV export for Excel and Google Sheets download.
- Printable report views.

---

## Demo Accounts

For immediate evaluation, the portal includes pre-configured demo accounts accessible via the **Quick Role Switcher** in the top navigation bar or sidebar:

| Role | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin / HOD** | Dr. Arthur Vance | `admin@niet.edu` | `password123` | Institutional dashboard, audit logs, curriculum |
| **Faculty Teacher** | Prof. Priya Sharma | `prof.sharma@niet.edu` | `password123` | Mark attendance, generate proxy codes, review corrections |
| **Student (Regular)** | Arjun Kumar (`CS2024-001`) | `arjun.kumar@student.niet.edu` | `password123` | 80% attendance, check-in, correction requests |
| **Student (Shortage)** | Devin Thorne (`CS2024-005`) | `devin.thorne@student.niet.edu` | `password123` | 20% attendance, exam debarment alerts |

---

## Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Database Engine**:
  - **Local Relational DB Engine**: Built-in reactive store with localStorage persistence, foreign keys, unique composite constraints `(session_id, student_id)`, transactional batching, and full initial college dataset.
  - **PostgreSQL / Supabase Ready**: Production-grade schema with DDL, constraints, indexes, and triggers located in `supabase/schema.sql`.

---

## Getting Started

### 1. Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Production Build & Preview
```bash
npm run build
npm run preview
```
Open [http://localhost:4173](http://localhost:4173) in your browser.

### 3. Optional Supabase Configuration
Create a `.env` file from `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
Run `supabase/schema.sql` in your Supabase SQL Editor.
