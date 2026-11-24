export type SessionType = 'lecture' | 'lab' | 'tutorial';

export interface AttendanceSession {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  date: string;
  start_time: string;
  end_time: string;
  session_type: SessionType;
  timetable_entry_id?: string | null;
  code?: string | null;
  code_expires_at?: string | null;
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
  reviewed_by?: string | null;
  reviewed_by_profile_id?: string | null;
  review_notes?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface AttendanceRosterEntry {
  status: AttendanceStatus;
  remarks: string;
}
