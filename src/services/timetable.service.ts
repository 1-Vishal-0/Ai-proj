import { demoMode, requireSupabase } from './supabaseClient';
import { insertPortal, portalRpc, writePortal, getPortalInstitutionId } from './db/portalData';
import { db } from './db/database';
import type {
  DayOfWeek,
  EnrichedTimetableEntry,
  TimetableChangeLog,
  TimetableEntry,
  User,
} from '../types';

export const timetableService = {
  getEnrichedTimetable(teacherId?: string): EnrichedTimetableEntry[] {
    return db.getEnrichedTimetable(teacherId);
  },

  getEnrichedTimetableForClass(classId: string): EnrichedTimetableEntry[] {
    return db.getEnrichedTimetable().filter((t) => t.class_id === classId);
  },

  async createEntry(entry: Omit<TimetableEntry, 'id'>, actorId?: string): Promise<void> {
    if (!demoMode) {
      const { class_id, subject_id, teacher_id, academic_year, classroom, day_of_week, period_number, start_time, end_time } = entry;
      await insertPortal('timetable_slots', { class_id, subject_id, teacher_id, academic_year, classroom, day_of_week,
        period_number, start_time, end_time, institution_id: getPortalInstitutionId() });
      return;
    }
    db.createTimetableEntry(entry, actorId);
  },

  async deleteEntry(id: string, actorId?: string): Promise<void> {
    if (!demoMode) return writePortal(async () => {
      const { data, error } = await requireSupabase().from('timetable_slots').delete().eq('id', id).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Timetable slot unavailable.');
    });
    db.deleteTimetableEntry(id, actorId);
  },

  async rescheduleSlot(
    params: {
      entryId: string;
      newDay: DayOfWeek;
      newPeriod: number;
      newStartTime: string;
      newEndTime: string;
      newClassroom: string;
      reason: string;
    },
    actorUser: User
  ): Promise<void> {
    if (!demoMode) {
      await writePortal(() => portalRpc('portal_reschedule_slot', {
        slot_key: params.entryId, new_day: params.newDay, new_period: params.newPeriod, starts: params.newStartTime,
        ends: params.newEndTime, room: params.newClassroom, reason_text: params.reason,
      }));
      return;
    }
    db.rescheduleTimetableSlot(params, actorUser);
  },

  getChangeLogs(teacherId?: string): TimetableChangeLog[] {
    return db.getTimetableChangeLogs(teacherId);
  },
};
