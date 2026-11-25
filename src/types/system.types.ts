import type { UserRole } from './auth.types';

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
  threshold_percentage: number;
  warning_threshold: number;
  auto_alerts_enabled: boolean;
<<<<<<< HEAD
  unmarked_policy?: 'absent' | 'require_mark';
=======
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
  code_duration_minutes_default: number;
  leave_counts_as_present: boolean;
  hod_roster_management?: boolean;
  notify_timetable?: boolean;
  time_zone?: string;
}
