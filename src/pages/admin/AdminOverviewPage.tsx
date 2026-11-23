import React from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  FileCheck2,
  TrendingDown,
  ShieldAlert,
  Clock,
  CheckCircle2,
  School,
  Layers,
  Award,
  BookMarked
} from 'lucide-react';
import { db } from '../../services/db/database';
import { AttendanceTrendChart } from '../../components/analytics/AttendanceTrendChart';
import { DepartmentBarChart } from '../../components/analytics/DepartmentBarChart';
import { StatusPieChart } from '../../components/analytics/StatusPieChart';
import { Badge } from '../../components/common/Badge';

interface AdminOverviewPageProps {
  onNavigate: (viewId: string) => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ onNavigate }) => {
  const students = db.getStudents();
  const teachers = db.getTeachers();
  const classes = db.getClasses();
  const departments = db.getDepartments();
  const schemes = db.getVTUSchemes();
  const settings = db.getSettings();

  // Calculate today's attendance
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = db.getSessions({ date: today });
  const allRecords = db.getRecords();

  let todayPresent = 0;
  let todayAbsent = 0;
  let todayLeave = 0;

  todaySessions.forEach((session) => {
    const sessionRecs = db.getRecords(session.id);
    sessionRecs.forEach((r) => {
      if (r.status === 'present') todayPresent++;
      else if (r.status === 'absent') todayAbsent++;
      else if (r.status === 'leave') todayLeave++;
    });
  });

  const todayTotal = todayPresent + todayAbsent + todayLeave;
  // If no sessions yet today, provide overall institution average
  let totalPresentCount = 0;
  let totalRecordCount = allRecords.length;
  allRecords.forEach((r) => {
    if (r.status === 'present') totalPresentCount++;
  });

  const institutionAvgPct =
    totalRecordCount > 0 ? Math.round((totalPresentCount / totalRecordCount) * 1000) / 10 : 88.5;

  const todayAttendancePct =
    todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 1000) / 10 : institutionAvgPct;

  // Trend data for past 7 days
  const trendData = db.getAttendanceTrend(7);

  // Department statistics
  const deptStats = db.getDepartmentStats().map((item) => ({
    departmentName: item.department.name,
    code: item.department.code,
    attendance: item.averageAttendance,
    students: item.studentCount,
  }));

  // Low attendance students
  const lowAttendanceStudents = db.getLowAttendanceStudents();

  // Pending correction requests
  const pendingCorrections = db.getCorrectionRequests().filter((r) => r.status === 'pending');

  // Recent audit logs
  const recentLogs = db.getAuditLogs(6);

  // Status breakdown total
  let allPresent = 0;
  let allAbsent = 0;
  let allLeave = 0;
  allRecords.forEach((r) => {
    if (r.status === 'present') allPresent++;
    else if (r.status === 'absent') allAbsent++;
    else if (r.status === 'leave') allLeave++;
  });

  return (
    <div className="space-y-6">
      {/* Institutional Identification Header */}
      <div className="bg-[#0f172a] text-white p-5 rounded-xl border border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow border border-blue-500/30 shrink-0">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-900/80 text-blue-200 border border-blue-700 px-2 py-0.5 rounded">
                College of Engineering & Technology
              </span>
              <span className="text-xs text-slate-400">Autonomous Academic Institution</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white mt-1">
              Institutional Administration & Academic Management Console
            </h1>
            <p className="text-xs text-slate-400">
              Dr. A.G. Nataraj • Professor & HOD • University Campus, Bengaluru
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => onNavigate('admin-schemes')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
          >
            <BookMarked className="w-4 h-4" />
            <span>Academic Schemes</span>
          </button>
          <button
            onClick={() => onNavigate('admin-timetable')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition"
          >
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Master Timetables</span>
          </button>
          <button
            onClick={() => onNavigate('admin-reports')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Reports & CSV</span>
          </button>
        </div>
      </div>

      {/* Top Banner Alert if low attendance students exist */}
      {lowAttendanceStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Attendance Shortage Notice: {lowAttendanceStudents.length} Student(s) Below Minimum {settings.threshold_percentage}% Regulatory Limit
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Students below the 75% limit are at risk of semester debarment. Warning notices should be issued.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('admin-reports')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition shrink-0"
          >
            Review Defaulters
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Students</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{students.length}</span>
            <span className="text-xs text-slate-500">Student Records</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>{departments.length} Depts • {schemes.length} Schemes</span>
            <button
              onClick={() => onNavigate('admin-students')}
              className="text-blue-600 font-medium hover:underline flex items-center gap-0.5"
            >
              Directory <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Total Faculty */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty Members</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{teachers.length}</span>
            <span className="text-xs text-slate-500">Faculty Staff</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Workload & Subject Mappings</span>
            <button
              onClick={() => onNavigate('admin-teachers')}
              className="text-blue-600 font-medium hover:underline flex items-center gap-0.5"
            >
              Faculty list <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Today's Attendance Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campus Turnout Rate</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{todayAttendancePct}%</span>
            <span className={`text-xs font-semibold ${todayAttendancePct >= settings.threshold_percentage ? 'text-emerald-600' : 'text-rose-600'}`}>
              {todayAttendancePct >= settings.threshold_percentage ? 'Satisfactory' : 'Action Needed'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>Minimum: {settings.threshold_percentage}%</span>
            <button
              onClick={() => onNavigate('admin-attendance')}
              className="text-blue-600 font-medium hover:underline flex items-center gap-0.5"
            >
              Master log <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Pending Requests & Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Action</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{pendingCorrections.length}</span>
            <span className="text-xs text-slate-500">Correction Disputes</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>{lowAttendanceStudents.length} Defaulters flagged</span>
            <span className="text-amber-600 font-medium font-mono text-[10px]">Audit Ready</span>
          </div>
        </div>
      </div>

      {/* Quick Nav Pills for Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('admin-schemes')}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition flex items-center gap-3"
        >
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <BookMarked className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Academic Schemes</p>
            <p className="text-[10px] text-slate-400">Curriculum Regulations</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('admin-subjects')}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left transition flex items-center gap-3"
        >
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Subject Master</p>
            <p className="text-[10px] text-slate-400">Course Codes & Credits</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('admin-timetable')}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-left transition flex items-center gap-3"
        >
          <div className="p-2 bg-blue-50 text-blue-700 rounded shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Master Timetable</p>
            <p className="text-[10px] text-slate-400">Classrooms & Schedule</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('admin-teachers')}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-left transition flex items-center gap-3"
        >
          <div className="p-2 bg-slate-100 text-slate-700 rounded shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Faculty Allocations</p>
            <p className="text-[10px] text-slate-400">Subject Workload</p>
          </div>
        </button>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Institutional Attendance Trend</h3>
              <p className="text-xs text-slate-500">Daily average percentage across all academic departments</p>
            </div>
            <Badge variant="primary" dot>Real-Time Data Feed</Badge>
          </div>
          <AttendanceTrendChart data={trendData} />
        </div>

        {/* Overall Status Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900">Attendance Distribution</h3>
            <p className="text-xs text-slate-500">Total historical records breakdown</p>
          </div>
          <StatusPieChart present={allPresent} absent={allAbsent} leave={allLeave} />
        </div>
      </div>

      {/* Department Breakdown & Low Attendance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department-Wise Statistics */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Department Performance Comparison</h3>
              <p className="text-xs text-slate-500">Average attendance percentage across all 11 engineering departments</p>
            </div>
          </div>
          <DepartmentBarChart data={deptStats} />
        </div>

        {/* Low Attendance Students Shortage List */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Critical Low Attendance Watchlist
              </h3>
              <p className="text-xs text-slate-500">Students below {settings.threshold_percentage}% mandatory regulatory threshold</p>
            </div>
            <button
              onClick={() => onNavigate('admin-reports')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Export CSV
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-64">
            {lowAttendanceStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                All students currently meet or exceed the {settings.threshold_percentage}% threshold requirement.
              </div>
            ) : (
              lowAttendanceStudents.map((item) => (
                <div key={item.student.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.student.user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60'}
                      alt={item.student.user.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.student.user.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Roll No: <span className="font-mono text-blue-700 font-bold">{item.student.roll_number}</span> • Class: {item.student.academic_class?.name || item.student.class_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
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

      {/* Recent System Audit Trail */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Recent Institutional Activity & Audit Trail
            </h3>
            <p className="text-xs text-slate-500">Real-time log of attendance sessions, modifications, and system actions</p>
          </div>
          <button
            onClick={() => onNavigate('admin-audit')}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Full Audit Logs →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User & Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-800">{log.user_name}</span>
                    <span className="ml-1 text-[10px] text-slate-400 capitalize">({log.user_role})</span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-blue-600 font-medium">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-md truncate">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};