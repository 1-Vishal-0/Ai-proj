import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  MapPin,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { useAuth } from '../../../hooks/useAuth';
import { getTodayIsoDate } from '../../../lib/date';
import { portalRpc } from '../../../services/db/portalData';
import { Field, Panel } from '../../workspace/shared';
import { useAction, useWorkspace } from '../../workspace/useWorkspace';
import {
  calendarDays,
  dateLabel,
  exportCalendar,
  inactive,
  kindName,
  shiftDay,
  stateName,
  type AgendaEntry,
  type CalendarView,
} from './calendar';
import { fetchRows, useScheduleData, type Request } from './scheduleData';
import { VersionEditor } from './VersionEditor';
import './schedule.css';

const tones = [
  '#6366f1',
  '#0e7490',
  '#8b5cf6',
  '#047857',
  '#b45309',
  '#be185d',
];
const roomStyle = (code: string) =>
  ([...code].reduce((total, c) => total * 31 + c.charCodeAt(0), 0) >>> 0) %
  tones.length;
const statusText: Record<string, string> = {
  cancel: 'Cancellation',
  move: 'Reschedule',
  substitute: 'Substitute faculty',
};

function RequestForm({
  entry,
  onSave,
}: {
  entry: AgendaEntry;
  onSave: () => void;
}) {
  const [operation, setOperation] = useState('cancel');
  const action = useAction();
  const candidates = useScheduleData(
    () =>
      operation === 'substitute'
        ? portalRpc<{ id: string; name: string }[]>('schedule_substitutes', {
            source_slot: entry.entry_id,
          })
        : Promise.resolve([]),
    entry.entry_id + operation,
  );
  return (
    <Panel title={'Request a change · ' + entry.title}>
      <p className="workspace-note mb-3">
        {entry.day} · {entry.starts?.slice(0, 5)}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          void action.run(async () => {
            await portalRpc('schedule_request', {
              source_slot: entry.entry_id,
              source_day: entry.day,
              change_type: operation,
              reason_text: data.get('reason'),
              target_day: data.get('day') || null,
              target_start: data.get('starts') || null,
              target_end: data.get('ends') || null,
              target_room: data.get('room') || null,
              substitute_id: data.get('teacher') || null,
            });
            onSave();
          }, 'Request sent for approval.');
        }}
      >
        <Field label="Change type">
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
          >
            {Object.entries(statusText).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {operation === 'move' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="New date">
              <input
                name="day"
                type="date"
                min={getTodayIsoDate()}
                defaultValue={entry.day}
                required
              />
            </Field>
            <Field label="New classroom">
              <input
                name="room"
                maxLength={80}
                defaultValue={entry.place || ''}
                required
              />
            </Field>
            <Field label="New start">
              <input
                name="starts"
                type="time"
                defaultValue={entry.starts?.slice(0, 5)}
                required
              />
            </Field>
            <Field label="New end">
              <input
                name="ends"
                type="time"
                defaultValue={entry.ends?.slice(0, 5)}
                required
              />
            </Field>
          </div>
        )}
        {operation === 'substitute' && (
          <>
            <Field label="Substitute faculty">
              <select name="teacher" required>
                <option value="">Select eligible faculty</option>
                {candidates?.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            {candidates?.data?.length === 0 && (
              <p>No other faculty are assigned to this subject and section.</p>
            )}
            {candidates?.error && <p role="alert">{candidates.error}</p>}
          </>
        )}
        <Field label="Reason">
          <textarea name="reason" maxLength={1000} required />
        </Field>
        <Button type="submit" disabled={action.busy}>
          Send request
        </Button>
      </form>
      {action.feedback}
    </Panel>
  );
}

