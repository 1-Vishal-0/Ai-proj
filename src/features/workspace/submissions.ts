import { db } from '../../services/db/database';
import { getTodayIsoDate } from '../../lib/date';

export function pendingSlots(date: string) {
  const { years, holidays } = db.getCalendar();
  const today = getTodayIsoDate();
  if (!date || date > today || holidays.some((h) => h.day === date))
    return [];
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));
  const localTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: db.getSettings().time_zone || 'Asia/Kolkata',
  }).format(new Date());
  const sessions = db.getSessions({ date });
  const submitted = new Set(db.getRecords().map((r) => r.session_id));
  return db
    .getEnrichedTimetable()
    .filter(
      (slot) =>
        slot.day_of_week === weekday &&
        (date < today || slot.end_time.slice(0, 5) <= localTime) &&
        years.some(
          (y) =>
            y.label === slot.academic_year &&
            y.starts_on <= date &&
            date <= y.ends_on,
        ) &&
        !sessions.some(
          (s) =>
            submitted.has(s.id) &&
            (s.timetable_entry_id === slot.id ||
              (s.class_id === slot.class_id &&
                s.teacher_id === slot.teacher_id &&
                s.subject_id === slot.subject_id &&
                s.start_time.slice(0, 5) === slot.start_time.slice(0, 5))),
        ),
    );
}
