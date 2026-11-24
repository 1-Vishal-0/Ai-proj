export interface Department {
  id: string;
  name: string;
  code: string;
  hod_name?: string;
  student_intake?: number;
  sections_count?: number;
  is_active: boolean;
  description?: string;
}

export interface Programme {
  id: string;
  name: string;
  code: string;
  department_id: string;
  degree_level: 'UG' | 'PG';
  duration_years: number;
  is_active: boolean;
}

export interface VTUScheme {
  id: string;
  name: string;
  code: string;
  effective_from_year: number;
  total_credits: number;
  is_active: boolean;
  syllabus_url?: string;
  description?: string;
}

export interface AcademicClass {
  id: string;
  name: string;
  department_id: string;
  programme_id: string;
  vtu_scheme_id: string;
  semester: number;
  section: string;
  academic_year: string;
  admission_batch: string;
}

export type SubjectCategory =
  | 'BSC'
  | 'ESC'
  | 'PCC'
  | 'PEC'
  | 'OEC'
  | 'HSMC'
  | 'AEC'
  | 'SEC'
  | 'PCCL'
  | 'PROJ'
  | 'INT'
  | 'MC';

export type CourseType = 'theory' | 'practical' | 'integrated';

export interface Subject {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  department_id: string;
  programme_id?: string;
  vtu_scheme_id: string;
  semester: number;
  category: SubjectCategory;
  course_type: CourseType;
  credits: number;
  teaching_hours: number;
  cie_marks: number;
  see_marks: number;
  syllabus_doc_ref?: string;
  is_active: boolean;
}

export interface Student {
  id: string;
  user_id: string;
  usn: string;
  roll_number: string;
  class_id: string;
  department_id: string;
  programme_id: string;
  vtu_scheme_id: string;
  admission_year: number;
  admission_batch: string;
  current_semester: number;
  section: string;
  guardian_email?: string;
  guardian_phone?: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  employee_id: string;
  department_id: string;
  designation: string;
  qualification: string;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  academic_year: string;
}

export interface AcademicActivity {
  id: string;
  name: string;
  course_code: string;
  semester: number;
  department_id: string;
  academic_year: string;
  faculty_coordinator: string;
  credits?: number;
  status: 'active' | 'completed' | 'ongoing';
  description?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  enrolled_from: string;
  enrolled_until: string | null;
}