function Requests({
  admin,
  revision,
  refresh,
}: {
  admin: boolean;
  revision: number;
  refresh: () => void;
}) {
  const action = useAction();
  const requests = useScheduleData(
    () => fetchRows<Request>('schedule_requests'),
    String(revision),
  );
  return (
    <Panel title={admin ? 'Review faculty requests' : 'My timetable requests'}>
      {requests?.error ? (
        <p role="alert">{requests.error}</p>
      ) : !requests ? (
        <p role="status">Loading requests…</p>
      ) : requests.data?.length ? (
        <div className="grid gap-3">
          {[...requests.data]
            .sort(
              (a, b) =>
                Number(b.status === 'pending') -
                  Number(a.status === 'pending') || b.day.localeCompare(a.day),
            )
            .map((r) => (
              <article
                key={r.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <strong>
                  {statusText[r.operation]} · {r.day}
                </strong>
                <p className="workspace-note capitalize">{r.status}</p>
                <p className="my-2 whitespace-pre-wrap break-words">
                  {r.reason}
                </p>
                {r.new_day && (
                  <p className="workspace-note">
                    Requested for {r.new_day} at {r.starts?.slice(0, 5)}–
                    {r.ends?.slice(0, 5)} · {r.classroom}
                  </p>
                )}
                {admin && r.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    {[true, false].map((approve) => (
                      <Button
                        disabled={action.busy}
                        key={String(approve)}
                        variant={approve ? 'primary' : 'outline'}
                        onClick={() =>
                          action.run(
                            async () => {
                              await portalRpc('schedule_review', {
                                request_id: r.id,
                                approve,
                              });
                              refresh();
                            },
                            approve ? 'Change approved.' : 'Request rejected.',
                          )
                        }
                      >
                        {approve ? 'Approve' : 'Reject'}
                      </Button>
                    ))}
                  </div>
                )}
              </article>
            ))}
        </div>
      ) : (
        <p>No requests yet.</p>
      )}
      {action.feedback}
    </Panel>
  );
}

