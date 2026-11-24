import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../services/db/database';
import { Field, Panel } from './shared';
import { useWorkspace } from './useWorkspace';

export default function WorkloadPage() {
  useWorkspace();
  const [year, setYear] = useState(db.getSettings().current_academic_year || '');
  const [query, setQuery] = useState('');
  const teachers = db
    .getEnrichedTeachers()
    .filter((t) =>
      [t.user.name, t.employee_id, t.department?.name]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  const slots = db
    .getTimetable()
    .filter((s) => !year || s.academic_year === year);
  const assignments = db
    .getTeacherAssignments()
    .filter((a) => !year || a.academic_year === year);
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return (
    <div className="workspace-page">
      <header>
        <h1>Faculty workload</h1>
        <p>Teaching allocations and scheduled contact hours per week.</p>
      </header>
      <Panel title="Teaching load">
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <Field label="Search faculty">
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </Field>
          <Field label="Academic year">
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All years</option>
              {[
                ...new Set([
                  ...db.getCalendar().years.map((y) => y.label),
                  ...db.getClasses().map((c) => c.academic_year),
                ]),
              ].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </Field>
        </div>
        <table>
          <thead>
            <tr>
              <th>Faculty</th>
              <th>Classes</th>
              <th>Subjects</th>
              <th>Periods / week</th>
              <th>Hours / week</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => {
              const load = slots.filter((s) => s.teacher_id === t.id);
              const assigned = assignments.filter((a) => a.teacher_id === t.id);
              return (
                <tr key={t.id}>
                  <td>
                    <Link to={'/admin/teachers/' + t.id}>{t.user.name}</Link>
                  </td>
                  <td>{new Set(assigned.map((a) => a.class_id)).size}</td>
                  <td>{new Set(assigned.map((a) => a.subject_id)).size}</td>
                  <td>{load.length}</td>
                  <td>
                    {(
                      load.reduce(
                        (n, s) =>
                          n + minutes(s.end_time) - minutes(s.start_time),
                        0,
                      ) / 60
                    ).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!teachers.length && <p>No matching faculty.</p>}
      </Panel>
    </div>
  );
}
