import { useEffect, useState } from 'react';
import { db } from '../../services/db/database';
import { getTodayIsoDate } from '../../lib/date';
import { demoMode } from '../../services/supabaseClient';
import { portalRpc } from '../../services/db/portalData';
import { inactive, type AgendaEntry } from '../timetable/scheduling/calendar';
import { useScheduleData } from '../timetable/scheduling/scheduleData';

export function usePendingSlots(date: string) {
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const result = useScheduleData(
    () =>
      !demoMode && date && date <= getTodayIsoDate()
        ? portalRpc<AgendaEntry[]>('schedule_agenda', {
            first_day: date,
            last_day: date,
          })
        : Promise.resolve([]),
    date,
  );
  if (demoMode)
    return {
      rows: pendingSlots(date).map((slot) => ({
        id: slot.id,
        time: slot.start_time,
        title: slot.subject?.code,
        section: slot.academic_class?.name,
        teacher: slot.teacher_name || slot.teacher?.user.name,
      })),
    };
  const marked = new Set(db.getRecords().map((record) => record.session_id));
  const sessions = db
    .getSessions({ date })
    .filter((session) => marked.has(session.id));
  return {
    error: result?.error,
    loading: !result,
    rows: (result?.data || [])
      .filter(
        (entry) =>
          entry.code &&
          !inactive(entry) &&
          entry.utc_end &&
          Date.parse(entry.utc_end) <= clock &&
          !sessions.some(
            (session) =>
              session.timetable_entry_id === entry.entry_id ||
              (session.class_id === entry.class_id &&
                session.subject_id === entry.subject_id &&
                session.teacher_id === entry.teacher_id &&
                session.start_time.slice(0, 5) === entry.starts?.slice(0, 5)),
          ),
      )
      .map((entry) => ({
        id: entry.entry_id,
        time: entry.starts || '',
        title: entry.code,
        section: entry.section,
        teacher: entry.teacher,
      })),
  };
}

export function pendingSlots(date: string) {
  const { years, holidays } = db.getCalendar();
  const today = getTodayIsoDate();
  if (!date || date > today || holidays.some((h) => h.day === date)) return [];
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
