import type { User } from './auth.types';
import type {
  Department,
  Programme,
  VTUScheme,
  AcademicClass,
  Subject,
  Student,
  Teacher,
} from './academics.types';
import type {
  AttendanceSession,
  AttendanceRecord,
  CorrectionRequest,
} from './attendance.types';
import type { TimetableEntry } from './timetable.types';

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
