import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../../services/db/database';
import { Button } from '../../components/ui';
import { getTodayIsoDate } from '../../lib/date';
import { Field, Panel } from './shared';
import { mutate, useAction, useWorkspace } from './useWorkspace';
import { demoMode } from '../../services/supabaseClient';

export default function ProfilePage({ kind }: { kind: 'student' | 'teacher' }) {
  const { id } = useParams();
  const { admin, canRegister } = useWorkspace();
  const action = useAction();
  const student =
    kind === 'student' ? db.getEnrichedStudent(id || '') : undefined;
  const teacher =
    kind === 'teacher'
      ? db.getEnrichedTeachers().find((t) => t.id === id)
      : undefined;
  const person = student || teacher;
  const [section, setSection] = useState('');
  const [date, setDate] = useState(getTodayIsoDate);
  if (!person) return <p>Profile unavailable.</p>;
  const status = person.user.archived_at
    ? 'Archived'
    : person.user.enabled === false
      ? 'Inactive'
      : 'Active';
  const catalog = db.getClasses();
  const stats = student && db.calculateStudentAttendance(student.id);
  const assignments = teacher ? db.getTeacherAssignments(teacher.id) : [];
  return (
    <div className="workspace-page" key={id}>
      <header>
        <Link to={student ? '/admin/students' : '/admin/teachers'}>
          Back to directory
        </Link>
        <h1>{person.user.name}</h1>
        <p>
          {person.department?.name} · {student?.usn || teacher?.employee_id}
        </p>
      </header>
      <div className="workspace-split">
        <Panel title="Profile">
          <p>{person.user.email}</p>
          {person.user.auth_linked === false && (
            <p className="workspace-note">Awaiting Auth account link</p>
          )}
          <p className="workspace-note">
            {status} · {student ? 'Student' : teacher?.designation}
          </p>
          {student && (
            <p>
              {student.programme?.name} · {student.academic_class?.name}
            </p>
          )}
          {teacher && (
            <p>{teacher.qualification || 'Qualification unrecorded'}</p>
          )}
          {admin && !demoMode && (
            <div className="mt-4 flex flex-wrap gap-2">
              {['active', 'inactive', 'archived']
                .filter((s) => s !== status.toLowerCase())
                .map((value) => (
                  <Button
                    key={value}
                    variant="outline"
                    disabled={action.busy}
                    onClick={() =>
                      action.run(
                        () =>
                          mutate('workspace_account_status', {
                            profile_key: person.user.id,
                            new_status: value,
                          }),
                        'Account updated.',
                      )
                    }
                  >
                    {value === 'active'
                      ? 'Activate'
                      : value === 'inactive'
                        ? 'Deactivate'
                        : 'Archive'}
                  </Button>
                ))}
            </div>
          )}
        </Panel>
        <section className="workspace-fields">
          {student && (
            <>
              <Panel title="Enrollment history">
                <table>
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>From</th>
                      <th>Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db
                      .getEnrollments()
                      .filter((e) => e.student_id === id)
                      .map((e) => (
                        <tr key={e.id}>
                          <td>
                            {catalog.find((c) => c.id === e.class_id)?.name}
                          </td>
                          <td>{e.enrolled_from}</td>
                          <td>{e.enrolled_until || 'Open'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {stats && (
                  <p className="workspace-note mt-3">
                    {stats.present} present across {stats.totalSessions}{' '}
                    recorded classes
                  </p>
                )}
              </Panel>
              {canRegister && (
                <Panel title="Allocate a section">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action.run(
                        () =>
                          mutate('workspace_allocate', {
                            student_key: id,
                            section_key: section,
                            effective: date,
                          }),
                        'Section allocation saved.',
                      );
                    }}
                  >
                    <Field label="Destination">
                      <select
                        required
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                      >
                        <option value="">Choose a section</option>
                        {catalog
                          .filter(
                            (c) =>
                              c.department_id === person.department_id &&
                              c.id !== student.class_id,
                          )
                          .map((c) => (
                            <option value={c.id} key={c.id}>
                              {c.name} · {c.academic_year}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Effective date">
                      <input
                        required
                        type="date"
                        value={date}
                        max={getTodayIsoDate()}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </Field>
                    <Button type="submit" disabled={action.busy}>
                      Save allocation
                    </Button>
                  </form>
                </Panel>
              )}
            </>
          )}
          {teacher && (
            <Panel title="Teaching assignments">
              {assignments.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Section</th>
                      <th>Academic year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          {
                            db.getSubjects().find((s) => s.id === a.subject_id)
                              ?.name
                          }
                        </td>
                        <td>
                          {catalog.find((c) => c.id === a.class_id)?.name}
                        </td>
                        <td>{a.academic_year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No teaching assignments.</p>
              )}
            </Panel>
          )}
          {action.feedback}
        </section>
      </div>
    </div>
  );
}
