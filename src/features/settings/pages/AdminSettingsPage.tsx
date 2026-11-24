import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { settingsService } from '../../../services/settings.service';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
} from '../../../components/ui';

export const AdminSettingsPage: React.FC = () => {
  useDatabaseVersion();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const currentSettings = settingsService.getSettings();

  const [threshold, setThreshold] = useState(currentSettings.threshold_percentage);
  const [warningThreshold, setWarningThreshold] = useState(
    currentSettings.warning_threshold
  );
  const [instName, setInstName] = useState(currentSettings.institution_name);
  const [term, setTerm] = useState(currentSettings.academic_term);
  const [autoAlerts, setAutoAlerts] = useState(currentSettings.auto_alerts_enabled);
  const [leaveCountsAsPresent, setLeaveCountsAsPresent] = useState(
    currentSettings.leave_counts_as_present
  );
  const [defaultDuration, setDefaultDuration] = useState(
    currentSettings.code_duration_minutes_default || 10
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!currentUser) return;

      await settingsService.updateSettings(
        {
          threshold_percentage: Number(threshold),
          warning_threshold: Number(warningThreshold),
          institution_name: instName.trim(),
          academic_term: term.trim(),
          auto_alerts_enabled: autoAlerts,
          leave_counts_as_present: leaveCountsAsPresent,
          code_duration_minutes_default: Number(defaultDuration),
        },
        currentUser
      );

      toast({
        variant: 'success',
        title: 'Configuration saved',
        description: 'Institutional thresholds and rules updated.',
      });
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to save settings', description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Thresholds & Settings"
        description="Global academic attendance eligibility rules, term branding and session defaults"
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attendance Eligibility Thresholds</CardTitle>
              <CardDescription>
                Minimum lecture attendance percentages required for examination eligibility
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Mandatory Exam Threshold"
              type="number"
              min={50}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              rightElement={<span className="text-xs font-mono">%</span>}
              hint="Students below this percentage enter the shortage watchlist (Standard: 75%)."
            />

            <Input
              label="Early Warning Threshold"
              type="number"
              min={50}
              max={100}
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(Number(e.target.value))}
              rightElement={<span className="text-xs font-mono">%</span>}
              hint="Students below this limit receive early warning standing (Standard: 80%)."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Institutional Identity &amp; Term</CardTitle>
              <CardDescription>
                Displayed across headers, reports and exported CSV sheets
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Institution Name"
              value={instName}
              onChange={(e) => setInstName(e.target.value)}
            />
            <Input
              label="Active Academic Term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Calculation &amp; Session Rules</CardTitle>
              <CardDescription>
                Configure leave counting behavior, session code validity and alert preferences
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="max-w-xs">
              <Input
                label="Default Session Code Window (Minutes)"
                type="number"
                min={5}
                max={180}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                hint="Default validity window for live session check-in codes."
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={leaveCountsAsPresent}
                  onChange={(e) => setLeaveCountsAsPresent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-medium text-primary block">
                    Count sanctioned leave towards attended lectures
                  </span>
                  <span className="text-[11px] text-secondary">
                    When enabled, approved medical/duty leave records count positively in student attendance percentages.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAlerts}
                  onChange={(e) => setAutoAlerts(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-medium text-primary block">
                    Enable in-app low attendance alerts
                  </span>
                  <span className="text-[11px] text-secondary">
                    Flag shortage advisories on student dashboards when attendance drops below threshold.
                  </span>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="md"
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
