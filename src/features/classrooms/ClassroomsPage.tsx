import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDatabaseVersion } from '../../hooks/useDatabase';
import { db } from '../../services/db/database';
import { portalRpc } from '../../services/db/portalData';
import { requireSupabase } from '../../services/supabaseClient';
import { Button } from '../../components/ui';
import { Field, Panel } from '../workspace/shared';
import { useAction } from '../workspace/useWorkspace';

type Room = {
  id: string;
  assignment_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  subject: string;
  code: string;
  section: string;
  semester: number;
  academic_year: string;
  joined: boolean;
};
type Kind = 'announcement' | 'note' | 'assignment';
type Post = {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  due_date: string | null;
};
type Member = {
  student_id: string;
  name: string;
  email: string;
  joined: boolean;
  eligible: boolean;
};

function useRead<T>(load: () => Promise<T>, key: string) {
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>();
  useEffect(() => {
    let cancelled = false;
    void load()
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch((error) => {
        if (!cancelled)
          setResult({
            key,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load classrooms.',
          });
      });
    return () => {
      cancelled = true;
    };
    // The caller's key identifies the request and all its inputs.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result?.key === key ? result : undefined;
}

function attendance(room: Room) {
  const sessions = db.getSessions({
    class_id: room.class_id,
    subject_id: room.subject_id,
    teacher_id: room.teacher_id,
  });
  const ids = new Set(sessions.map((session) => session.id));
  const records = db
    .getRecords()
    .filter((record) => ids.has(record.session_id));
  return { sessions, records };
}

export default function ClassroomsPage() {
  const { currentTeacher, currentUser } = useAuth();
  useDatabaseVersion();
  const { id } = useParams();
  const teacher = currentUser?.role === 'teacher';
  const base = teacher ? '/teacher/classrooms' : '/student/classrooms';
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((n) => n + 1);
  const action = useAction();
  const [selection, setSelection] = useState('');
  const list = useRead(
    () => portalRpc<Room[]>('classroom_list'),
    String(version),
  );
  const rooms = list?.data || [];
  if (list?.error)
    return (
      <div className="workspace-page">
        <p role="alert">{list.error}</p>
        <Button onClick={reload}>Retry</Button>
      </div>
    );
  if (!list) return <p role="status">Loading classrooms…</p>;
  if (id) {
    const room = rooms.find((r) => r.id === id);
    return room ? (
      <RoomPage
        key={id}
        room={room}
        teacher={teacher}
        base={base}
        reload={reload}
      />
    ) : (
      <div className="workspace-page">
        <p>This classroom is unavailable.</p>
        <Link to={base}>My classrooms</Link>
      </div>
    );
  }
  const assignments =
    teacher && currentTeacher
      ? db
          .getTeacherAssignments(currentTeacher.id)
          .filter((a) => !rooms.some((r) => r.assignment_id === a.id))
      : [];
  const selected =
    assignments.find((a) => a.id === selection) || assignments[0];
  return (
    <div className="workspace-page">
      <header>
        <h1>My classrooms</h1>
      </header>
      {assignments.length > 0 && (
        <Panel title="Create classroom">
          <form
            className="sm:grid-cols-[1fr_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (selected)
                void action.run(async () => {
                  await portalRpc('classroom_create', {
                    assignment: selected.id,
                  });
                  reload();
                }, 'Classroom created.');
            }}
          >
            <Field label="Teaching assignment">
              <select
                value={selected?.id || ''}
                onChange={(e) => setSelection(e.target.value)}
              >
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {db.getSubjects().find((s) => s.id === a.subject_id)?.name}{' '}
                    · {db.getClasses().find((c) => c.id === a.class_id)?.name} ·{' '}
                    {a.academic_year}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" disabled={action.busy}>
              Create classroom
            </Button>
          </form>
        </Panel>
      )}
      {action.feedback}
      {!rooms.length && (
        <Panel title="No classrooms yet">
          <p>
            {teacher
              ? 'Create a classroom from one of your teaching assignments.'
              : 'Classroom invitations from your faculty will appear here.'}
          </p>
        </Panel>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => {
          const { records } = attendance(room);
          const attended = records.filter(
            (r) =>
              r.status === 'present' ||
              (r.status === 'leave' &&
                db.getSettings().leave_counts_as_present),
          ).length;
          const percent = records.length
            ? Math.round((attended * 100) / records.length)
            : null;
          const below =
            percent !== null && percent < db.getSettings().threshold_percentage;
          return (
            <article
              key={room.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <header className="bg-indigo-700 p-5 text-white">
                <BookOpen size={19} aria-hidden="true" />
                <p className="mt-3 !text-indigo-100">
                  {room.code} · {room.academic_year}
                </p>
                <h2 className="my-1 text-lg font-semibold">{room.subject}</h2>
                <p className="!text-indigo-100">
                  Semester {room.semester} · Section {room.section}
                </p>
              </header>
              <div className="grid gap-3 p-5">
                {!teacher && room.joined && (
                  <div>
                    <p className="workspace-note">My attendance</p>
                    <strong
                      className={below ? 'text-red-700' : 'text-slate-900'}
                    >
                      {percent === null
                        ? 'No recorded lectures'
                        : percent + '%'}
                    </strong>
                    {percent !== null && (
                      <>
                        <progress
                          className="mt-2 block h-2 w-full accent-indigo-700"
                          value={percent}
                          max={100}
                          aria-label="My attendance"
                        />
                        <p className="workspace-note mt-2">
                          {attended} of {records.length} lectures attended
                        </p>
                      </>
                    )}
                  </div>
                )}
                <Link
                  to={base + '/' + room.id}
                  className="flex items-center justify-between text-sm font-semibold"
                >
                  {room.joined ? 'Open classroom' : 'Review invitation'}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function RoomPage({
  room,
  teacher,
  base,
  reload,
}: {
  room: Room;
  teacher: boolean;
  base: string;
  reload: () => void;
}) {
  const action = useAction();
  const [tab, setTab] = useState('Overview');
  const [selectedLecture, setSelectedLecture] = useState('');
  const [version, setVersion] = useState(0);
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  const posts = useRead(
    async () => {
      if (!room.joined) return [];
      const { data, error } = await requireSupabase()
        .from('classroom_posts')
        .select('id,kind,title,body,due_date')
        .eq('classroom_id', room.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as Post[];
    },
    room.id + ':' + room.joined + ':' + version,
  );
  const people = useRead(
    () =>
      teacher
        ? portalRpc<Member[]>('classroom_people', { room: room.id })
        : Promise.resolve([]),
    room.id + ':' + teacher + ':' + version,
  );
  const { sessions, records } = attendance(room);
  const totals = new Map<string, number>();
  for (const record of records)
    if (record.status === 'present')
      totals.set(record.session_id, (totals.get(record.session_id) || 0) + 1);
  const ownMarks = new Map(
    records.map((record) => [record.session_id, record.status]),
  );
  const kind: Kind =
    tab === 'Notes'
      ? 'note'
      : tab === 'Assignments'
        ? 'assignment'
        : 'announcement';
  const update = () => setVersion((v) => v + 1);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    void action.run(async () => {
      const { error } = await requireSupabase()
        .from('classroom_posts')
        .insert({
          classroom_id: room.id,
          kind,
          title: data.get('title'),
          body: body.trim(),
          due_date: data.get('due_date') || null,
        });
      if (error) throw new Error(error.message);
      form.reset();
      setBody('');
      update();
    }, 'Published to the classroom.');
  };
  const manage = (operation: string, address: string) => {
    void action.run(async () => {
      await portalRpc('classroom_manage', {
        room: room.id,
        school_email: address,
        operation,
      });
      setEmail('');
      update();
    }, 'Classroom roster updated.');
  };
  return (
    <div className="workspace-page">
      <header className="grid gap-3">
        <Link to={base}>All classrooms</Link>
        <div className="rounded-xl bg-indigo-700 p-6 text-white">
          <GraduationCap size={24} aria-hidden="true" />
          <p className="mt-3 !text-indigo-100">
            {room.code} · {room.academic_year}
          </p>
          <h1>{room.subject}</h1>
          <p className="!text-indigo-100">
            Semester {room.semester} · Section {room.section}
          </p>
        </div>
      </header>
      {!room.joined ? (
        <Panel title="Classroom invitation">
          <p className="mb-4">
            Join once to see class materials and your lecture attendance.
          </p>
          <Button
            disabled={action.busy}
            onClick={() =>
              action.run(async () => {
                await portalRpc('classroom_join', { room: room.id });
                reload();
              }, 'Classroom joined.')
            }
          >
            Join classroom
          </Button>
        </Panel>
      ) : (
        <>
          <nav
            className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
            aria-label="Classroom sections"
          >
            {[
              'Overview',
              'Attendance',
              'Notes',
              'Assignments',
              ...(teacher ? ['People'] : []),
            ].map((name) => (
              <Button
                key={name}
                size="sm"
                variant={name === tab ? 'primary' : 'ghost'}
                aria-pressed={name === tab}
                onClick={() => {
                  setTab(name);
                  setBody('');
                }}
              >
                {name}
              </Button>
            ))}
          </nav>
          {tab === 'Attendance' ? (
            <Panel title="Lecture attendance">
              <Link
                to={
                  teacher
                    ? '/teacher/mark?class=' +
                      room.class_id +
                      '&subject=' +
                      room.subject_id
                    : '/student/check-in'
                }
              >
                {teacher
                  ? 'Take attendance for this classroom'
                  : 'Open lecture check-in'}
              </Link>
              {!sessions.length ? (
                <p className="mt-4">No finalized lectures yet.</p>
              ) : (
                <table className="mt-4">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Lecture time</th>
                      <th>{teacher ? 'Present' : 'My mark'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sessions]
                      .sort(
                        (a, b) =>
                          b.date.localeCompare(a.date) ||
                          b.start_time.localeCompare(a.start_time),
                      )
                      .map((s) => (
                        <tr key={s.id}>
                          <td>{s.date}</td>
                          <td>{s.start_time.slice(0, 5)}</td>
                          <td>
                            {teacher
                              ? totals.get(s.id) || 0
                              : ownMarks.get(s.id) || '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              {teacher && sessions.length > 0 && <div className="mt-5">
                <Field label="View student marks for a lecture">
                  <select value={selectedLecture} onChange={e=>setSelectedLecture(e.target.value)}>
                    <option value="">Choose a lecture</option>
                    {sessions.map(s=><option key={s.id} value={s.id}>{s.date} · {s.start_time.slice(0,5)}</option>)}
                  </select>
                </Field>
                {selectedLecture && <table className="mt-3"><thead><tr><th>Student</th><th>Mark</th></tr></thead><tbody>
                  {records.filter(record=>record.session_id===selectedLecture).map(record=><tr key={record.id}>
                    <td>{db.getEnrichedStudent(record.student_id)?.user.name || 'Student'}</td><td>{record.status}</td>
                  </tr>)}
                </tbody></table>}
              </div>}
            </Panel>
          ) : tab === 'People' ? (
            <Panel title="Classroom roster">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const button = (e.nativeEvent as SubmitEvent)
                    .submitter as HTMLButtonElement | null;
                  manage(button?.value || 'invite', email);
                }}
              >
                <Field label="Student college email">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" value="invite" disabled={action.busy}>
                    Invite to join
                  </Button>
                  <Button
                    type="submit"
                    value="add"
                    variant="outline"
                    disabled={action.busy}
                  >
                    Add to classroom
                  </Button>
                </div>
                <p className="workspace-note">
                  Invitations appear in the student portal. The student must
                  already be enrolled in this section.
                </p>
              </form>
              {people?.error ? (
                <p role="alert">{people.error}</p>
              ) : !people ? (
                <p role="status">Loading roster…</p>
              ) : people.data?.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Membership</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.data.map((m) => (
                      <tr key={m.student_id}>
                        <td>
                          {m.name}
                          <small className="block">{m.email}</small>
                        </td>
                        <td>
                          {m.eligible
                            ? m.joined
                              ? 'Joined'
                              : 'Invited'
                            : 'Enrollment ended'}
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={action.busy}
                            onClick={() => manage('remove', m.email)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mt-4">No classroom members yet.</p>
              )}
            </Panel>
          ) : (
            <div className={teacher ? 'workspace-split' : undefined}>
              {teacher && (
                <Panel
                  title={
                    kind === 'note'
                      ? 'Publish note'
                      : kind === 'assignment'
                        ? 'Post assignment'
                        : 'Post announcement'
                  }
                >
                  <form key={kind} onSubmit={save}>
                    <Field label="Title">
                      <input name="title" maxLength={160} required />
                    </Field>
                    {kind === 'assignment' && (
                      <Field label="Due date">
                        <input type="date" name="due_date" />
                      </Field>
                    )}
                    {kind === 'note' && (
                      <Field label="Import a text note">
                        <input
                          type="file"
                          accept=".txt,text/plain,.md,text/markdown"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              await action.run(async () => {
                                if (file.size > 48000)
                                  throw new Error(
                                    'Choose a smaller text file.',
                                  );
                                const text = await file.text();
                                if (text.length > 12000)
                                  throw new Error(
                                    'Notes can contain up to 12,000 characters.',
                                  );
                                setBody(text);
                              }, 'Text loaded into the draft.');
                          }}
                        />
                      </Field>
                    )}
                    <Field
                      label={kind === 'assignment' ? 'Instructions' : 'Content'}
                    >
                      <textarea
                        required
                        maxLength={12000}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" disabled={action.busy}>
                      Publish
                    </Button>
                  </form>
                </Panel>
              )}
              <Panel
                title={kind === 'announcement' ? 'Class announcements' : tab}
              >
                {posts?.error ? (
                  <p role="alert">{posts.error}</p>
                ) : !posts ? (
                  <p role="status">Loading posts…</p>
                ) : !posts.data?.some((p) => p.kind === kind) ? (
                  <p>No posts here yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {posts.data
                      .filter((p) => p.kind === kind)
                      .map((post) => (
                        <article
                          key={post.id}
                          className="rounded-lg border border-slate-200 p-4"
                        >
                          <h3 className="font-semibold">{post.title}</h3>
                          {post.due_date && (
                            <p className="workspace-note">
                              Due {post.due_date}
                            </p>
                          )}
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                            {post.body}
                          </p>
                        </article>
                      ))}
                  </div>
                )}
              </Panel>
            </div>
          )}
        </>
      )}
      {action.feedback}
    </div>
  );
}
