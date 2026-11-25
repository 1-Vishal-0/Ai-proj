import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useScheduleData } from '../../timetable/scheduling/scheduleData';
import {
  inactive,
  type AgendaEntry,
} from '../../timetable/scheduling/calendar';
import QRCode from 'qrcode';
import { Button } from '../../../components/ui';
import { getTodayIsoDate } from '../../../lib/date';
import { db } from '../../../services/db/database';
import { portalRpc, refreshPortalData } from '../../../services/db/portalData';
import { requireSupabase } from '../../../services/supabaseClient';
import { Field, Panel } from '../../workspace/shared';
import { useAction } from '../../workspace/useWorkspace';

type Call = {
  id: string;
  slot_id: string;
  class_id?: string;
  subject_id?: string;
  day: string;
  starts: string;
  phase: 'draft' | 'open' | 'closed' | 'finalized';
  expires_at: string | null;
  present_count: number;
  version: number;
};
type Review = {
  signature: string;
  session: Call;
  pin: string | null;
  token: string | null;
  roster: {
    student_id: string;
    name: string;
    identifier: string;
    status: string | null;
    method: string | null;
  }[];
};

export default function FacultySessionPage() {
  const action = useAction();
  const [params, setParams] = useSearchParams();
  const id = params.get('session') || '';
  const classFilter = params.get('class');
  const subjectFilter = params.get('subject');
  const [day, setDay] = useState(getTodayIsoDate);
  const agenda = useScheduleData(
    () =>
      day
        ? portalRpc<AgendaEntry[]>('schedule_agenda', {
            first_day: day,
            last_day: day,
          })
        : Promise.resolve([]),
    day,
  );
  const slots = (agenda?.data || []).filter(
    (entry) =>
      entry.own &&
      !inactive(entry) &&
      (!classFilter || entry.class_id === classFilter) &&
      (!subjectFilter || entry.subject_id === subjectFilter),
  );
  const [slot, setSlot] = useState(params.get('slot') || '');
  const target = slot ? slots.find((s) => s.entry_id === slot) : slots[0];
  const [kind, setKind] = useState('lecture');
  const [minutes, setMinutes] = useState(
    db.getSettings().code_duration_minutes_default || 10,
  );
  const [calls, setCalls] = useState<Call[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [loadError, setLoadError] = useState('');
  const [listError, setListError] = useState('');
  const [revision, setRevision] = useState(0);
  const [live, setLive] = useState(false);
  const [qr, setQr] = useState<{ token: string; url: string } | null>(null);
  const current = review?.session.id === id ? review : null;
  const session = current?.session;
  const token = current?.token;
  useEffect(() => {
    let active = true;
    let query = requireSupabase().from('lecture_roll_calls').select('*');
    if (classFilter) query = query.eq('class_id', classFilter);
    if (subjectFilter) query = query.eq('subject_id', subjectFilter);
    void query
      .order('day', { ascending: false })
      .order('starts', { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (active) {
          setListError(error?.message || '');
          if (data) setCalls(data as Call[]);
        }
      });
    return () => {
      active = false;
    };
  }, [revision, id, classFilter, subjectFilter]);
  useEffect(() => {
    if (!id) return;
    let active = true;
    let sequence = 0;
    async function read() {
      const request = ++sequence;
      try {
        const result = await portalRpc<Review>('lecture_review', {
          call_key: id,
        });
        if (active && request === sequence) {
          setReview(result);
          setLoadError('');
        }
      } catch (e) {
        if (active && request === sequence) {
          setLoadError(
            e instanceof Error ? e.message : 'Unable to load roster',
          );
          setReview(null);
        }
      }
    }
    void read();
    const client = requireSupabase();
    const channel = client
      .channel('lecture-' + id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lecture_roll_calls',
          filter: 'id=eq.' + id,
        },
        () => void read(),
      )
      .subscribe((status) => {
        if (active) {
          setLive(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') void read();
        }
      });
    const timer = window.setInterval(() => void read(), 10000);
    return () => {
      active = false;
      clearInterval(timer);
      void client.removeChannel(channel);
    };
  }, [id, revision]);
  useEffect(() => {
    if (session?.phase !== 'open' || !session.expires_at) return;
    const timer = setTimeout(
      () => setRevision((n) => n + 1),
      Math.max(250, Date.parse(session.expires_at) - Date.now() + 150),
    );
    return () => clearTimeout(timer);
  }, [session?.phase, session?.expires_at]);
  useEffect(() => {
    let active = true;
    if (token)
      QRCode.toDataURL(location.origin + '/student/check-in#' + token, {
        width: 224,
        margin: 4,
      })
        .then((url) => {
          if (active) setQr({ token, url });
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);
  function change(fn: string, args: Record<string, unknown>, message: string) {
    void action.run(async () => {
      await portalRpc(fn, args);
      setRevision((n) => n + 1);
      if (args.action === 'finalize') await refreshPortalData();
    }, message);
  }
  const existing = calls.find(
    (c) => c.slot_id === target?.entry_id && c.day === day,
  );
  const transition = (name: string) =>
    change(
      'lecture_transition',
      {
        call_key: id,
        action: name,
        minutes,
        review_version: session?.version,
        review_roster: current?.signature,
      },
      'Session updated.',
    );
  const lecture = db
    .getEnrichedTimetable()
    .find((s) => s.id === session?.slot_id);
  return (
    <div className="workspace-page">
      <header>
        <h1>Attendance sessions</h1>
        <p>
          Open check-in for a scheduled lecture, review the class roster and
          submit attendance.
        </p>
      </header>
      <div className="workspace-split">
        <Panel title="Scheduled lecture">
          <div className="workspace-fields">
            <Field label="Teaching date">
              <input
                type="date"
                max={getTodayIsoDate()}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </Field>
            <Field label="Lecture and section">
              <select
                value={target?.entry_id || ''}
                onChange={(e) => setSlot(e.target.value)}
              >
                {!target && (
                  <option value="">
                    {slots.length
                      ? 'Choose a scheduled lecture'
                      : 'No assigned lectures'}
                  </option>
                )}
                {slots.map((s) => (
                  <option key={s.entry_id} value={s.entry_id}>
                    {s.starts?.slice(0, 5)} · {s.code} · {s.section}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Session type">
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="lecture">Lecture</option>
                <option value="lab">Laboratory</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </Field>
            <Button
              disabled={!target || action.busy}
              onClick={() =>
                action.run(async () => {
                  const key =
                    existing?.id ||
                    (await portalRpc<string>('lecture_draft', {
                      slot_key: target?.entry_id,
                      lecture_day: day,
                      session_kind:
                        target?.kind === 'lab' || target?.kind === 'tutorial'
                          ? target.kind
                          : kind,
                    }));
                  setParams((previous) => {
                    const next = new URLSearchParams(previous);
                    next.set('session', key);
                    return next;
                  });
                }, 'Session selected.')
              }
            >
              {existing ? 'Review existing session' : 'Create draft'}
            </Button>
            <Field label="Recent sessions">
              <select
                value={id}
                onChange={(e) =>
                  setParams((previous) => {
                    const next = new URLSearchParams(previous);
                    if (e.target.value) next.set('session', e.target.value);
                    else next.delete('session');
                    return next;
                  })
                }
              >
                <option value="">Choose a session</option>
                {calls.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.day} · {c.starts.slice(0, 5)} ·{' '}
                    {c.id === id && session ? session.phase : c.phase}
                  </option>
                ))}
              </select>
            </Field>
            {listError && <p role="alert">{listError}</p>}
          </div>
        </Panel>
        <Panel
          title={
            lecture?.subject?.name ||
            db.getSubjects().find((s) => s.id === session?.subject_id)?.name ||
            'Session review'
          }
        >
          {!current ? (
            <p>
              {id
                ? loadError || 'Loading roster…'
                : 'Create a draft or select a recent session.'}
            </p>
          ) : (
            <div className="workspace-fields">
              <p>
                {lecture?.academic_class?.name ||
                  db.getClasses().find((c) => c.id === session?.class_id)
                    ?.name}{' '}
                · {session!.day} ·{' '}
                <strong>{session!.phase.toUpperCase()}</strong>
              </p>
              <p>
                <strong className="text-2xl">
                  {current.roster.filter((s) => s.status === 'present').length}{' '}
                  / {current.roster.length}
                </strong>{' '}
                present · {live ? 'Live updates' : 'Refreshing periodically'}
              </p>
              <dl className="grid grid-cols-3 gap-2">
                {[
                  [
                    'Student check-ins',
                    current.roster.filter(
                      (s) => s.method === 'qr' || s.method === 'code',
                    ).length,
                  ],
                  [
                    'Manual marks',
                    current.roster.filter((s) => s.method === 'manual').length,
                  ],
                  ['Unmarked', current.roster.filter((s) => !s.status).length],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <dt className="text-xs text-slate-600">{label}</dt>
                    <dd className="text-lg font-semibold tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {session!.phase === 'draft' && (
                <>
                  <Field label="Check-in window (minutes)">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                    />
                  </Field>
                  <Button
                    disabled={action.busy || minutes < 1 || minutes > 60}
                    onClick={() => transition('open')}
                  >
                    Open student check-in
                  </Button>
                </>
              )}
              {current.pin && (
                <div className="flex flex-wrap items-center gap-5 rounded-xl bg-slate-50 p-4">
                  {qr && qr.token === token && (
                    <img
                      src={qr.url}
                      width={180}
                      height={180}
                      alt="Scan to check in to this lecture"
                    />
                  )}
                  <div>
                    <p>Student check-in code</p>
                    <strong className="font-mono text-3xl tracking-widest">
                      {current.pin}
                    </strong>
                    <p>
                      Expires{' '}
                      {new Date(session!.expires_at!).toLocaleTimeString()}
                    </p>
                    <p className="workspace-note">
                      Compare check-ins with the students present before
                      submitting.
                    </p>
                  </div>
                </div>
              )}
              {(session!.phase === 'draft' || session!.phase === 'open') && (
                <Button
                  variant="outline"
                  disabled={action.busy}
                  onClick={() => transition('close')}
                >
                  {session!.phase === 'draft'
                    ? 'Review manual attendance'
                    : 'Close check-in and review'}
                </Button>
              )}
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Method</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {current.roster.map((s) => (
                    <tr key={s.student_id}>
                      <td>
                        {s.name}
                        <small className="block">{s.identifier}</small>
                      </td>
                      <td>{s.method || '—'}</td>
                      <td>
                        <select
                          aria-label={'Attendance for ' + s.name}
                          value={s.status || ''}
                          disabled={
                            action.busy || session!.phase === 'finalized'
                          }
                          onChange={(e) =>
                            change(
                              'lecture_manual',
                              {
                                call_key: id,
                                student_key: s.student_id,
                                mark: e.target.value,
                              },
                              'Mark saved.',
                            )
                          }
                        >
                          <option disabled value="">
                            Unmarked
                          </option>
                          {['present', 'absent', 'leave'].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {session!.phase === 'closed' && (
                <>
                  <p>
                    {db.getSettings().unmarked_policy === 'require_mark'
                      ? 'Every student requires a mark.'
                      : 'Unmarked students will be recorded as absent.'}
                  </p>
                  <Button
                    disabled={action.busy || !current.roster.length}
                    onClick={() => transition('finalize')}
                  >
                    Finalize reviewed roster
                  </Button>
                </>
              )}
            </div>
          )}
        </Panel>
      </div>
      {action.feedback}
    </div>
  );
}
