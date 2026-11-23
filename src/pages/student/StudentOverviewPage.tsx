import React from 'react';
import {
  CalendarCheck,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  School,
  Bell,
  GraduationCap
} from 'lucide-react';
import { db } from '../../services/db/database';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';

interface StudentOverviewPageProps {
  onNavigate: (viewId: string) => void;
}

export const StudentOverviewPage: React.FC<StudentOverviewPageProps> = ({ onNavigate }) => {
  const { currentUser, currentStudent } = useAuth();
  const studentId = currentStudent?.id || 'stu-amcec-1';
  const settings = db.getSettings();

  const student = db.getEnrichedStudent(studentId);
  const overallStats = db.calculateStudentAttendance(studentId);
  const subjectStats = db.calculateSubjectWiseAttendanceForStudent(studentId);

  // Calculate classes required to reach 75% if below threshold
  const threshold = settings.threshold_percentage;
  const classesNeeded =
    overallStats.percentage < threshold
      ? Math.max(
          0,
          Math.ceil((threshold * overallStats.totalSessions - 100 * overallStats.present) / (100 - threshold))
        )
      : 0;

  // Maximum classes student can miss while staying >= 75%
  const bufferClasses =
    overallStats.percentage >= threshold
      ? Math.floor((100 * overallStats.present - threshold * overallStats.totalSessions) / threshold)
      : 0;

  // Recent attendance records for student
  const studentSessions = student
    ? db.getSessions({ class_id: student.class_id }).slice(0, 5)
    : [];

  // Pending corrections
  const studentCorrections = db
    .getCorrectionRequests()
    .filter((cr) => cr.student_id === studentId);

  // Recent notifications / timetable change alerts
  const studentNotifs = currentUser ? db.getNotifications(currentUser.id).slice(0, 3) : [];

  const getStatusBadge = (status: 'safe' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return <Badge variant="danger" dot>Critical Shortage (&lt;{threshold}%)</Badge>;
      case 'warning':
        return <Badge variant="warning" dot>Warning (&lt;{settings.warning_threshold}%)</Badge>;
      default:
        return <Badge variant="success" dot>Exam Eligible</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Institutional Student Header Banner */}
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
            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              <h1 className="text-base sm:text-lg font-bold text-white">
                {student?.user?.name || 'Rahul M.'}
              </h1>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono font-bold text-xs">
                Roll No: {student?.roll_number || 'ENG22CS089'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              5th Semester, Section A • Scheme: <strong className="text-slate-200">{student?.vtu_scheme?.name || '2022 Regulation'}</strong> • Batch {student?.admission_batch || '2022-2026'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => onNavigate('student-timetable')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition"
          >
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Class Timetable</span>
          </button>
          <button
            onClick={() => onNavigate('student-correction')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Dispute Request</span>
          </button>
        </div>
      </div>

      {/* Low Attendance Warning Alert */}
      {overallStats.percentage < threshold && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900">
                Attendance Shortage Notice: Below {threshold}% Minimum Regulatory Threshold
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Under academic regulations, you must maintain at least 75% attendance to qualify for semester-end examinations. You need to attend the next <strong>{classesNeeded} consecutive lectures</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('student-history')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-700 text-white hover:bg-rose-800 transition shrink-0"
          >
            View Attendance Records
          </button>
        </div>
      )}

      {/* Profile Details & Overall Attendance Meter */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={student?.user.avatar_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100'}
            alt={student?.user.name}
            className="w-16 h-16 rounded-lg object-cover ring-1 ring-slate-200 shadow-xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{student?.user.name}</h2>
              {getStatusBadge(overallStats.status)}
            </div>
            <p className="text-xs text-slate-600 font-mono mt-0.5">
              Roll No: <strong className="text-blue-700">{student?.roll_number}</strong> • Class: {student?.academic_class?.name}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Department of Computer Science & Engineering • Academic Year 2026-2027
            </p>
          </div>
        </div>

        {/* Aggregate Gauge Card */}
        <div className="flex items-center gap-5 bg-slate-50 px-5 py-3.5 rounded-lg border border-slate-200 w-full md:w-auto justify-between md:justify-start">
          <div className="text-center">
            <span
              className={`text-3xl font-extrabold font-mono ${
                overallStats.percentage < threshold
                  ? 'text-rose-600'
                  : overallStats.percentage < settings.warning_threshold
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {overallStats.percentage}%
            </span>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
              Turnout Rate
            </p>
          </div>

          <div className="h-10 w-px bg-slate-200" />

          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Lectures Attended:</span>
              <strong className="text-slate-900 font-mono">
                {overallStats.present} / {overallStats.totalSessions}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Missed:</span>
              <span className="text-rose-600 font-mono font-bold">{overallStats.absent}</span>
              <span className="text-slate-400">• On Leave: {overallStats.leave}</span>
            </div>
            {overallStats.percentage >= threshold ? (
              <p className="text-[10px] text-emerald-700 font-semibold">
                Safe buffer: Can miss {bufferClasses} lecture(s)
              </p>
            ) : (
              <p className="text-[10px] text-rose-700 font-bold">
                Deficit: Must attend {classesNeeded} consecutive lecture(s)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Breakdown Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Enrolled Courses & Attendance Status</h3>
            <p className="text-xs text-slate-500">Subject-wise turnout against {threshold}% minimum examination threshold</p>
          </div>
          <button
            onClick={() => onNavigate('student-timetable')}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5" /> View Timetable
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectStats.map((item) => {
            const isLow = item.percentage < threshold;
            return (
              <div
                key={item.subject.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        {item.subject.code}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">
                        {item.subject.name}
                      </h4>
                    </div>
                    <Badge variant={isLow ? 'danger' : 'success'} dot>
                      {item.percentage}%
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Lectures:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {item.present} / {item.total} Attended
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isLow ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    {item.absent} Absent • {item.leave} Leave
                  </span>
                  <div className="flex items-center gap-1 font-medium">
                    {item.trend === 'declining' ? (
                      <span className="text-rose-600 flex items-center gap-0.5">
                        <TrendingDown className="w-3.5 h-3.5" /> Declining
                      </span>
                    ) : item.trend === 'improving' ? (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" /> Improving
                      </span>
                    ) : (
                      <span className="text-slate-400">Stable</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid: Recent Activity & Timetable Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Lecture Attendance Records */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Lecture Records</h3>
              <p className="text-xs text-slate-500">Latest classroom attendance statuses recorded by faculty</p>
            </div>
            <button
              onClick={() => onNavigate('student-history')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Full Log →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {studentSessions.map((session) => {
              const rec = db.getStudentRecord(session.id, studentId);
              const sub = db.getSubjects().find((s) => s.id === session.subject_id);
              const status = rec?.status || 'absent';

              return (
                <div key={session.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {sub?.code} - {sub?.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {session.date} • {session.start_time} - {session.end_time}
                    </p>
                  </div>
                  <Badge
                    variant={
                      status === 'present'
                        ? 'success'
                        : status === 'absent'
                        ? 'danger'
                        : 'warning'
                    }
                    dot
                  >
                    {status.toUpperCase()}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timetable Notices & Dispute Requests */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-blue-600" />
                  Schedule Updates & Notices
                </h3>
                <p className="text-xs text-slate-500">Timetable rescheduling notices and department alerts</p>
              </div>
              <button
                onClick={() => onNavigate('student-notifications')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                All Notices →
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {studentNotifs.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No new timetable alerts or notices.
                </p>
              ) : (
                studentNotifs.map((n) => (
                  <div key={n.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">{n.title}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Have an attendance discrepancy?</span>
            <button
              onClick={() => onNavigate('student-correction')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Submit Dispute Request →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
