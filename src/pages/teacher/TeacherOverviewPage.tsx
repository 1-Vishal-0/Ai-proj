import React, { useState } from 'react';
import {
  CalendarCheck,
  BookOpen,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  School,
  Building,
  RotateCcw
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { AttendanceTrendChart } from '../../components/analytics/AttendanceTrendChart';
import { DayOfWeek, EnrichedTimetableEntry } from '../../types';
import { QuickAttendanceModal } from '../../components/attendance/QuickAttendanceModal';
import { RescheduleSlotModal } from '../../components/timetable/RescheduleSlotModal';

interface TeacherOverviewPageProps {
  onNavigate: (viewId: string) => void;
}

export const TeacherOverviewPage: React.FC<TeacherOverviewPageProps> = ({ onNavigate }) => {
  const { currentUser, currentTeacher } = useAuth();
  const teacherId = currentTeacher?.id || 'teacher-amcec-1';
  const settings = db.getSettings();

  // Modal states
  const [attendanceModalSlot, setAttendanceModalSlot] = useState<{
    classId: string;
    subjectId: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);

  const [rescheduleSlot, setRescheduleSlot] = useState<EnrichedTimetableEntry | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Teacher assignments
  const assignments = db.getTeacherAssignments(teacherId);
  const assignedSubjectIds = new Set(assignments.map((a) => a.subject_id));
  const assignedClassIds = new Set(assignments.map((a) => a.class_id));

  const allSubjects = db.getSubjects().filter((s) => assignedSubjectIds.has(s.id));
  const allClasses = db.getClasses().filter((c) => assignedClassIds.has(c.id));

  // Sessions conducted by this teacher
  const teacherSessions = db.getSessions({ teacher_id: teacherId });
  const recentSessions = teacherSessions.slice(0, 5);

  // Today's Timetable Schedule for Faculty
  const dayNames: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIdx = new Date().getDay();
  const currentDayName: DayOfWeek = todayIdx >= 1 && todayIdx <= 6 ? dayNames[todayIdx - 1] : 'Monday';
  const todayDateStr = new Date().toISOString().split('T')[0];

  const todaySchedule = db.getEnrichedTimetable(teacherId).filter((t) => t.day_of_week === currentDayName);

  // Check how many of today's classes have attendance submitted vs pending
  const todayCompletedCount = todaySchedule.filter((slot) => {
    return teacherSessions.some(
      (s) => s.class_id === slot.class_id && s.subject_id === slot.subject_id && s.date === todayDateStr
    );
  }).length;

  const todayPendingCount = Math.max(0, todaySchedule.length - todayCompletedCount);

  // Low attendance students in teacher's classes (<75%)
  const lowAttendanceStudents = db
    .getLowAttendanceStudents()
    .filter((item) => assignedClassIds.has(item.student.class_id));

  // Pending correction requests
  const pendingCorrections = db
    .getEnrichedCorrectionRequests(teacherId)
    .filter((r) => r.status === 'pending');

  // Recent Timetable Changes
  const timetableChanges = db.getTimetableChangeLogs(teacherId).slice(0, 4);

  // Trend data
  const trendData = db.getAttendanceTrend(7);

  const handleQuickReview = (requestId: string, action: 'approved' | 'rejected') => {
    if (!currentUser) return;
    const note = action === 'approved' ? 'Approved by faculty teacher' : 'Rejected by faculty teacher';
    db.reviewCorrectionRequest(requestId, action, teacherId, note, currentUser);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Institutional Faculty Header */}
      <div className="bg-[#0f172a] text-white p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow border border-blue-500/30 shrink-0">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-900/80 text-blue-200 border border-blue-700 px-2 py-0.5 rounded">
                College of Engineering
              </span>
              <span className="text-xs text-slate-400">Department of Computer Science & Engineering</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white mt-1">
              Faculty Dashboard & Timetable Attendance
            </h1>
            <p className="text-xs text-slate-400">
              Prof. Sandhya S. • Employee ID: <span className="font-mono text-slate-200 font-semibold">{currentTeacher?.employee_id || 'FAC-CSE-028'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => onNavigate('teacher-timetable')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition"
          >
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Manage My Timetable</span>
          </button>
          <button
            onClick={() => onNavigate('teacher-mark')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Manual Attendance Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Classes, Subjects, Today's Pending, Completed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Assigned Classes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Classes</span>
            <div className="p-2 rounded bg-blue-50 text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{allClasses.length}</span>
            <span className="text-xs text-slate-500">Batches</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {allClasses.map((c) => c.name).join(', ') || 'CSE 5th Sem Sec A'}
          </p>
        </div>

        {/* Assigned Subjects */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Subjects</span>
            <div className="p-2 rounded bg-emerald-50 text-emerald-700">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{allSubjects.length}</span>
            <span className="text-xs text-slate-500">Assigned Courses</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {allSubjects.map((s) => s.code).join(', ')}
          </p>
        </div>

        {/* Attendance to Be Submitted */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Be Submitted</span>
            <div className="p-2 rounded bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{todayPendingCount}</span>
            <span className="text-xs text-slate-500">Scheduled Today</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {todayPendingCount === 0 ? 'All attendance marked today' : 'Pending attendance submission'}
          </p>
        </div>

        {/* Completed Sessions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Sessions</span>
            <div className="p-2 rounded bg-indigo-50 text-indigo-700">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{teacherSessions.length}</span>
            <span className="text-xs text-slate-500">Lectures Held</span>
          </div>
          <button
            onClick={() => onNavigate('teacher-history')}
            className="text-[11px] text-blue-600 font-medium hover:underline mt-1 inline-flex items-center gap-0.5"
          >
            Attendance records →
          </button>
        </div>
      </div>

      {/* Today's Timetable with 1-Click Take Attendance */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Today's Teaching Schedule ({currentDayName}, {todayDateStr})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Click "Take Attendance" on any scheduled period to mark present/absent roster
            </p>
          </div>

          <button
            onClick={() => onNavigate('teacher-timetable')}
            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Weekly Master Timetable</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
            No lecture periods scheduled for today ({currentDayName}).
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {todaySchedule.map((slot) => {
              const isSubmitted = teacherSessions.some(
                (s) => s.class_id === slot.class_id && s.subject_id === slot.subject_id && s.date === todayDateStr
              );

              return (
                <div
                  key={slot.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded bg-slate-100 text-slate-800 font-mono text-center w-20 shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Period</span>
                      <span className="text-lg font-extrabold">{slot.period_number}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {slot.subject?.code}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900">{slot.subject?.name}</h3>
                      </div>
                      <p className="text-xs text-slate-600">
                        Class: <strong>{slot.academic_class?.name}</strong> • Classroom: <strong>{slot.classroom}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {slot.start_time} - {slot.end_time} ({slot.subject?.credits} Credits • {slot.subject?.category})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {isSubmitted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        To Be Submitted
                      </span>
                    )}

                    <button
                      onClick={() =>
                        setAttendanceModalSlot({
                          classId: slot.class_id,
                          subjectId: slot.subject_id,
                          startTime: slot.start_time,
                          endTime: slot.end_time,
                        })
                      }
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>{isSubmitted ? 'Edit Attendance' : 'Take Attendance'}</span>
                    </button>

                    <button
                      onClick={() => setRescheduleSlot(slot)}
                      title="Reschedule Class Timing / Classroom"
                      className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Grid: Attendance Turnout & Low Attendance Defaulters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Turnout Trend Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance Turnout Trend (Last 7 Days)</h3>
              <p className="text-xs text-slate-500">Student participation rates across your assigned courses</p>
            </div>
            <button
              onClick={() => onNavigate('teacher-reports')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Export Reports →
            </button>
          </div>
          <AttendanceTrendChart data={trendData} />
        </div>

        {/* Low Attendance Students (<75%) Watchlist */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Students Below {settings.threshold_percentage}%
              </h3>
              <p className="text-xs text-slate-500">{lowAttendanceStudents.length} student(s) at debarment risk</p>
            </div>
            <button
              onClick={() => onNavigate('teacher-low')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Full List
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-72">
            {lowAttendanceStudents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                All students currently meet the {settings.threshold_percentage}% regulatory attendance requirement.
              </div>
            ) : (
              lowAttendanceStudents.slice(0, 5).map((item) => (
                <div
                  key={item.student.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900">{item.student.user.name}</p>
                    <p className="text-[10px] font-mono text-slate-500 font-semibold">
                      {item.student.roll_number} • {item.student.academic_class?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-xs">
                      {item.overallPercentage}%
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Attended {item.attended}/{item.totalClasses}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Timetable Changes & Pending Disputes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Timetable Schedule Changes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Timetable Change Log
              </h3>
              <p className="text-xs text-slate-500">History of lecture rescheduling and timing updates</p>
            </div>
            <button
              onClick={() => onNavigate('teacher-timetable')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Manage Schedule →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {timetableChanges.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No recent timetable changes recorded.
              </p>
            ) : (
              timetableChanges.map((log) => (
                <div key={log.id} className="py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {log.subject_code} ({log.class_name})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Moved from <span className="line-through text-slate-400">{log.old_day} P{log.old_period} ({log.old_classroom})</span> to{' '}
                    <strong className="text-blue-700">{log.new_day} P{log.new_period} ({log.new_classroom})</strong>
                  </p>
                  <p className="text-[10px] text-slate-500 italic">
                    Reason: "{log.reason}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Attendance Correction Disputes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                Correction Disputes
              </h3>
              <p className="text-xs text-slate-500">{pendingCorrections.length} request(s) awaiting your review</p>
            </div>
            <button
              onClick={() => onNavigate('teacher-corrections')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Review All →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingCorrections.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No pending correction dispute requests.
              </p>
            ) : (
              pendingCorrections.slice(0, 3).map((cr) => (
                <div key={cr.id} className="py-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{cr.student.user.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{cr.student.roll_number}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {cr.subject?.name} • Lecture Date: {cr.date}
                  </p>
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                    "{cr.reason}"
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">
                      Req: <strong className="text-emerald-700 uppercase">{cr.requested_status}</strong>
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleQuickReview(cr.id, 'rejected')}
                        className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold hover:bg-rose-100"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleQuickReview(cr.id, 'approved')}
                        className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 shadow-xs"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Attendance Modal */}
      {attendanceModalSlot && (
        <QuickAttendanceModal
          isOpen={true}
          onClose={() => setAttendanceModalSlot(null)}
          classId={attendanceModalSlot.classId}
          subjectId={attendanceModalSlot.subjectId}
          startTime={attendanceModalSlot.startTime}
          endTime={attendanceModalSlot.endTime}
          onSaved={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* Reschedule Slot Modal */}
      {rescheduleSlot && (
        <RescheduleSlotModal
          isOpen={true}
          onClose={() => setRescheduleSlot(null)}
          slot={rescheduleSlot}
          onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </div>
  );
};
