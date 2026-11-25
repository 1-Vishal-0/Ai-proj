import React from 'react';
<<<<<<< HEAD
import { usePendingSlots } from '../../workspace/submissions';
=======
import { pendingSlots } from '../../workspace/submissions';
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
import '../../workspace/workspace.css';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,

  BookMarked,
  Clock,
  Download,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { studentsService } from '../../../services/students.service';
import { facultyService } from '../../../services/faculty.service';
import { academicsService } from '../../../services/academics.service';
import { attendanceService } from '../../../services/attendance.service';
import { analyticsService } from '../../../services/analytics.service';
import { requestsService } from '../../../services/requests.service';
import { settingsService } from '../../../services/settings.service';
import { AttendanceTrendChart } from '../components/AttendanceTrendChart';
import { DepartmentBarChart } from '../components/DepartmentBarChart';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  PageHeader,
  type DataColumn,
} from '../../../components/ui';
import type { AuditLog } from '../../../types';
import { ROUTES } from '../../../app/config/navigation';
import { getTodayIsoDate } from '../../../lib/date';

export const AdminOverviewPage: React.FC = () => {
  useDatabaseVersion();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const today = getTodayIsoDate();

  const students = studentsService.getStudents();
  const teachers = facultyService.getEnrichedTeachers().filter(t => t.user.enabled !== false && !t.user.archived_at);
  const departments = academicsService.getDepartments();

  const settings = settingsService.getSettings();

  const todaySessions = attendanceService.getSessions({ date: today });


  let todayPresent = 0;
  let todayAbsent = 0;
  let todayLeave = 0;

  todaySessions.forEach((session) => {
    const sessionRecs = attendanceService.getRecords(session.id);
    sessionRecs.forEach((r) => {
      if (r.status === 'present') todayPresent++;
      else if (r.status === 'absent') todayAbsent++;
      else if (r.status === 'leave') todayLeave++;
    });
  });

  const todayTotal = todayPresent + todayAbsent + todayLeave;
  const attended = todayPresent + (settings.leave_counts_as_present ? todayLeave : 0);
  const todayAttendance = todayTotal ? Math.round(attended * 100 / todayTotal) + '%' : '—';
<<<<<<< HEAD
  const pendingSchedule = usePendingSlots(today);
  const pending = pendingSchedule.rows;
=======
  const pending = pendingSlots(today);
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71

  const trendData = analyticsService.getAttendanceTrend(7);
  const deptStats = analyticsService.getDepartmentStats().map((item) => ({
    departmentName: item.department.name,
    code: item.department.code,
    attendance: item.averageAttendance,
    students: item.studentCount,
  }));

  const lowAttendanceStudents = analyticsService.getLowAttendanceStudents().filter(s => s.totalClasses > 0 && s.overallPercentage < settings.threshold_percentage);
  const pendingCorrections = requestsService
    .getCorrectionRequests()
    .filter((r) => r.status === 'pending');
  const recentLogs = settingsService.getAuditLogs(6);

  const auditColumns: DataColumn<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      render: (log) => (
        <span className="text-xs text-secondary tabular-nums whitespace-nowrap">
          {new Date(log.timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (log) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary">{log.user_name}</span>
          <Badge variant="neutral">{log.user_role}</Badge>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <span className="text-xs font-medium text-brand-700">
          {log.action}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (log) => (
        <span className="text-secondary max-w-md truncate block">
          {log.details}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={currentUser?.role === 'hod' ? 'Department overview' : 'Institution overview'}
        description={`${settings.institution_name} • ${currentUser?.name || 'Administrator'}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate(ROUTES.ADMIN_TIMETABLE)}
              leftIcon={<Clock className="w-4 h-4" />}
            >
              Timetable
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/catalog')}
              leftIcon={<BookMarked className="w-4 h-4" />}
            >
              Academic catalog
            </Button>
            <Button
              onClick={() => navigate(ROUTES.ADMIN_REPORTS)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Reports
            </Button>
          </>
        }
      />

      {lowAttendanceStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg bg-white border border-amber-300">
          <div className="flex items-start sm:items-center gap-2.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong className="font-medium text-primary">
                {lowAttendanceStudents.length} student(s) below {settings.threshold_percentage}% threshold.
              </strong>{' '}
              <span className="text-secondary">
                Review shortage records before semester examination eligibility lock.
              </span>
            </span>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => navigate('/admin/shortages')}
          >
            Shortage report
          </Button>
        </div>
      )}

      <div className="workspace-metrics">
        {[
          ['Students', students.length, '/admin/students'], ['Active faculty', teachers.length, '/admin/teachers'],
          ['Departments', departments.length, '/admin/academics'], ["Today's attendance", todayAttendance, '/admin/attendance'],
          ['Classes conducted today', todaySessions.length, '/admin/attendance'], ['Pending submissions', pending.length, '/admin/submissions'],
          ['Attendance shortages', lowAttendanceStudents.length, '/admin/shortages'], ['Pending corrections', pendingCorrections.length, '/admin/corrections'],
        ].map(([label,value,path])=><Link key={label} to={String(path)}>{label}<strong>{value}</strong></Link>)}
      </div>

      <Card>
        <CardHeader><CardTitle>Pending actions</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 && pendingCorrections.length === 0 ? <p className="text-sm text-secondary">Attendance submissions and correction reviews are up to date.</p> :
            <div className="grid gap-3 text-sm text-brand-700">
              {pending.length > 0 && <Link to="/admin/submissions">Review {pending.length} outstanding attendance submission{pending.length === 1 ? '' : 's'}</Link>}
              {pendingCorrections.length > 0 && <Link to="/admin/corrections">Review {pendingCorrections.length} pending correction request{pendingCorrections.length === 1 ? '' : 's'}</Link>}
            </div>}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>7-day attendance trend</CardTitle>
              <CardDescription>
                Daily turnout percentage across recorded sessions
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={trendData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Department attendance</CardTitle>
              <CardDescription>
                Average student attendance rate by department
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DepartmentBarChart data={deptStats} />
          </CardContent>
        </Card>
      </div>

      {/* Shortage Watchlist */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Shortage watchlist</CardTitle>
            <CardDescription>
              Students below {settings.threshold_percentage}% attendance threshold
            </CardDescription>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => navigate(ROUTES.ADMIN_REPORTS)}
          >
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {lowAttendanceStudents.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-secondary">
              No recorded student attendance falls below {settings.threshold_percentage}%.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead className="bg-subtle border-b border-border text-xs text-secondary">
                  <tr>
                    <th className="py-2.5 px-4 text-left font-medium">Student</th>
                    <th className="py-2.5 px-4 text-left font-medium">USN</th>
                    <th className="py-2.5 px-4 text-left font-medium">Class</th>
                    <th className="py-2.5 px-4 text-right font-medium">Classes</th>
                    <th className="py-2.5 px-4 text-right font-medium">Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lowAttendanceStudents.slice(0, 6).map((item) => (
                    <tr key={item.student.id} className="hover:bg-subtle/70">
                      <td className="py-3 px-4 font-medium text-primary">
                        <Link to={'/admin/students/'+item.student.id}>{item.student.user.name}</Link>
                      </td>
                      <td className="py-3 px-4 text-secondary tabular-nums">
                        {item.student.roll_number}
                      </td>
                      <td className="py-3 px-4 text-secondary">
                        {item.student.academic_class?.name || item.student.class_id}
                      </td>
                      <td className="py-3 px-4 text-right text-secondary tabular-nums">
                        {item.attended}/{item.totalClasses}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="danger">{item.overallPercentage}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Audit Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-primary">
              Recent audit activity
            </h2>
            <p className="text-xs text-secondary">
              Latest system events across administration, faculty, and students
            </p>
          </div>
          {currentUser?.role === 'admin' && <Button
            size="xs"
            variant="ghost"
            onClick={() => navigate(ROUTES.ADMIN_AUDIT)}
          >
            View all logs
          </Button>}
        </div>

        <DataTable
          data={recentLogs}
          columns={auditColumns}
          keyExtractor={(log) => log.id}
          pageSize={6}
        />
      </div>
    </div>
  );
};
