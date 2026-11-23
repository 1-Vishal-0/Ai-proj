import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building,
  Bell,
  Clock,
  RotateCcw
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';

export const AdminSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const currentSettings = db.getSettings();

  const [threshold, setThreshold] = useState(currentSettings.threshold_percentage);
  const [warningThreshold, setWarningThreshold] = useState(currentSettings.warning_threshold);
  const [instName, setInstName] = useState(currentSettings.institution_name);
  const [term, setTerm] = useState(currentSettings.academic_term);
  const [autoAlerts, setAutoAlerts] = useState(currentSettings.auto_alerts_enabled);
  const [defaultDuration, setDefaultDuration] = useState(currentSettings.code_duration_minutes_default || 10);

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    db.updateSettings(
      {
        threshold_percentage: Number(threshold),
        warning_threshold: Number(warningThreshold),
        institution_name: instName.trim(),
        academic_term: term.trim(),
        auto_alerts_enabled: autoAlerts,
        code_duration_minutes_default: Number(defaultDuration),
      },
      currentUser
    );

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Institutional Attendance Thresholds & Settings</h2>
        <p className="text-xs text-slate-500">
          Define global academic attendance criteria, default code timeouts, and automated alerts
        </p>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Institutional configurations updated successfully in relational database.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Attendance Thresholds Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Attendance Eligibility Criteria
            </h3>
            <p className="text-xs text-slate-500">
              Set the minimum percentage of lectures students must attend to remain eligible for examinations
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Exam Threshold (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Students below this percentage are classified into the Defalcation Shortage List. Standard: 75%.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Early Warning Threshold (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-amber-600 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Students falling between this limit and mandatory threshold receive advisory notifications. Standard: 80%.
              </p>
            </div>
          </div>
        </div>

        {/* Institution Branding & Term */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Institutional Identity & Term
            </h3>
            <p className="text-xs text-slate-500">
              Information displayed across reports, transcripts, and student dashboards
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institution Name
              </label>
              <input
                type="text"
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Academic Term
              </label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Timetable Session & Notification Defaults */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Attendance Session & Notification Defaults
            </h3>
            <p className="text-xs text-slate-500">
              Default duration for active lecture sessions and automated student alert thresholds
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard Lecture Session Duration (Minutes)
              </label>
              <input
                type="number"
                min={15}
                max={180}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Standard: 60 minutes per lecture period / 120 minutes per lab.
              </p>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAlerts}
                  onChange={(e) => setAutoAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    Enable Automated Low Attendance In-App Alerts
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Automatically dispatch alerts to students when their percentage drops below threshold.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Institutional Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
