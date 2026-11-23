import React, { useState } from 'react';
import {
  CalendarCheck,
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { AttendanceSession, AttendanceRecord, EnrichedStudent, AttendanceStatus } from '../../types';

export const TeacherHistoryPage: React.FC = () => {
  const { currentUser, currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id || 'teacher-amcec-1';

  const [inspectSession, setInspectSession] = useState<AttendanceSession | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('present');
  const [editReason, setEditReason] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const sessions = db.getSessions({ teacher_id: teacherId });
  const classes = db.getClasses();
  const subjects = db.getSubjects();
  const students = db.getEnrichedStudents();

  const inspectRecords = inspectSession
    ? db.getRecords(inspectSession.id).map((r) => {
        const student = students.find((s) => s.id === r.student_id);
        return { ...r, student };
      })
    : [];

  const handleStartEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditStatus(rec.status);
    setEditReason(rec.remarks || '');
    setEditError(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !currentUser) return;

    if (!editReason.trim()) {
      setEditError('Please enter an authorization justification for modifying the record.');
      return;
    }

    try {
      db.markAttendanceBatch(
        [
          {
            session_id: editingRecord.session_id,
            student_id: editingRecord.student_id,
            status: editStatus,
            marked_by: 'correction',
            remarks: `Teacher authorized edit: ${editReason.trim()}`,
          },
        ],
        currentUser
      );

      setEditingRecord(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update record');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Attendance Session History & Records</h2>
        <p className="text-xs text-slate-500">
          Review all conducted lecture sessions and authorized historical attendance adjustments
        </p>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Course Subject</th>
                <th className="py-3 px-4">Target Class</th>
                <th className="py-3 px-4">Mode / Proxy Code</th>
                <th className="py-3 px-4">Turnout</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No attendance sessions recorded yet.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const sub = subjects.find((s) => s.id === sess.subject_id);
                  const cls = classes.find((c) => c.id === sess.class_id);
                  const records = db.getRecords(sess.id);
                  const presentCount = records.filter((r) => r.status === 'present').length;
                  const pct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{sess.date}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {sess.start_time} - {sess.end_time} ({sess.session_type})
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{sub?.name || sess.subject_id}</p>
                        <p className="text-[10px] text-blue-600 font-mono">{sub?.code}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {cls?.name || sess.class_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          {sess.timetable_entry_id ? 'Timetable' : 'Direct'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{pct}%</span>
                          <span className="text-[10px] text-slate-400">
                            ({presentCount}/{records.length})
                          </span>
                        </div>
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setInspectSession(sess)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Roster</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roster & Authorized Correction Modal */}
      {inspectSession && (
        <Modal
          isOpen={true}
          onClose={() => setInspectSession(null)}
          title={`Attendance Roster: ${inspectSession.date}`}
          description={`Class: ${
            classes.find((c) => c.id === inspectSession.class_id)?.name
          } • Subject: ${
            subjects.find((s) => s.id === inspectSession.subject_id)?.name
          }`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-medium">
                Click "Edit" on any record to perform an authorized correction with audit logging.
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {inspectRecords.map((rec) => (
                <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition">
                  <div className="flex items-center gap-3">
                    <img
                      src={rec.student?.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                      alt={rec.student?.user.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{rec.student?.user.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {rec.student?.roll_number} • Marked via: {rec.marked_by}
                      </p>
                      {rec.remarks && (
                        <p className="text-[10px] text-slate-400 italic">"{rec.remarks}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        rec.status === 'present'
                          ? 'success'
                          : rec.status === 'absent'
                          ? 'danger'
                          : 'warning'
                      }
                      dot
                    >
                      {rec.status.toUpperCase()}
                    </Badge>
                    <button
                      onClick={() => handleStartEdit(rec)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Authorized Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectSession(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
              >
                Close Roster
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Record Sub-Modal */}
      {editingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRecord(null)}
          title="Authorized Attendance Record Correction"
          description="Update attendance status with mandatory justification for the audit log"
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {editError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Attendance Status *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['present', 'absent', 'leave'] as AttendanceStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEditStatus(st)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold capitalize transition ${
                      editStatus === st
                        ? st === 'present'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : st === 'absent'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorization Justification / Reason *
              </label>
              <textarea
                required
                rows={3}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Verified student medical certificate presented at faculty office..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                Save Correction
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
