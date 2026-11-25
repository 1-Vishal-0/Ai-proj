export type CalendarView = 'day' | 'week' | 'month';
export type AgendaEntry = {
  entry_id: string;
  day: string;
  title: string;
  code: string | null;
  section: string | null;
  teacher: string | null;
  place: string | null;
  starts: string | null;
  ends: string | null;
  kind: string;
  state: string;
  own: boolean;
  utc_start: string | null;
  utc_end: string | null;
  class_id: string | null;
  subject_id: string | null;
  teacher_id: string | null;
};

export function shiftDay(day: string, amount: number) {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function calendarDays(day: string, view: CalendarView) {
  if (view === 'day') return [day];
  const anchor = view === 'month' ? day.slice(0, 7) + '-01' : day;
  const weekday = new Date(anchor + 'T12:00:00Z').getUTCDay();
  const monday = shiftDay(anchor, -((weekday + 6) % 7));
  return Array.from({ length: view === 'week' ? 7 : 42 }, (_, index) =>
    shiftDay(monday, index),
  );
}

export function dateLabel(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(day + 'T12:00:00Z').toLocaleDateString(undefined, {
    ...options,
    timeZone: 'UTC',
  });
}

export const inactive = (entry: AgendaEntry) =>
  ['cancelled', 'moved', 'reassigned'].includes(entry.state);
export const stateName: Record<string, string> = {
  scheduled: 'Scheduled',
  cancelled: 'Cancelled',
  moved: 'Moved to another time',
  reassigned: 'Substitute assigned',
  rescheduled: 'Rescheduled',
  substituted: 'Substitute lecture',
};
export const kindName: Record<string, string> = {
  lecture: 'Lecture',
  lab: 'Laboratory',
  tutorial: 'Tutorial',
  elective: 'Elective',
  special: 'Special session',
  holiday: 'Holiday',
  exam: 'Examination',
  exam_window: 'Examination window',
  term_milestone: 'Academic milestone',
  event: 'Academic event',
};

function escapeCalendar(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/[;,]/g, (char) => '\\' + char);
}
function compact(date: string) {
  return new Date(date)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}
function fold(line: string) {
  const parts: string[] = [];
  const encoder = new TextEncoder();
  let part = '',
    bytes = 0;
  for (const char of line) {
    const length = encoder.encode(char).length;
    if (bytes + length > 75) {
      parts.push(part);
      part = ' ';
      bytes = 1;
    }
    part += char;
    bytes += length;
  }
  return [...parts, part].join('\r\n');
}
export function exportCalendar(entries: AgendaEntry[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Academic Portal//Timetable//EN',
    'CALSCALE:GREGORIAN',
  ];
  const stamp = compact(new Date().toISOString());
  for (const entry of entries) {
    if (inactive(entry)) continue;
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + entry.entry_id + '-' + entry.day + '@' + location.hostname,
      'DTSTAMP:' + stamp,
      'SUMMARY:' + escapeCalendar(entry.title),
      'DESCRIPTION:' +
        escapeCalendar(
          [entry.code, entry.section, entry.teacher, stateName[entry.state]]
            .filter(Boolean)
            .join(' · '),
        ),
    );
    if (entry.place) lines.push('LOCATION:' + escapeCalendar(entry.place));
    if (entry.utc_start && entry.utc_end)
      lines.push(
        'DTSTART:' + compact(entry.utc_start),
        'DTEND:' + compact(entry.utc_end),
      );
    else
      lines.push(
        'DTSTART;VALUE=DATE:' + entry.day.replaceAll('-', ''),
        'DTEND;VALUE=DATE:' + shiftDay(entry.day, 1).replaceAll('-', ''),
      );
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  const link = document.createElement('a');
  const url = URL.createObjectURL(
    new Blob([lines.map(fold).join('\r\n') + '\r\n'], {
      type: 'text/calendar;charset=utf-8',
    }),
  );
  link.href = url;
  link.download = 'academic-timetable.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
