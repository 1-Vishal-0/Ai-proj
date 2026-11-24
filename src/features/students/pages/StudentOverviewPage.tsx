import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Clock,
  FileCheck2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { studentsService } from '../../../services/students.service';
import { attendanceService } from '../../../services/attendance.service';
import { academicsService } from '../../../services/academics.service';
import { notificationsService } from '../../../services/notifications.service';
import { settingsService } from '../../../services/settings.service';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  PageHeader,
  ProgressBar,
  type DataColumn,
} from '../../../components/ui';
import { ROUTES } from '../../../app/config/navigation';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';
import {
  calculateClassesNeededForThreshold,
  calculateSafeAbsenceBuffer,
} from '../../../lib/attendance';

type SubjectStatRow = ReturnType<
  typeof attendanceService.calculateSubjectWiseAttendanceForStudent
>[number];

export const StudentOverviewPage: React.FC = () => {
  useDatabaseVersion();
  const navigate = useNavigate();
  const { currentUser, currentStudent } = useAuth();
  const studentId =
    currentStudent?.id || INSTITUTION_CONFIG.academicDefaults.defaultStudentId;
  const settings = settingsService.getSettings();

  const student = studentsService.getEnrichedStudent(studentId);
  const overallStats = attendanceService.calculateStudentAttendance(studentId);
  const subjectStats =
    attendanceService.calculateSubjectWiseAttendanceForStudent(studentId);
  const subjects = academicsService.getSubjects();

  const threshold = settings.threshold_percentage;
  const classesNeeded = calculateClassesNeededForThreshold(
    overallStats.present,
    overallStats.totalSessions,
    threshold
  );
  const bufferClasses = calculateSafeAbsenceBuffer(
    overallStats.present,
    overallStats.totalSessions,
    threshold
  );

  const studentSessions = student
    ? attendanceService.getSessions({ class_id: student.class_id }).slice(0, 5)
    : [];

  const studentNotifs = currentUser
    ? notificationsService.getNotifications(currentUser.id).slice(0, 3)
    : [];

  const getStatusBadge = (status: 'safe' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return <Badge variant="danger">Shortage (&lt;{threshold}%)</Badge>;
      case 'warning':
        return <Badge variant="warning">At risk (&lt;{settings.warning_threshold}%)</Badge>;
      default:
        return <Badge variant="success">Eligible</Badge>;
    }
  };

  // Show courses with conducted sessions first, then remaining enrolled courses
  const sortedSubjectStats = [...subjectStats].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.subject.code.localeCompare(b.subject.code);
  });

  const subjectColumns: DataColumn<SubjectStatRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (row) => row.subject.name,
      render: (row) => (
        <div>
          <p className="font-medium text-primary">{row.subject.name}</p>
          <p className="text-xs text-secondary tabular-nums">{row.subject.code}</p>
        </div>
      ),
    },
    {
      key: 'attended',
      header: 'Attended',
      align: 'right',
      sortValue: (row) => row.present,
      render: (row) => (
        <span className="tabular-nums text-primary font-medium">
          {row.present} / {row.total}
        </span>
      ),
    },
    {
      key: 'missed',
      header: 'Absent / Leave',
      align: 'right',
      render: (row) => (
        <span className="tabular-nums text-secondary">
          {row.absent} / {row.leave}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Standing',
      sortValue: (row) => (row.total > 0 ? row.percentage : -1),
      render: (row) =>
        row.total === 0 ? (
          <span className="text-xs text-muted">No sessions</span>
        ) : (
          <div className="w-36 space-y-1">
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span className="font-medium text-primary">{row.percentage}%</span>
              {row.trend === 'declining' ? (
                <span className="text-red-600 inline-flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> Declining
                </span>
              ) : row.trend === 'improving' ? (
                <span className="text-green-700 inline-flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Improving
                </span>
              ) : (
                <span className="text-muted">Stable</span>
              )}
            </div>
            <ProgressBar
              value={row.percentage}
              threshold={threshold}
              warningThreshold={settings.warning_threshold}
              size="xs"
            />
          </div>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: (row) => {
        if (row.total === 0) return <Badge variant="neutral">Pending</Badge>;
        if (row.percentage < threshold) return <Badge variant="danger">Shortage</Badge>;
        if (row.percentage < settings.warning_threshold) {
          return <Badge variant="warning">Warning</Badge>;
        }
        return <Badge variant="success">Eligible</Badge>;
      },
    },
  ];

  const statusLabel: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    leave: 'On leave',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={student?.user?.name || 'Student overview'}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral" className="tabular-nums">
              {student?.roll_number || 'ENG22CS089'}
            </Badge>
            {getStatusBadge(overallStats.status)}
          </div>
        }
        description={`Semester ${student?.current_semester || 5}, Section ${student?.section || 'A'
          } • ${student?.vtu_scheme?.name || '2022 Regulation'} • ${student?.department?.name ||
          'Department of Computer Science & Engineering'
          }`}
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Clock className="w-4 h-4" />}
              onClick={() => navigate(ROUTES.STUDENT_TIMETABLE)}
            >
              Timetable
            </Button>
            <Button
              variant="primary"
              leftIcon={<FileCheck2 className="w-4 h-4" />}
              onClick={() => navigate(ROUTES.STUDENT_CORRECTIONS)}
            >
              Request correction
            </Button>
          </>
        }
      />

      {overallStats.totalSessions > 0 && overallStats.percentage < threshold && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-lg bg-white border border-red-300">
          <div className="flex items-start sm:items-center gap-2.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong className="font-medium text-primary">
                Below {threshold}% minimum attendance threshold.
              </strong>{' '}
              <span className="text-secondary">
                Attend the next{' '}
                <strong className="font-medium text-primary tabular-nums">
                  {classesNeeded} consecutive lecture(s)
                </strong>{' '}
                to recover examination eligibility.
              </span>
            </span>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate(ROUTES.STUDENT_HISTORY)}
          >
            View records
          </Button>
        </div>
      )}

      {/* Compact Unified Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-lg border border-border bg-white">
        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-secondary">Overall standing</span>
          <span
            className={`text-xl font-semibold tabular-nums ${overallStats.status === 'critical'
                ? 'text-red-700'
                : overallStats.status === 'warning'
                  ? 'text-amber-700'
                  : 'text-green-700'
              }`}
          >
            {overallStats.percentage}%
          </span>
          <span className="text-xs text-secondary">
            Min {threshold}% • {settings.current_academic_year}
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-secondary">Lectures attended</span>
          <span className="text-xl font-semibold text-primary tabular-nums">
            {overallStats.present} / {overallStats.totalSessions}
          </span>
          <span className="text-xs text-secondary">
            {overallStats.absent} absent • {overallStats.leave} leave
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-secondary">
            {overallStats.percentage >= threshold
              ? 'Safe absence buffer'
              : 'Classes needed'}
          </span>
          <span
            className={`text-xl font-semibold tabular-nums ${overallStats.percentage >= threshold
                ? 'text-brand-600'
                : 'text-red-700'
              }`}
          >
            {overallStats.percentage >= threshold ? bufferClasses : classesNeeded}
          </span>
          <span className="text-xs text-secondary">
            {overallStats.percentage >= threshold
              ? `Permissible misses above ${threshold}%`
              : `Consecutive lectures for ${threshold}%`}
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-secondary">Enrolled courses</span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-semibold text-primary tabular-nums">
              {subjectStats.length}
            </span>
            <button
              type="button"
              onClick={() => navigate(ROUTES.STUDENT_HISTORY)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Records
            </button>
          </div>
          <span className="text-xs text-secondary">
            {subjectStats.filter((s) => s.total > 0 && s.percentage < threshold).length}{' '}
            course(s) below {threshold}%
          </span>
        </div>
      </div>

      {/* Subject-Wise Attendance Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-primary">
              Subject-wise attendance
            </h2>
            <p className="text-xs text-secondary">
              Participation tracked against the {threshold}% examination threshold
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate(ROUTES.STUDENT_TIMETABLE)}
          >
            Timetable
          </Button>
        </div>

        <DataTable
          data={sortedSubjectStats}
          columns={subjectColumns}
          keyExtractor={(row) => row.subject.id}
          pageSize={8}
          renderMobileCard={(row) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-primary">
                    {row.subject.name}
                  </p>
                  <p className="text-xs text-secondary tabular-nums">
                    {row.subject.code} • {row.present}/{row.total} attended
                  </p>
                </div>
                {row.total === 0 ? (
                  <Badge variant="neutral">Pending</Badge>
                ) : (
                  <Badge variant={row.percentage < threshold ? 'danger' : 'success'}>
                    {row.percentage}%
                  </Badge>
                )}
              </div>
              {row.total > 0 && (
                <ProgressBar
                  value={row.percentage}
                  threshold={threshold}
                  warningThreshold={settings.warning_threshold}
                  size="xs"
                />
              )}
            </div>
          )}
        />
      </div>

      {/* Recent Records & Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent lectures</CardTitle>
              <CardDescription>
                Latest attendance records submitted by faculty
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate(ROUTES.STUDENT_HISTORY)}
            >
              All records
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {studentSessions.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-5 h-5" />}
                title="No lecture sessions yet"
                description="Recorded lecture attendance statuses will appear here."
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-border">
                {studentSessions.map((session) => {
                  const rec = attendanceService.getStudentRecord(
                    session.id,
                    studentId
                  );
                  const sub = subjects.find((s) => s.id === session.subject_id);
                  const status = rec?.status || 'absent';

                  return (
                    <div
                      key={session.id}
                      className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-subtle/70 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {sub?.name}
                        </p>
                        <p className="text-xs text-secondary tabular-nums mt-0.5">
                          {sub?.code} • {session.date} ({session.start_time}–
                          {session.end_time})
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
                      >
                        {statusLabel[status] || status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <div>
                <CardTitle>Schedule updates &amp; notices</CardTitle>
                <CardDescription>
                  Timetable adjustments and academic advisories
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="xs"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigate(ROUTES.STUDENT_NOTIFICATIONS)}
              >
                All notices
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {studentNotifs.length === 0 ? (
                <EmptyState
                  icon={<Bell className="w-5 h-5" />}
                  title="No new notices"
                  description="Class rescheduling updates and advisories will be posted here."
                  className="py-8"
                />
              ) : (
                <div className="divide-y divide-border">
                  {studentNotifs.map((n) => (
                    <div key={n.id} className="px-5 py-3.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-primary truncate">
                          {n.title}
                        </p>
                        <span className="text-xs text-secondary tabular-nums shrink-0">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-secondary line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>

          <CardFooter className="text-xs">
            <span className="text-secondary">
              Spotted an attendance discrepancy?
            </span>
            <Button
              variant="ghost"
              size="xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate(ROUTES.STUDENT_CORRECTIONS)}
            >
              Submit dispute
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
