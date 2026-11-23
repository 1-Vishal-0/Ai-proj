import React, { useState } from 'react';
import {
  AlertTriangle,
  Mail,
  Send,
  Phone,
  CheckCircle2,
  TrendingDown,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EnrichedStudent } from '../../types';

export const TeacherLowAttendancePage: React.FC = () => {
  const { currentUser, currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id || 'teacher-amcec-1';
  const settings = db.getSettings();

  const assignments = db.getTeacherAssignments(teacherId);
  const assignedClassIds = new Set(assignments.map((a) => a.class_id));

  // Low attendance students
  const lowStudents = db
    .getLowAttendanceStudents(settings.threshold_percentage)
    .filter((item) => assignedClassIds.has(item.student.class_id));

  // Alert email modal state
  const [selectedStudent, setSelectedStudent] = useState<EnrichedStudent | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleOpenAlert = (student: EnrichedStudent, pct: number) => {
    setSelectedStudent(student);
    setEmailSubject(`Academic Warning: Low Attendance Notice for ${student.user.name}`);
    setEmailBody(
      `Dear Parent / Guardian of ${student.user.name} (Roll: ${student.roll_number}),\n\nThis is an official academic notice from ${currentUser?.name} at ${settings.institution_name}.\n\nThe student's current attendance rate has fallen to ${pct}%, which is below the mandatory ${settings.threshold_percentage}% institutional requirement for final examination eligibility.\n\nPlease ensure your ward attends all upcoming lectures and contacts the department office.\n\nRegards,\n${currentUser?.name}\nFaculty of Computer Science`
    );
    setSendSuccess(false);
  };

  const handleSendSimulatedEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !currentUser) return;

    // Create in-app alert notification
    db.createNotification({
      user_id: selectedStudent.user_id,
      title: 'Formal Attendance Advisory from Faculty',
      message: emailBody,
      type: 'alert',
      link: '/student/dashboard',
    });

    // Log audit
    db.logAudit({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: 'teacher',
      action: 'DISPATCH_LOW_ATTENDANCE_WARNING',
      entity: 'Student',
      entity_id: selectedStudent.id,
      details: `Dispatched formal low attendance warning to ${selectedStudent.user.name} (${selectedStudent.roll_number}) and guardian ${selectedStudent.guardian_email}`,
    });

    setSendSuccess(true);
    setTimeout(() => {
      setSelectedStudent(null);
      setSendSuccess(false);
    }, 2000);
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Low Attendance & Defalcation Tracking</h2>
        <p className="text-xs text-slate-500">
          Identify students below the {settings.threshold_percentage}% threshold and issue formal advisory notices
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Below Threshold</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{lowStudents.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Students below {settings.threshold_percentage}%</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Declining Attendance</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {lowStudents.filter((s) => s.declining).length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Missed 2+ consecutive lectures</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Exam Debarment Risk</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {lowStudents.filter((s) => s.overallPercentage < 60).length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Critically low (&lt;60%)</p>
        </div>
      </div>

      {/* Low Students List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Flagged Students Roster
          </h3>
          <Badge variant="danger" dot>Threshold: {settings.threshold_percentage}%</Badge>
        </div>

        <div className="divide-y divide-slate-100">
          {lowStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              All students in your assigned courses currently maintain satisfactory attendance!
            </div>
          ) : (
            lowStudents.map((item) => (
              <div key={item.student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                <div className="flex items-center gap-3">
                  <img
                    src={item.student.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                    alt={item.student.user.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{item.student.user.name}</h4>
                      <span className="font-mono text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                        {item.student.roll_number}
                      </span>
                      {item.declining && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <TrendingDown className="w-3 h-3 text-amber-500" /> Declining
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Class: {item.student.academic_class?.name} • Guardian: {item.student.guardian_email || 'N/A'} ({item.student.guardian_phone || 'N/A'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-sm font-bold text-rose-600 font-mono">
                      {item.overallPercentage}%
                    </span>
                    <p className="text-[10px] text-slate-400">
                      Attended {item.attended} of {item.totalClasses} lectures
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenAlert(item.student, item.overallPercentage)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Warning</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Simulated Email / Advisory Modal */}
      {selectedStudent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStudent(null)}
          title={`Dispatch Formal Advisory Notice: ${selectedStudent.user.name}`}
          description={`Guardian Email: ${selectedStudent.guardian_email || 'Not registered'} • Student Portal Notification`}
          maxWidth="lg"
        >
          {sendSuccess ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Warning Dispatched Successfully!</h4>
              <p className="text-xs text-slate-500">
                Notice delivered to student portal and recorded in institutional audit logs.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendSimulatedEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notice Body & Action Plan
                </label>
                <textarea
                  required
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-sans focus:ring-1 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Official Advisory</span>
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};
