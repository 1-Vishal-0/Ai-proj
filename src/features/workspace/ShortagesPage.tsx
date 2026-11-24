import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../services/db/database';
import { Field, Panel } from './shared';
import { useWorkspace } from './useWorkspace';
export default function ShortagesPage() {
  const { settings } = useWorkspace();
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('');
  const cutoff = settings.threshold_percentage;
  const rows = db
    .getLowAttendanceStudents(cutoff)
    .filter(
      (r) =>
        r.totalClasses > 0 &&
        r.overallPercentage < cutoff &&
        (!dept || r.student.department_id === dept) &&
        [r.student.user.name, r.student.usn, r.student.academic_class?.name]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.overallPercentage - b.overallPercentage);
  return (
    <div className="workspace-page">
      <header>
        <h1>Attendance shortages</h1>
        <p>Students below the institution threshold of {cutoff}%.</p>
      </header>
      <Panel title="Shortage register">
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="Search by student, USN or section">
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </Field>
          <Field label="Department">
            <select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">All departments</option>
              {db.getDepartments().map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>USN</th>
              <th>Section</th>
              <th>Recorded classes</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student.id}>
                <td>
                  <Link to={'/admin/students/' + r.student.id}>
                    {r.student.user.name}
                  </Link>
                </td>
                <td>{r.student.usn}</td>
                <td>{r.student.academic_class?.name}</td>
                <td>{r.totalClasses}</td>
                <td>{r.overallPercentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p>No matching shortages.</p>}
      </Panel>
    </div>
  );
}
