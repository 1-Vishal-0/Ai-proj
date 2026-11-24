import { demoMode } from './supabaseClient';
import { portalRpc, writePortal } from './db/portalData';
import { db } from './db/database';
import { getTodayIsoDate } from '../lib/date';
import type { EnrichedStudent, User } from '../types';

export const analyticsService = {
  getAttendanceTrend(days: number = 7) {
    return db.getAttendanceTrend(days, getTodayIsoDate());
  },

  getDepartmentStats() {
    return db.getDepartmentStats();
  },

  getLowAttendanceStudents(threshold?: number) {
    return db.getLowAttendanceStudents(threshold);
  },

  async dispatchLowAttendanceAdvisory(
    student: EnrichedStudent,
    title: string,
    message: string,
    actorUser: User
  ): Promise<void> {
    if (!demoMode) return writePortal(() => portalRpc('portal_send_advisory', { student_key: student.id, subject_line: title, body: message }));
    db.createNotification({
      user_id: student.user_id,
      title,
      message,
      type: 'alert',
      link: '/student/overview',
    });

    db.logAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: 'teacher',
      action: 'DISPATCH_LOW_ATTENDANCE_WARNING',
      entity: 'Student',
      entity_id: student.id,
      details: `Dispatched formal low attendance warning to ${student.user.name} (${student.roll_number})`,
    });
  },
};
