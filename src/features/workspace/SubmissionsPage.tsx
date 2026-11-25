import { useState } from 'react';
import { getTodayIsoDate } from '../../lib/date';
import { Field, Panel } from './shared';
import { useWorkspace } from './useWorkspace';
import { usePendingSlots } from './submissions';
export default function SubmissionsPage() {
  useWorkspace();
  const [date, setDate] = useState(getTodayIsoDate);
  const [query, setQuery] = useState('');
  const pending = usePendingSlots(date);
  const rows = pending.rows.filter((s) =>
    [s.teacher, s.section, s.title]
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="workspace-page">
      <header>
        <h1>Pending attendance</h1>
        <p>Elapsed periods on the current timetable without a submitted roster for the selected date. Holidays are excluded.</p>
      </header>
      <div className="workspace-split">
        <Panel title="Filters">
          <div className="workspace-fields">
            <Field label="Teaching date">
              <input
                type="date"
                max={getTodayIsoDate()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Faculty, subject or section">
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </Field>
          </div>
        </Panel>
        <Panel title={rows.length + ' pending submissions'}>
          {pending.error ? <p role="alert">{pending.error}</p> : pending.loading ? <p role="status">Loading scheduled lectures…</p> : rows.length ? (
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>Faculty</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.time.slice(0, 5)}</td>
                    <td>{s.section}</td>
                    <td>{s.title}</td>
                    <td>{s.teacher}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No outstanding submissions for these filters.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
