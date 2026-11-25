import { useState, type FormEvent } from 'react';
import { Button } from '../../../components/ui';
import { Field, Panel } from '../../workspace/shared';
import { useAction } from '../../workspace/useWorkspace';
import { db } from '../../../services/db/database';
import { portalRpc } from '../../../services/db/portalData';
import {
  fetchRows,
  useScheduleData,
  type Slot,
  type Version,
} from './scheduleData';
import { DAY_NAMES, getTodayIsoDate } from '../../../lib/date';
import { kindName, shiftDay } from './calendar';

export function VersionEditor({
  refresh,
  revision,
}: {
  refresh: () => void;
  revision: number;
}) {
  const [id, setId] = useState('');
  const [editing, setEditing] = useState('');
  const action = useAction();
  const versions = useScheduleData(
    () => fetchRows<Version>('schedule_versions'),
    String(revision),
  );
  const active = versions?.data?.find((v) => v.id === id);
  const slots = useScheduleData(
    () =>
      id
        ? fetchRows<Slot>('timetable_slots', {
            column: 'version_id',
            value: id,
          })
        : Promise.resolve([]),
    id + revision,
  );
  const assignments = db.getTeacherAssignments();
  const selected = slots?.data?.find((s) => s.id === editing);
  const selectedAssignment = assignments.find(
    (a) =>
      a.class_id === selected?.class_id &&
      a.teacher_id === selected.teacher_id &&
      a.subject_id === selected.subject_id &&
      a.academic_year === selected.academic_year,
  );
  const teachers = db.getEnrichedTeachers();
  const assignmentLabel = (a: {
    subject_id: string;
    teacher_id: string;
    class_id: string;
  }) =>
    [
      db.getSubjects().find((s) => s.id === a.subject_id)?.code,
      db.getClasses().find((c) => c.id === a.class_id)?.name,
      teachers.find((t) => t.id === a.teacher_id)?.user.name,
    ]
      .filter(Boolean)
      .join(' · ');
  function submitSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      fields = new FormData(form);
    void action.run(async () => {
      await portalRpc('schedule_slot', {
        draft: id,
        slot: editing || null,
        assignment: fields.get('assignment'),
        weekday: fields.get('weekday'),
        room: fields.get('room'),
        starts: fields.get('starts'),
        ends: fields.get('ends'),
        kind: fields.get('kind'),
      });
      setEditing('');
      form.reset();
      refresh();
    }, 'Draft slot saved.');
  }
  return (
    <Panel title="Timetable versions">
      <div className="workspace-split">
        <div className="workspace-fields">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = new FormData(form).get('name');
              void action.run(async () => {
                const created = await portalRpc<string>('schedule_new', {
                  name,
                });
                setId(created);
                setEditing('');
                form.reset();
                refresh();
              }, 'Draft created.');
            }}
          >
            <Field label="New version name">
              <input
                name="name"
                maxLength={100}
                required
                placeholder="Semester timetable"
              />
            </Field>
            <Button type="submit" disabled={action.busy}>
              Create draft from current schedule
            </Button>
          </form>
          <Field label="Version">
            <select
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setEditing('');
              }}
            >
              <option value="">Select version</option>
              {versions?.data?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.effective || 'Draft'}
                </option>
              ))}
            </select>
          </Field>
          {versions?.error && <p role="alert">{versions.error}</p>}
          {active && !active.effective && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const date = new FormData(e.currentTarget).get('effective');
                void action.run(async () => {
                  await portalRpc('schedule_publish', {
                    draft: id,
                    from_day: date,
                  });
                  refresh();
                }, 'Timetable published.');
              }}
            >
              <Field label="Effective date">
                <input
                  type="date"
                  name="effective"
                  min={shiftDay(getTodayIsoDate(), 1)}
                  required
                />
              </Field>
              <Button type="submit" disabled={action.busy}>
                Publish version
              </Button>
            </form>
          )}
        </div>
        <div className="workspace-fields">
          {active && !active.effective && (
            <form key={id + editing} onSubmit={submitSlot}>
              <Field label="Subject, section and faculty">
                <select
                  name="assignment"
                  defaultValue={selectedAssignment?.id || ''}
                  required
                >
                  <option value="">Select teaching assignment</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {assignmentLabel(a)} · {a.academic_year}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Repeats every">
                  <select
                    name="weekday"
                    defaultValue={selected?.day_of_week || 'Monday'}
                  >
                    {DAY_NAMES.map((day) => (
                      <option key={day}>{day}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Lecture type">
                  <select
                    name="kind"
                    defaultValue={selected?.lecture_kind || 'lecture'}
                  >
                    {['lecture', 'lab', 'tutorial', 'elective', 'special'].map(
                      (kind) => (
                        <option key={kind} value={kind}>
                          {kindName[kind]}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Start">
                  <input
                    name="starts"
                    type="time"
                    required
                    defaultValue={selected?.start_time.slice(0, 5)}
                  />
                </Field>
                <Field label="End">
                  <input
                    name="ends"
                    type="time"
                    required
                    defaultValue={selected?.end_time.slice(0, 5)}
                  />
                </Field>
              </div>
              <Field label="Classroom">
                <input
                  name="room"
                  required
                  maxLength={80}
                  defaultValue={selected?.classroom}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={action.busy}>
                  {editing ? 'Save changes' : 'Add weekly slot'}
                </Button>
                {editing && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing('')}
                    >
                      Stop editing
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() =>
                        action.run(async () => {
                          await portalRpc('schedule_slot', {
                            draft: id,
                            slot: editing,
                            assignment: null,
                            weekday: null,
                            room: null,
                            starts: null,
                            ends: null,
                            kind: null,
                            remove: true,
                          });
                          setEditing('');
                          refresh();
                        }, 'Slot removed from draft.')
                      }
                    >
                      Remove slot
                    </Button>
                  </>
                )}
              </div>
            </form>
          )}
          {slots?.error && <p role="alert">{slots.error}</p>}
          {id && slots?.data?.length === 0 && (
            <p>No weekly slots in this version.</p>
          )}
          {active &&
            slots?.data?.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-sm"
              >
                <div>
                  <strong>{assignmentLabel(s)}</strong>
                  <p>
                    {s.day_of_week} · {s.start_time.slice(0, 5)}–
                    {s.end_time.slice(0, 5)} · {s.classroom}
                  </p>
                </div>
                {!active.effective && (
                  <Button variant="outline" onClick={() => setEditing(s.id)}>
                    Edit slot
                  </Button>
                )}
              </div>
            ))}
        </div>
      </div>
      {action.feedback}
    </Panel>
  );
}