function Events({
  date,
  refresh,
  entries,
}: {
  date: string;
  refresh: () => void;
  entries: AgendaEntry[];
}) {
  const [kind, setKind] = useState('holiday');
  const [editing, setEditing] = useState<AgendaEntry>();
  const action = useAction();
  return (
    <Panel title="Holidays, examinations and events">
      <form
        key={editing?.entry_id || 'new'}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget,
            data = new FormData(form);
          void action.run(
            async () => {
              await portalRpc('schedule_event', {
                event_id: editing?.entry_id || null,
                event_day: data.get('day'),
                title_text: data.get('title'),
                event_kind: kind,
                begins: data.get('begins') || null,
                finishes: data.get('finishes') || null,
                location_text: data.get('place') || '',
              });
              form.reset();
              setEditing(undefined);
              refresh();
            },
            editing ? 'Calendar entry updated.' : 'Calendar entry added.',
          );
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Event type">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {(editing ? ['exam', 'event'] : ['holiday', 'exam', 'event']).map(
                (k) => (
                  <option key={k} value={k}>
                    {kindName[k]}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Calendar date">
            <input
              name="day"
              type="date"
              min={getTodayIsoDate()}
              required
              defaultValue={editing?.day || date}
            />
          </Field>
        </div>
        <Field label="Event title">
          <input
            name="title"
            maxLength={150}
            required
            defaultValue={editing?.title}
          />
        </Field>
        {kind !== 'holiday' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Event start">
                <input
                  name="begins"
                  type="time"
                  required
                  defaultValue={editing?.starts?.slice(0, 5)}
                />
              </Field>
              <Field label="Event end">
                <input
                  name="finishes"
                  type="time"
                  required
                  defaultValue={editing?.ends?.slice(0, 5)}
                />
              </Field>
            </div>
            <Field label="Location">
              <input
                name="place"
                maxLength={80}
                defaultValue={editing?.place || ''}
              />
            </Field>
          </>
        )}
        <Button type="submit" disabled={action.busy}>
          {editing ? 'Save calendar entry' : 'Add to calendar'}
        </Button>
        {editing && (
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setEditing(undefined);
              setKind('holiday');
            }}
          >
            Stop editing
          </Button>
        )}
      </form>
      <div className="mt-4 grid gap-2">
        {entries
          .filter((e) => ['holiday', 'exam', 'event'].includes(e.kind))
          .map((e) => (
            <div
              key={e.entry_id}
              className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"
            >
              <span>
                {e.day} · {e.title}
              </span>
              {e.day >= getTodayIsoDate() && e.kind !== 'holiday' && (
                <Button
                  variant="outline"
                  disabled={action.busy}
                  onClick={() => {
                    setEditing(e);
                    setKind(e.kind);
                  }}
                >
                  Edit event
                </Button>
              )}
              {e.day >= getTodayIsoDate() && (
                <Button
                  variant="outline"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      await portalRpc('schedule_event', {
                        event_id: e.entry_id,
                        event_day: e.day,
                        title_text: e.title,
                        event_kind: e.kind,
                        remove: true,
                      });
                      refresh();
                    }, 'Calendar entry removed.')
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
      </div>
      {action.feedback}
    </Panel>
  );
}

export default function AcademicSchedulePage() {
  const { currentUser } = useAuth();
  const { admin, settings } = useWorkspace();
  const navigation = useNavigate();
  const teacher = currentUser?.role === 'teacher';
  const student = currentUser?.role === 'student';
  const [view, setView] = useState<CalendarView>('week');
  const [day, setDay] = useState(getTodayIsoDate);
  const [mode, setMode] = useState('Calendar');
  const [selected, setSelected] = useState<AgendaEntry>();
  const [request, setRequest] = useState<AgendaEntry>();
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const action = useAction();
  const days = calendarDays(day, view),
    today = getTodayIsoDate();
  const refresh = () => setRevision((n) => n + 1);
  const schedule = useScheduleData(
    () =>
      portalRpc<AgendaEntry[]>('schedule_agenda', {
        first_day: days[0],
        last_day: days.at(-1),
      }),
    [days[0], days.at(-1), revision].join(':'),
  );
  const upcoming = useScheduleData(
    () =>
      portalRpc<AgendaEntry[]>('schedule_agenda', {
        first_day: today,
        last_day: shiftDay(today, 13),
      }),
    today + ':' + revision,
  );
  const next = upcoming?.data?.find(
    (e) =>
      e.code && !inactive(e) && e.utc_start && Date.parse(e.utc_start) > clock,
  );
  const entries = schedule?.data || [];
  const displayed = entries.filter((e) =>
    [e.title, e.code, e.teacher, e.section, e.place]
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const currentTime = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: settings.time_zone || 'Asia/Kolkata',
  }).format(clock);
  const minTime = (e: AgendaEntry) => e.starts?.slice(0, 5);
  const sections = [
    'Calendar',
    ...(admin
      ? ['Versions', 'Events', 'Requests']
      : teacher
        ? ['Requests']
        : []),
  ];
  function move(amount: number) {
    if (view !== 'month') {
      setDay(shiftDay(day, amount * (view === 'week' ? 7 : 1)));
      return;
    }
    const date = new Date(day.slice(0, 7) + '-01T12:00:00Z');
    date.setUTCMonth(date.getUTCMonth() + amount);
    setDay(date.toISOString().slice(0, 10));
  }
  function start(entry: AgendaEntry) {
    void action.run(async () => {
      const session = await portalRpc<string>('schedule_attendance', {
        source_slot: entry.entry_id,
        source_day: entry.day,
      });
      navigation('/teacher/mark?session=' + session);
    }, 'Attendance ready.');
  }
  return (
    <div className="workspace-page scheduling">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>{admin ? 'Academic timetable' : 'My timetable'}</h1>
          <p>{settings.institution_name}</p>
        </div>
        {student && (
          <Button
            variant="outline"
            disabled={!entries.length}
            onClick={() => exportCalendar(entries)}
          >
            <Download size={15} />
            Export calendar (.ics)
          </Button>
        )}
      </header>
      {sections.length > 1 && (
        <nav aria-label="Scheduling sections" className="flex flex-wrap gap-2">
          {sections.map((v) => (
            <Button
              key={v}
              aria-pressed={mode === v}
              variant={mode === v ? 'primary' : 'outline'}
              onClick={() => {
                setMode(v);
                setSelected(undefined);
                setRequest(undefined);
              }}
            >
              {v}
            </Button>
          ))}
        </nav>
      )}
      {mode === 'Calendar' && (
        <>
          {(teacher || student) && next && (
            <aside className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <Clock size={19} aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-indigo-800">
                  Upcoming lecture
                </p>
                <strong>{next.title}</strong>
                <p className="workspace-note">
                  {dateLabel(next.day, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · {minTime(next)} · {next.place}
                </p>
              </div>
            </aside>
          )}
          <Panel
            title={
              view === 'month'
                ? dateLabel(day, { month: 'long', year: 'numeric' })
                : view === 'day'
                  ? dateLabel(day, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : dateLabel(days[0], { month: 'short', day: 'numeric' }) +
                    ' – ' +
                    dateLabel(days[6], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
            }
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="outline"
                  aria-label="Previous calendar period"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="outline" onClick={() => setDay(today)}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  aria-label="Next calendar period"
                  onClick={() => move(1)}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <CalendarDays size={16} aria-hidden="true" />
                <span className="sr-only">Go to date</span>
                <input
                  type="date"
                  className="rounded border p-1.5"
                  value={day}
                  onChange={(e) => {
                    if (e.target.value) setDay(e.target.value);
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-1" aria-label="Calendar view">
                {(['day', 'week', 'month'] as const).map((v) => (
                  <Button
                    key={v}
                    aria-pressed={view === v}
                    variant={view === v ? 'primary' : 'ghost'}
                    onClick={() => setView(v)}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>
              {admin && (
                <input
                  aria-label="Filter calendar"
                  className="rounded border px-2 py-1.5 text-sm"
                  placeholder="Find a subject, section or room"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              )}
            </div>
            {!schedule ? (
              <p role="status">Loading timetable…</p>
            ) : schedule.error ? (
              <div role="alert">
                {schedule.error}{' '}
                <Button variant="outline" onClick={refresh}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className={'schedule-grid schedule-' + view}>
                {days.map((date) => {
                  const rows = displayed.filter((e) => e.day === date);
                  return (
                    <section
                      key={date}
                      className={
                        'schedule-day ' +
                        (date === today ? 'schedule-today' : '')
                      }
                      data-empty={rows.length === 0 && date !== today}
                    >
                      <button
                        className="schedule-date"
                        type="button"
                        onClick={() => {
                          setDay(date);
                          setView('day');
                        }}
                        aria-label={dateLabel(date, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      >
                        <span>{dateLabel(date, { weekday: 'short' })}</span>
                        <strong>
                          {dateLabel(date, { day: 'numeric', month: 'short' })}
                        </strong>
                      </button>
                      {date === today && (
                        <p className="schedule-now">
                          <Clock size={12} aria-hidden="true" />
                          Now · {currentTime}
                        </p>
                      )}
                      {!rows.length && (
                        <p className="schedule-empty">No events</p>
                      )}
                      {rows.map((entry) => {
                        const ongoing =
                          !inactive(entry) &&
                          entry.utc_start &&
                          entry.utc_end &&
                          Date.parse(entry.utc_start) <= clock &&
                          clock < Date.parse(entry.utc_end);
                        return (
                          <button
                            key={entry.entry_id}
                            type="button"
                            onClick={() => {
                              setSelected(entry);
                              setRequest(undefined);
                            }}
                            className={
                              'schedule-entry ' +
                              (inactive(entry) ? 'schedule-inactive' : '')
                            }
                            style={{
                              borderInlineStartColor:
                                tones[roomStyle(entry.code || entry.kind)],
                            }}
                            aria-label={
                              entry.title +
                              ' · ' +
                              (minTime(entry) || 'All day') +
                              ' · ' +
                              stateName[entry.state]
                            }
                          >
                            <small>
                              {minTime(entry) || 'All day'}
                              {ongoing ? ' · In progress' : ''}
                            </small>
                            <strong>{entry.title}</strong>
                            {entry.place && <small>{entry.place}</small>}
                            {entry.state !== 'scheduled' && (
                              <small className="font-semibold">
                                {stateName[entry.state]}
                              </small>
                            )}
                          </button>
                        );
                      })}
                    </section>
                  );
                })}
              </div>
            )}
          </Panel>
          {selected && (
            <Panel title={selected.title}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p>
                    {selected.day} · {minTime(selected) || 'All day'}
                    {selected.ends ? '–' + selected.ends.slice(0, 5) : ''}
                  </p>
                  <p className="workspace-note">
                    {[
                      selected.code,
                      selected.section,
                      selected.teacher,
                      kindName[selected.kind],
                      stateName[selected.state],
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {selected.place && (
                    <p className="flex items-center gap-1">
                      <MapPin size={14} aria-hidden="true" />
                      {selected.place}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.own &&
                    !inactive(selected) &&
                    selected.day <= today && (
                      <Button
                        disabled={action.busy}
                        onClick={() => start(selected)}
                      >
                        Open attendance
                      </Button>
                    )}
                  {selected.own &&
                    selected.state === 'scheduled' &&
                    selected.day >= today && (
                      <Button
                        variant="outline"
                        onClick={() => setRequest(selected)}
                      >
                        Request change
                      </Button>
                    )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelected(undefined);
                      setRequest(undefined);
                    }}
                  >
                    Close details
                  </Button>
                </div>
              </div>
              {action.feedback}
            </Panel>
          )}
          {request && (
            <RequestForm
              key={request.entry_id + request.day}
              entry={request}
              onSave={refresh}
            />
          )}
        </>
      )}
      {mode === 'Versions' && admin && (
        <VersionEditor refresh={refresh} revision={revision} />
      )}
      {mode === 'Events' && admin && (
        <Events
          date={day >= today ? day : today}
          refresh={refresh}
          entries={entries}
        />
      )}
      {mode === 'Requests' && (teacher || admin) && (
        <Requests admin={admin} refresh={refresh} revision={revision} />
      )}
    </div>
  );
}
