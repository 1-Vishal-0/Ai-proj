export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string; // e.g., 'CSE', 'AIML', 'ECE'
  hod_name?: string;
  student_intake?: number;
  sections_count?: number;
  is_active: boolean;
  description?: string;
}

export interface Programme {
  id: string;
  name: string; // e.g., 'B.E. Computer Science and Engineering'
  code: string; // e.g., 'CSE'
  department_id: string;
  degree_level: 'UG' | 'PG';
  duration_years: number;
  is_active: boolean;
}

export interface VTUScheme {
  id: string;
  name: string; // e.g., 'VTU 2022 Scheme', 'VTU 2021 Scheme'
  code: string; // e.g., '2022', '2021'
  effective_from_year: number;
  total_credits: number;
  is_active: boolean;
  syllabus_url?: string;
  description?: string;
}

export interface AcademicClass {
  id: string;
  name: string; // e.g., 'CSE-5th Sem-Sec A'
  department_id: string;
  programme_id: string;
  vtu_scheme_id: string;
  semester: number; // 1 to 8
  section: string; // 'A', 'B', 'C'
  academic_year: string; // e.g., '2026-2027'
  admission_batch: string; // e.g., '2022-2026'
}

export type SubjectCategory =
  | 'BSC' // Basic Science Course
  | 'ESC' // Engineering Science Course
  | 'PCC' // Professional Core Course
  | 'PEC' // Professional Elective Course
  | 'OEC' // Open Elective Course
  | 'HSMC' // Humanities and Social Sciences
  | 'AEC' // Ability Enhancement Course
  | 'SEC' // Skill Enhancement Course
  | 'PCCL' // Practical / Laboratory Course
  | 'PROJ' // Project Work
  | 'INT' // Internship
  | 'MC'; // Mandatory Course

export type CourseType = 'theory' | 'practical' | 'integrated';

export interface Subject {
  id: string;
  code: string; // Official VTU subject code e.g., 'BCS501', 'BCS502', 'BCSL504', 'BRMK557'
  name: string; // e.g., 'Software Engineering & Project Management'
  abbreviation: string; // e.g., 'SEPM'
  department_id: string;
  programme_id?: string;
  vtu_scheme_id: string;
  semester: number;
  category: SubjectCategory;
  course_type: CourseType;
  credits: number;
  teaching_hours: number; // e.g. 40
  cie_marks: number; // 50
  see_marks: number; // 50
  syllabus_doc_ref?: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  user_id: string;
  usn: string; // VTU University Seat Number e.g., '1AM22CS089'
  roll_number: string; // Kept as alias to USN
  class_id: string;
  department_id: string;
  programme_id: string;
  vtu_scheme_id: string;
  admission_year: number;
  admission_batch: string; // e.g., '2022-2026'
  current_semester: number;
  section: string;
  guardian_email?: string;
  guardian_phone?: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  employee_id: string; // Unique employee ID e.g., 'AMCEC-CSE-028'
  department_id: string;
  designation: string; // e.g., 'Associate Professor', 'Assistant Professor'
  qualification: string; // e.g., 'M.Tech, Ph.D. in Computer Science'
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  academic_year: string;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface TimetableEntry {
  id: string;
  academic_year: string;
  department_id: string;
  semester: number;
  section: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  classroom: string; // e.g. 'LH-304, CSE Block'
  day_of_week: DayOfWeek;
  period_number: number; // 1 to 7
  start_time: string; // '09:00'
  end_time: string; // '10:00'
}

export type SessionType = 'lecture' | 'lab' | 'tutorial';

export interface AttendanceSession {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  session_type: SessionType;
  timetable_entry_id?: string | null;
  code?: string | null; // e.g., '849201'
  code_expires_at?: string | null; // ISO timestamp
  is_code_active: boolean;
  created_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave';
export type MarkedBy = 'teacher' | 'code' | 'correction';

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  marked_by: MarkedBy;
  remarks?: string;
  updated_at: string;
}

export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface CorrectionRequest {
  id: string;
  student_id: string;
  session_id: string;
  subject_id: string;
  date: string;
  current_status: AttendanceStatus;
  requested_status: AttendanceStatus;
  reason: string;
  status: CorrectionStatus;
  reviewed_by?: string | null; // Teacher ID
  review_notes?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface AcademicActivity {
  id: string;
  name: string; // e.g., 'National Service Scheme (NSS)', 'Social Connect and Responsibility'
  course_code: string; // e.g., 'BSCK307'
  semester: number;
  department_id: string;
  academic_year: string;
  faculty_coordinator: string;
  credits?: number;
  status: 'active' | 'completed' | 'ongoing';
  description?: string;
}

export interface TimetableChangeLog {
  id: string;
  timetable_entry_id: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  subject_code: string;
  subject_name: string;
  old_day: DayOfWeek;
  old_period: number;
  old_classroom: string;
  new_day: DayOfWeek;
  new_period: number;
  new_classroom: string;
  change_type: 'reschedule' | 'classroom_change' | 'timing_change' | 'swap';
  reason: string;
  timestamp: string;
  status: 'applied' | 'pending_approval' | 'rejected';
}

export type NotificationType = 'info' | 'warning' | 'success' | 'alert';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  ip_address?: string;
  timestamp: string;
}

export interface InstitutionSettings {
  id: string;
  institution_name: string;
  short_name: string;
  established_year: number;
  location: string;
  affiliation: string;
  management: string;
  academic_term: string;
  current_academic_year: string;
  threshold_percentage: number; // default 75
  warning_threshold: number; // default 80
  auto_alerts_enabled: boolean;
  code_duration_minutes_default: number;
  leave_counts_as_present: boolean; // configurable attendance counting rule
}

// Joined / View models for frontend ease
export interface EnrichedStudent extends Student {
  user: User;
  department?: Department;
  programme?: Programme;
  vtu_scheme?: VTUScheme;
  academic_class?: AcademicClass;
}

export interface EnrichedTeacher extends Teacher {
  user: User;
  department?: Department;
}

export interface EnrichedAttendanceRecord extends AttendanceRecord {
  student: EnrichedStudent;
  session?: AttendanceSession;
}

export interface EnrichedCorrectionRequest extends CorrectionRequest {
  student: EnrichedStudent;
  subject?: Subject;
  session?: AttendanceSession;
  reviewer?: EnrichedTeacher;
}

export interface EnrichedTimetableEntry extends TimetableEntry {
  subject?: Subject;
  teacher?: EnrichedTeacher;
  academic_class?: AcademicClass;
}
