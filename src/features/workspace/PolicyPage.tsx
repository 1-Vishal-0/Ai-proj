import { useState } from 'react';
import { Button } from '../../components/ui';
import { Field, Panel } from './shared';
import { mutate, useAction, useWorkspace } from './useWorkspace';

export default function PolicyPage() {
  const { settings } = useWorkspace();
  const [name, setName] = useState(settings.short_name);
  const [hod, setHod] = useState(!!settings.hod_roster_management);
  const [notices, setNotices] = useState(settings.notify_timetable !== false);
  const action = useAction();
  return (
    <div className="workspace-page">
      <header>
        <h1>Branding & permissions</h1>
        <p>{settings.institution_name}</p>
      </header>
      <Panel title="Institution preferences">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(
              () =>
                mutate('workspace_preferences', {
                  short_label: name,
                  allow_hod_rosters: hod,
                  timetable_notices: notices,
                }),
              'Preferences saved.',
            );
          }}
        >
          <Field label="Portal display name">
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <label>
            <input
              type="checkbox"
              checked={hod}
              onChange={(e) => setHod(e.target.checked)}
            />{' '}
            Allow department heads to register people and allocate sections in
            their department
          </label>
          <label>
            <input
              type="checkbox"
              checked={notices}
              onChange={(e) => setNotices(e.target.checked)}
            />{' '}
            Notify students about timetable changes
          </label>
          <Button type="submit" disabled={action.busy}>
            Save preferences
          </Button>
          {action.feedback}
        </form>
      </Panel>
    </div>
  );
}
