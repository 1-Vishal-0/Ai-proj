import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Users,
  Check,
  X,
  AlertCircle,
  FileCheck2
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { AttendanceStatus } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface QuickAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  subjectId: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  onSaved?: () => void;
}

export const QuickAttendanceModal: React.FC<QuickAttendanceModalProps> = ({
  isOpen,
  onClose,
  classId,
  subjectId,
  sessionDate: initialDate,
  startTime: initialStartTime,
  endTime: initialEndTime,
  onSaved,
}) => {
  const { currentUser, currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id || 'teacher-amcec-1';

  const [sessionDate, setSessionDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState<string>(initialStartTime || '09:00');
  const [endTime, setEndTime] = useState<string>(initialEndTime || '10:00');
  const [rosterMap, setRosterMap] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const academicClass = db.getClasses().find((c) => c.id === classId);
  const subject = db.getSubjects().find((s) => s.id === subjectId);
  const classStudents = db.getEnrichedStudents().filter((s) => s.class_id === classId);

  // Sync state on modal open or parameter change
  useEffect(() => {
    if (!isOpen) return;

    setSaveSuccessMsg(null);
    setSaveError(null);

    const targetDate = initialDate || new Date().toISOString().split('T')[0];
    setSessionDate(targetDate);
    if (initialStartTime) setStartTime(initialStartTime);
    if (initialEndTime) setEndTime(initialEndTime);

    // Check if session exists in DB
    const existingSession = db.getSessions().find(
      (s) => s.class_id === classId && s.subject_id === subjectId && s.date === targetDate
    );

    if (existingSession) {
      setActiveSessionId(existingSession.id);
      setStartTime(existingSession.start_time);
      setEndTime(existingSession.end_time);

      const existingRecords = db.getRecords(existingSession.id);
      const newMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};

      classStudents.forEach((student) => {
        const found = existingRecords.find((r) => r.student_id === student.id);
        if (found) {
          newMap[student.id] = { status: found.status, remarks: found.remarks || '' };
        } else {
          newMap[student.id] = { status: 'present', remarks: '' };
        }
      });
      setRosterMap(newMap);
    } else {
      setActiveSessionId(null);
      const newMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};
      classStudents.forEach((student) => {
        newMap[student.id] = { status: 'present', remarks: '' };
      });
      setRosterMap(newMap);
    }
  }, [isOpen, classId, subjectId, initialDate, initialStartTime, initialEndTime]);

  // Bulk actions
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated = { ...rosterMap };
    classStudents.forEach((student) => {
      updated[student.id] = {
        status,
        remarks: updated[student.id]?.remarks || '',
      };
    });
    setRosterMap(updated);
  };

  const handleToggleStatus = (studentId: string, status: AttendanceStatus) => {
    setRosterMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
        remarks: prev[studentId]?.remarks || '',
      },
    }));
  };

  // Counts
  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  Object.values(rosterMap).forEach((val) => {
    if (val.status === 'present') presentCount++;
    else if (val.status === 'absent') absentCount++;
    else if (val.status === 'leave') leaveCount++;
  });

  const totalMarked = presentCount + absentCount + leaveCount;
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0;

  // Submit attendance
  const handleSubmitAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);
    setSaveError(null);
    setSaveSuccessMsg(null);

    try {
      let sessionId = activeSessionId;

      if (!sessionId) {
        const newSession = db.createSession(
          {
            class_id: classId,
            subject_id: subjectId,
            teacher_id: teacherId,
            date: sessionDate,
            start_time: startTime,
            end_time: endTime,
            session_type: 'lecture',
            is_code_active: false,
          },
          currentUser.id
        );
        sessionId = newSession.id;
        setActiveSessionId(sessionId);
      }

      // Batch attendance records
      const recordsToSave = classStudents.map((s) => ({
        session_id: sessionId!,
        student_id: s.id,
        status: rosterMap[s.id]?.status || ('present' as AttendanceStatus),
        marked_by: 'teacher' as const,
        remarks: rosterMap[s.id]?.remarks || undefined,
      }));

      db.markAttendanceBatch(recordsToSave, currentUser);

      setSaveSuccessMsg(`Attendance recorded successfully for ${presentCount}/${classStudents.length} students present (${attendanceRate}%).`);
      if (onSaved) onSaved();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save attendance records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Take Attendance: ${subject?.code} - ${academicClass?.name}`}
      size="xl"
    >
      <form onSubmit={handleSubmitAttendance} className="space-y-4">
        {/* Class and Session Metadata Banner */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                {subject?.code}
              </span>
              <span className="font-bold text-slate-900">{subject?.name}</span>
            </div>
            <p className="text-slate-500 mt-1">
              Class: <strong className="text-slate-800">{academicClass?.name}</strong> • Scheme: {academicClass?.admission_batch}
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
            <span>Date: <strong>{sessionDate}</strong></span>
            <span>•</span>
            <span>Time: <strong>{startTime} - {endTime}</strong></span>
          </div>
        </div>

        {activeSessionId && (
          <div className="p-2.5 rounded border border-blue-200 bg-blue-50/70 text-blue-800 text-xs flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Attendance previously submitted for this lecture. Modifying will update records in the audit trail.</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {saveError && (
          <div className="p-3 rounded border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Attendance Summary Counters & Quick Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500 font-medium">
              Enrolled: <strong className="text-slate-900 font-mono">{classStudents.length}</strong>
            </span>
            <span className="text-emerald-700 font-medium">
              Present: <strong className="font-mono text-emerald-700 font-bold">{presentCount}</strong>
            </span>
            <span className="text-rose-700 font-medium">
              Absent: <strong className="font-mono text-rose-700 font-bold">{absentCount}</strong>
            </span>
            {leaveCount > 0 && (
              <span className="text-amber-700 font-medium">
                On Leave: <strong className="font-mono text-amber-700">{leaveCount}</strong>
              </span>
            )}
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              {attendanceRate}% Present
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMarkAll('present')}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('absent')}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
            >
              Mark All Absent
            </button>
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Roll No. / ID</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3 text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    No students currently enrolled in this class.
                  </td>
                </tr>
              ) : (
                classStudents.map((s) => {
                  const currentStatus = rosterMap[s.id]?.status || 'present';
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50 transition ${
                        currentStatus === 'absent' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {s.roll_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {s.user.name}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex rounded border border-slate-200 bg-white p-0.5 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s.id, 'present')}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Check className="w-3 h-3" /> Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s.id, 'absent')}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <X className="w-3 h-3" /> Absent
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s.id, 'leave')}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                              currentStatus === 'leave'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || classStudents.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Submit Attendance'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
