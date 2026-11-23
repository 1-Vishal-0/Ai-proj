import React, { useState } from 'react';
import {
  FileCheck2,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  PlusCircle,
  Calendar,
  BookOpen
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { AttendanceStatus } from '../../types';

export const StudentCorrectionPage: React.FC = () => {
  const { currentStudent } = useAuth();
  const studentId = currentStudent?.id || 'stu-amcec-1';

  const student = db.getEnrichedStudent(studentId);
  const subjects = db.getSubjects();
  const requests = db
    .getCorrectionRequests()
    .filter((r) => r.student_id === studentId);

  // Form states
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || 'sub-bcs501');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('absent');
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>('present');
  const [reason, setReason] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitSuccess(false);

    if (!reason.trim() || reason.trim().length < 10) {
      setFormError('Please enter a comprehensive explanation of at least 10 characters.');
      return;
    }

    try {
      // Find matching session if one exists for that class, subject and date
      const matchingSession = student
        ? db.getSessions({ class_id: student.class_id, subject_id: subjectId, date })[0]
        : undefined;

      const sessionId = matchingSession ? matchingSession.id : `session-dummy-${Date.now()}`;

      db.createCorrectionRequest({
        student_id: studentId,
        session_id: sessionId,
        subject_id: subjectId,
        date,
        current_status: currentStatus,
        requested_status: requestedStatus,
        reason: reason.trim(),
      });

      setReason('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit correction request.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Attendance Correction & Dispute Requests</h2>
        <p className="text-xs text-slate-500">
          Submit formal dispute requests to your course professors for medical leave or legitimate attendance adjustments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: New Request Form */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Submit New Correction Request
            </h3>
            <p className="text-xs text-slate-500">
              Provide verifiable reason and relevant lecture details
            </p>
          </div>

          {submitSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Correction request submitted to faculty professor!</span>
            </div>
          )}

          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Subject *
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} - {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lecture Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recorded Status
                </label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize"
                >
                  <option value="absent">Absent</option>
                  <option value="leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requested Status *
                </label>
                <select
                  value={requestedStatus}
                  onChange={(e) => setRequestedStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize font-bold text-emerald-700"
                >
                  <option value="present">Present</option>
                  <option value="leave">On Leave (Medical)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Reason & Justification *
              </label>
              <textarea
                required
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you were marked absent (e.g. WiFi code submission latency, medical slip submitted, sanctioned competition leave)..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Request to Faculty</span>
            </button>
          </form>
        </div>

        {/* Right Column: Submitted Requests History */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                Submitted Correction Requests History
              </h3>
              <p className="text-xs text-slate-500">
                Track status updates and review comments from your professors
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Total: {requests.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {requests.length === 0 ? (
              <p className="py-12 text-center text-xs text-slate-400">
                You have not submitted any attendance correction requests.
              </p>
            ) : (
              requests.map((req) => {
                const sub = subjects.find((s) => s.id === req.subject_id);

                return (
                  <div key={req.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{sub?.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">({sub?.code})</span>
                      </div>
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'success'
                            : req.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                        dot
                      >
                        {req.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Lecture Date: <strong className="text-slate-800 font-mono">{req.date}</strong></span>
                      <span>•</span>
                      <span>Change: <span className="uppercase font-mono text-rose-600 font-semibold">{req.current_status}</span> → <span className="uppercase font-mono text-emerald-600 font-semibold">{req.requested_status}</span></span>
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      "{req.reason}"
                    </p>

                    {req.review_notes && (
                      <div className="text-[11px] bg-blue-50 text-blue-900 p-2.5 rounded-lg border border-blue-100">
                        <span className="font-bold">Faculty Review Response: </span>
                        {req.review_notes}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400">
                      Submitted on: {new Date(req.created_at).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
