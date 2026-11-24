import { useState } from 'react';
import Papa from 'papaparse';
import { db } from '../../services/db/database';
import { getTodayIsoDate } from '../../lib/date';
import { Button } from '../../components/ui';
import { Field, Panel } from './shared';
import { mutate, useAction, useWorkspace } from './useWorkspace';

export default function RegisterPage() {
  const { canRegister } = useWorkspace();
  const action = useAction();
  const departments = db.getDepartments();
  const [department, setDepartment] = useState(departments[0]?.id || '');
  const [kind, setKind] = useState('student');
  const classes = db.getClasses().filter((c) => c.department_id === department);
  const [section, setSection] = useState('');
  const [date, setDate] = useState(getTodayIsoDate);
  const [csv, setCsv] = useState('name,email,identifier\n');
  const [fileError, setFileError] = useState('');
  const [mode, setMode] = useState<'single' | 'csv'>('single');
  const [person, setPerson] = useState({ name: '', email: '', identifier: '' });
  const singleCsv = Papa.unparse({
    fields: ['name', 'email', 'identifier'],
    data: Object.values(person).some(Boolean) ? [person] : [],
  });
  const parsed = Papa.parse<Record<string, string>>(
    (mode === 'single' ? singleCsv : csv).replace(/^\uFEFF/, ''),
    {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase(),
      transform: (v) => v.trim(),
    },
  );
  const required = ['name', 'email', 'identifier'];
  const headersValid =
    required.every((h) => parsed.meta.fields?.includes(h)) &&
    parsed.meta.fields?.length === 3;
  const emails = new Set(db.getUsers().map((p) => p.email.toLowerCase()));
  const identifiers = new Set(
    (kind === 'teacher'
      ? db
          .getTeachers()
          .filter((t) => t.department_id === department)
          .map((t) => t.employee_id)
      : db
          .getStudents()
          .filter((s) => s.department_id === department)
          .flatMap((s) => [s.usn, s.roll_number])
    ).map((id) => id?.toUpperCase()),
  );
  const rows = parsed.data.map((person) => {
    const email = person.email?.toLowerCase() || '';
    const id = person.identifier?.toUpperCase() || '';
    const issues = [];
    if (!person.name || person.name.length > 150) issues.push('Invalid name');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) issues.push('Invalid email');
    if (!id || id.length > 50) issues.push('Invalid identifier');
    if (emails.has(email)) issues.push('Duplicate email');
    if (identifiers.has(id)) issues.push('Duplicate identifier');
    emails.add(email);
    identifiers.add(id);
    return { person, issues };
  });
  const target = section || classes[0]?.id || '';
  const academicYear = classes.find(entry=>entry.id===target)?.academic_year;
  const year = db.getCalendar().years.find(entry=>entry.label===academicYear);
  const withinYear = year && year.starts_on <= date && date <= year.ends_on;
  const valid =
    canRegister &&
    department &&
    headersValid &&
    !parsed.errors.length &&
    rows.length > 0 &&
    rows.length <= 500 &&
    !rows.some((r) => r.issues.length) &&
    (mode === 'single' || !fileError) &&
    (kind === 'teacher' || (target && withinYear));
  return (
    <div className="workspace-page">
      <header>
        <h1>Enrollment & import</h1>
        <p>
          Register one person or import up to 500 academic records. A trusted
          operator links verified Auth identities for sign-in.
        </p>
      </header>
      <div className="workspace-split">
        <Panel title="Allocation">
          <div className="workspace-fields">
            <Field label="Directory">
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="student">Students</option>
                <option value="teacher">Faculty</option>
              </select>
            </Field>
            <Field label="Department">
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setSection('');
                }}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            {kind === 'student' && (
              <>
                <Field label="Section">
                  <select
                    value={target}
                    onChange={(e) => setSection(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.academic_year}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Enrollment starts">
                  <input
                    type="date"
                    value={date}
                    min={year?.starts_on}
                    max={year?.ends_on}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
                {year && !withinYear && <p role="alert">Choose an enrollment date between {year.starts_on} and {year.ends_on}.</p>}
              </>
            )}
          </div>
        </Panel>
        <Panel title="Roster preview">
          <div className="workspace-fields">
            <Field label="Entry method">
              <select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value === 'csv' ? 'csv' : 'single')
                }
              >
                <option value="single">One person</option>
                <option value="csv">CSV import</option>
              </select>
            </Field>
            {mode === 'single' ? (
              <>
                <Field label="Full name">
                  <input
                    required
                    value={person.name}
                    onChange={(e) =>
                      setPerson({ ...person, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Institutional email">
                  <input
                    required
                    type="email"
                    value={person.email}
                    onChange={(e) =>
                      setPerson({ ...person, email: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label={
                    kind === 'student'
                      ? 'USN or registration number'
                      : 'Employee number'
                  }
                >
                  <input
                    required
                    value={person.identifier}
                    onChange={(e) =>
                      setPerson({ ...person, identifier: e.target.value })
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <Field key="csv-file" label="Choose a CSV file">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 512000) {
                        setFileError('Choose a CSV smaller than 500 KB.');
                        return;
                      }
                      try {
                        setCsv(await f.text());
                        setFileError('');
                      } catch {
                        setFileError('Unable to read the file.');
                      }
                    }}
                  />
                </Field>
                <Field label="CSV content · use a USN or employee number for identifier">
                  <textarea
                    value={csv}
                    onChange={(e) => {
                      setCsv(e.target.value);
                      setFileError('');
                    }}
                  />
                </Field>
              </>
            )}
            {mode === 'csv' &&
              (!headersValid ||
                parsed.errors.length > 0 ||
                rows.length > 500 ||
                fileError) && (
                <p role="alert">
                  {fileError ||
                    parsed.errors[0]?.message ||
                    'Use name,email,identifier and at most 500 rows.'}
                </p>
              )}
            {!!rows.length && (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Identifier</th>
                    <th>Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 500).map((r, i) => (
                    <tr key={i}>
                      <td>{r.person.name}</td>
                      <td>{r.person.email}</td>
                      <td>{r.person.identifier}</td>
                      <td>{r.issues.join(', ') || 'Ready'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!canRegister && (
              <p>Roster registration requires institutional permission.</p>
            )}
            <Button
              disabled={!valid || action.busy}
              onClick={() =>
                action.run(async () => {
                  await mutate('workspace_import_people', {
                    kind,
                    department_key: department,
                    section_key: kind === 'student' ? target : null,
                    start_date: kind === 'student' ? date : null,
                    people: rows.map((r) => r.person),
                  });
                  setCsv('name,email,identifier\n');
                  setPerson({ name: '', email: '', identifier: '' });
                }, 'Roster saved.')
              }
            >
              Register {rows.length} {rows.length === 1 ? 'person' : 'people'}
            </Button>
            {action.feedback}
          </div>
        </Panel>
      </div>
    </div>
  );
}
