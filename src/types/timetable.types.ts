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
  teacher_name?: string;
  classroom: string;
  day_of_week: DayOfWeek;
  period_number: number;
  start_time: string;
  end_time: string;
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

