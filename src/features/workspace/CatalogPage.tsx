import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../services/db/database';
import { academicsService } from '../../services/academics.service';
import {
  getPortalInstitutionId,
  insertPortal,
  writePortal,
} from '../../services/db/portalData';
import { demoMode, requireSupabase } from '../../services/supabaseClient';
import { Button } from '../../components/ui';
import { Field, Panel } from './shared';
import { useAction, useWorkspace } from './useWorkspace';

export default function CatalogPage() {
  const { admin } = useWorkspace();
  const action = useAction();
  const { years, semesters, holidays } = db.getCalendar();
  const [year, setYear] = useState('');
  const [scheme, setScheme] = useState('');
  const [department, setDepartment] = useState('');
  const [programme, setProgramme] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [create, setCreate] = useState(admin ? 'academic_years' : 'programmes');
  const departments = db.getDepartments(),
    schemes = db.getVTUSchemes();
  const programmes = db
    .getProgrammes()
    .filter((p) => !department || p.department_id === department);
  const classes = db
    .getClasses()
    .filter(
      (c) =>
        (!year || c.academic_year === year) &&
        (!scheme || c.vtu_scheme_id === scheme) &&
        (!department || c.department_id === department) &&
        (!programme || c.programme_id === programme) &&
        (!semester || c.semester === Number(semester)),
    );
  const current = classes.find((c) => c.id === section) || classes[0];
  const subjects = current ? academicsService.getSectionSubjects(current) : [];
  const assignments = db
    .getTeacherAssignments()
    .filter((a) => a.class_id === current?.id);
  const teachers = db.getEnrichedTeachers();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    void action.run(async () => {
      const data =
        create === 'semesters' || create === 'programmes'
          ? fields
          : { ...fields, institution_id: getPortalInstitutionId() };
      await insertPortal(create, data);
      form.reset();
    }, 'Academic calendar and catalog updated.');
  };
  return (
    <div className="workspace-page">
      <header>
        <h1>Academic hierarchy</h1>
        <p>
          Explore sections, curriculum and teaching assignments by academic
          year.
        </p>
      </header>
      <div className="workspace-split">
        <Panel title="Academic structure">
          <div className="workspace-fields">
            <Field label="Academic year">
              <select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">All years</option>
                {years.map((y) => (
                  <option key={y.id}>{y.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Regulation or scheme">
              <select
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
              >
                <option value="">All schemes</option>
                {schemes.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setProgramme('');
                }}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Programme">
              <select
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
              >
                <option value="">All programmes</option>
                {programmes.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Semester">
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="">All semesters</option>
                {[
                  ...new Set(
                    semesters
                      .filter(
                        (s) =>
                          !year ||
                          years.find((y) => y.id === s.academic_year_id)
                            ?.label === year,
                      )
                      .map((s) => s.number),
                  ),
                ]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n}>{n}</option>
                  ))}
              </select>
            </Field>
            <Field label="Section">
              <select
                value={current?.id || ''}
                onChange={(e) => setSection(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.academic_year}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>
        <Panel title={current?.name || 'Sections'}>
          {current ? (
            <>
              <p className="workspace-note">
                {current.academic_year} · Semester {current.semester} · Section{' '}
                {current.section}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Format</th>
                    <th>Faculty</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.code} · {s.name}
                      </td>
                      <td>{s.category}</td>
                      <td>{s.course_type}</td>
                      <td>
                        {assignments
                          .filter((a) => a.subject_id === s.id)
                          .map(
                            (a) =>
                              teachers.find((t) => t.id === a.teacher_id)?.user
                                .name,
                          )
                          .filter(Boolean)
                          .join(', ') || 'Unassigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>No matching sections.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            <Link to="/admin/academics">Manage sections</Link>
            <Link to="/admin/subjects">Manage subjects</Link>
            <Link to="/admin/teachers">Assign faculty</Link>
          </div>
        </Panel>
      </div>
      <div className="workspace-split">
        {!demoMode && (
          <Panel title="Add to catalog">
            <Field label="Record type">
              <select
                value={admin ? create : 'programmes'}
                onChange={(e) => setCreate(e.target.value)}
              >
                {admin && (
                  <>
                    <option value="academic_years">Academic year</option>
                    <option value="semesters">Semester</option>
                    <option value="academic_holidays">Holiday</option>
                  </>
                )}
                <option value="programmes">Programme</option>
              </select>
            </Field>
            <form key={create} className="mt-3" onSubmit={submit}>
              {create === 'academic_years' && (
                <>
                  <Field label="Year label">
                    <input
                      name="label"
                      placeholder="2026-2027"
                      required
                      pattern="[0-9]{4}-[0-9]{4}"
                    />
                  </Field>
                  <Field label="Start date">
                    <input type="date" name="starts_on" required />
                  </Field>
                  <Field label="End date">
                    <input type="date" name="ends_on" required />
                  </Field>
                </>
              )}
              {create === 'semesters' && (
                <>
                  <Field label="Academic year">
                    <select name="academic_year_id" required>
                      {years.map((y) => (
                        <option value={y.id} key={y.id}>
                          {y.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Semester number">
                    <input
                      required
                      name="number"
                      type="number"
                      min="1"
                      max="12"
                    />
                  </Field>
                </>
              )}
              {create === 'academic_holidays' && (
                <>
                  <Field label="Date">
                    <input type="date" name="day" required />
                  </Field>
                  <Field label="Holiday name">
                    <input name="name" required maxLength={150} />
                  </Field>
                </>
              )}
              {create === 'programmes' && (
                <>
                  <Field label="Department">
                    <select name="department_id" required>
                      {departments.map((d) => (
                        <option value={d.id} key={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Programme name">
                    <input name="name" required />
                  </Field>
                  <Field label="Code">
                    <input name="code" required />
                  </Field>
                  <Field label="Degree level">
                    <select name="degree_level">
                      <option>UG</option>
                      <option>PG</option>
                    </select>
                  </Field>
                  <Field label="Duration in years">
                    <input
                      type="number"
                      name="duration_years"
                      required
                      min={1}
                      max={10}
                    />
                  </Field>
                </>
              )}
              <Button type="submit" disabled={action.busy}>
                Add record
              </Button>
            </form>
          </Panel>
        )}
        <Panel title="Academic calendar">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Starts</th>
                <th>Ends</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.id}>
                  <td>{y.label}</td>
                  <td>{y.starts_on}</td>
                  <td>{y.ends_on}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-4 font-semibold">Holidays</h3>
          {holidays.length === 0 && (
            <p className="workspace-note">No holidays recorded.</p>
          )}
          {holidays
            .slice()
            .sort((a, b) => a.day.localeCompare(b.day))
            .map((h) => (
              <div key={h.id} className="flex justify-between py-2">
                <span>
                  {h.day} · {h.name}
                </span>
                {admin && (
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      action.run(
                        () =>
                          writePortal(async () => {
                            const { error } = await requireSupabase()
                              .from('academic_holidays')
                              .delete()
                              .eq('id', h.id);
                            if (error) throw new Error(error.message);
                          }),
                        'Holiday removed.',
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
        </Panel>
      </div>
      {action.feedback}
    </div>
  );
}
