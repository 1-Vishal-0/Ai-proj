<<<<<<< HEAD
import { demoMode } from '../../../services/supabaseClient';
=======
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  RotateCcw,
} from 'lucide-react';
import type { EnrichedTimetableEntry } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { facultyService } from '../../../services/faculty.service';
import { attendanceService } from '../../../services/attendance.service';
import { timetableService } from '../../../services/timetable.service';
import { analyticsService } from '../../../services/analytics.service';
import { requestsService } from '../../../services/requests.service';
import { settingsService } from '../../../services/settings.service';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  ProgressBar,
  Tooltip,
} from '../../../components/ui';
import { AttendanceTrendChart } from '../../analytics/components/AttendanceTrendChart';
import { QuickAttendanceModal } from '../../attendance/components/QuickAttendanceModal';
import { RescheduleSlotModal } from '../../timetable/components/RescheduleSlotModal';
import { ROUTES } from '../../../app/config/navigation';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';
import { getCurrentDayOfWeek, getTodayIsoDate } from '../../../lib/date';

export const TeacherOverviewPage: React.FC = () => {
  useDatabaseVersion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, currentTeacher } = useAuth();
  const teacherId =
    currentTeacher?.id || INSTITUTION_CONFIG.academicDefaults.defaultTeacherId;
  const settings = settingsService.getSettings();

  const [currentDayName] = useState(() => getCurrentDayOfWeek());
  const [todayDateStr] = useState(() => getTodayIsoDate());

  const [attendanceModalSlot, setAttendanceModalSlot] = useState<{
    classId: string;
    subjectId: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);
  const [rescheduleSlot, setRescheduleSlot] =
    useState<EnrichedTimetableEntry | null>(null);

  const { classes: allClasses, subjects: allSubjects, assignedClassIds } =
    facultyService.getAssignedClassesAndSubjects(teacherId);

  const teacherSessions = attendanceService.getSessions({ teacher_id: teacherId });
  const todaySchedule = timetableService
    .getEnrichedTimetable(teacherId)
    .filter((t) => t.day_of_week === currentDayName);

  const todayCompletedCount = todaySchedule.filter((slot) =>
    teacherSessions.some(
      (s) =>
        s.class_id === slot.class_id &&
        s.subject_id === slot.subject_id &&
        s.date === todayDateStr
    )
  ).length;
  const todayPendingCount = Math.max(0, todaySchedule.length - todayCompletedCount);

  const lowAttendanceStudents = analyticsService
    .getLowAttendanceStudents(settings.threshold_percentage)
    .filter((item) => assignedClassIds.has(item.student.class_id));

  const pendingCorrections = requestsService
    .getEnrichedCorrectionRequests(teacherId)
    .filter((r) => r.status === 'pending');

  const timetableChanges = timetableService.getChangeLogs(teacherId).slice(0, 4);
  const trendData = analyticsService.getAttendanceTrend(7);

  const handleQuickReview = async (requestId: string, action: 'approved' | 'rejected') => {
    if (!currentUser) return;
    try {
      const note =
        action === 'approved'
          ? 'Approved by faculty teacher'
          : 'Rejected by faculty teacher';
      await requestsService.reviewCorrectionRequest(
        requestId,
        action,
        teacherId,
        note,
        currentUser
      );
      toast({
        variant: action === 'approved' ? 'success' : 'info',
        title:
          action === 'approved'
            ? 'Correction request approved'
            : 'Correction request rejected',
        description: 'Student attendance ledger and audit trail have been updated.',
      });
    } catch (err) {
      toast({ variant: 'error', title: 'Unable to review correction', description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Dashboard"
        badge={
          <Badge variant="primary">
            {currentTeacher?.employee_id || 'FAC-CSE-028'}
          </Badge>
        }
        description={`${currentUser?.name || 'Faculty Member'} • ${
          currentTeacher?.department?.name ||
          'Department of Computer Science & Engineering'
        }`}
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Clock className="w-3.5 h-3.5" />}
              onClick={() => navigate(ROUTES.TEACHER_TIMETABLE)}
            >
              My Timetable
            </Button>
            <Button
              variant="primary"
              leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
              onClick={() => navigate(ROUTES.TEACHER_MARK)}
            >
              Mark Attendance
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-lg border border-border bg-white">
        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-secondary">Assigned classes</span>
          <span className="text-xl font-semibold text-primary tabular-nums">
            {allClasses.length}
          </span>
          <span className="text-xs text-secondary truncate">
            {allClasses.map((c) => c.name).join(', ') || 'No assigned sections'}
          </span>
        </div>
        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-secondary">Assigned subjects</span>
          <span className="text-xl font-semibold text-brand-600 tabular-nums">
            {allSubjects.length}
          </span>
          <span className="text-xs text-secondary truncate">
            {allSubjects.map((s) => s.code).join(', ') || 'No assigned subjects'}
          </span>
        </div>
        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-secondary">Pending today</span>
          <span
            className={`text-xl font-semibold tabular-nums ${
              todayPendingCount > 0 ? 'text-amber-700' : 'text-green-700'
            }`}
          >
            {todayPendingCount}
          </span>
          <span className="text-xs text-secondary">
            {todayPendingCount === 0
              ? 'All scheduled periods marked'
              : `${todaySchedule.length} period(s) on ${currentDayName}`}
          </span>
        </div>
        <div className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs text-secondary">Sessions conducted</span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-semibold text-primary tabular-nums">
              {teacherSessions.length}
            </span>
            <button
              type="button"
              onClick={() => navigate(ROUTES.TEACHER_HISTORY)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Records
            </button>
          </div>
          <span className="text-xs text-secondary">Recorded lectures</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              Today&apos;s Teaching Schedule ({currentDayName}, {todayDateStr})
            </CardTitle>
            <CardDescription>
              Mark present/absent rosters directly from scheduled periods or reschedule classrooms
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="xs"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            onClick={() => navigate(ROUTES.TEACHER_TIMETABLE)}
          >
            Weekly Timetable
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {todaySchedule.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-5 h-5" />}
              title={`No lecture periods scheduled for ${currentDayName}`}
              description="Use Mark Attendance to record extra lectures, labs, or makeup sessions."
            />
          ) : (
            <div className="divide-y divide-border">
              {todaySchedule.map((slot) => {
                const isSubmitted = teacherSessions.some(
                  (s) =>
                    s.class_id === slot.class_id &&
                    s.subject_id === slot.subject_id &&
                    s.date === todayDateStr
                );

                return (
                  <div
                    key={slot.id}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-subtle/40 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="rounded-lg bg-subtle border border-border px-2.5 py-2 text-center w-16 shrink-0">
                        <span className="text-[11px] font-medium text-muted block">
                          Period
                        </span>
                        <span className="text-base font-semibold font-mono text-primary tabular-nums">
                          {slot.period_number}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="primary" className="font-mono">
                            {slot.subject?.code}
                          </Badge>
                          <h4 className="text-xs sm:text-sm font-semibold text-primary truncate">
                            {slot.subject?.name}
                          </h4>
                        </div>
                        <p className="text-xs text-secondary">
                          Section:{' '}
                          <strong className="font-medium text-primary">
                            {slot.academic_class?.name}
                          </strong>{' '}
                          • Room:{' '}
                          <strong className="font-medium text-primary">
                            {slot.classroom}
                          </strong>
                        </p>
                        <p className="text-[11px] text-muted font-mono tabular-nums">
                          {slot.start_time} – {slot.end_time} •{' '}
                          {slot.subject?.credits} Credits ({slot.subject?.category})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                      {isSubmitted ? (
                        <Badge variant="success" dot>
                          Submitted
                        </Badge>
                      ) : (
                        <Badge variant="warning" dot>
                          Pending
                        </Badge>
                      )}

                      <Button
                        variant={isSubmitted ? 'outline' : 'primary'}
                        size="sm"
                        leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                        onClick={() =>
<<<<<<< HEAD
                          !demoMode ? navigate('/teacher/mark?slot='+slot.id) : setAttendanceModalSlot({
=======
                          setAttendanceModalSlot({
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
                            classId: slot.class_id,
                            subjectId: slot.subject_id,
                            startTime: slot.start_time,
                            endTime: slot.end_time,
                          })
                        }
                      >
<<<<<<< HEAD
                        {isSubmitted ? (demoMode?'Edit Roster':'Review attendance') : 'Take Attendance'}
=======
                        {isSubmitted ? 'Edit Roster' : 'Take Attendance'}
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
                      </Button>

                      <Tooltip content="Reschedule period">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Reschedule period"
<<<<<<< HEAD
                          onClick={() => demoMode ? setRescheduleSlot(slot) : navigate('/teacher/timetable')}
=======
                          onClick={() => setRescheduleSlot(slot)}
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Attendance Turnout (Last 7 Days)</CardTitle>
              <CardDescription>
                Daily participation trend across recorded lecture sessions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate(ROUTES.TEACHER_REPORTS)}
            >
              Course Reports
            </Button>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={trendData} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Below {settings.threshold_percentage}% Threshold</span>
              </CardTitle>
              <CardDescription>
                {lowAttendanceStudents.length} student(s) at shortage risk
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate(ROUTES.TEACHER_LOW_ATTENDANCE)}
            >
              View All
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-0">
            {lowAttendanceStudents.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                title="No students below threshold"
                description={`All enrolled students meet the ${settings.threshold_percentage}% requirement.`}
              />
            ) : (
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {lowAttendanceStudents.slice(0, 5).map((item) => (
                  <div
                    key={item.student.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-subtle/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={item.student.user.avatar_url}
                        name={item.student.user.name}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-primary truncate">
                          {item.student.user.name}
                        </p>
                        <p className="text-[11px] font-mono text-muted truncate">
                          {item.student.roll_number} •{' '}
                          {item.student.academic_class?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 w-24 space-y-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-mono text-xs font-semibold text-rose-600 tabular-nums">
                          {item.overallPercentage}%
                        </span>
                        <span className="text-[11px] text-muted font-mono tabular-nums">
                          ({item.attended}/{item.totalClasses})
                        </span>
                      </div>
                      <ProgressBar
                        value={item.overallPercentage}
                        threshold={settings.threshold_percentage}
                        warningThreshold={settings.warning_threshold}
                        size="xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Timetable Change Log</CardTitle>
              <CardDescription>
                Recent period rescheduling and classroom adjustments
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate(ROUTES.TEACHER_TIMETABLE)}
            >
              Manage
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {timetableChanges.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-5 h-5" />}
                title="No recent changes"
                description="Rescheduled periods and room swaps will appear here."
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-border">
                {timetableChanges.map((log) => (
                  <div key={log.id} className="px-5 py-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-primary">
                        {log.subject_code}{' '}
                        <span className="font-normal text-secondary">
                          ({log.class_name})
                        </span>
                      </span>
                      <span className="text-[11px] text-muted font-mono tabular-nums">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-secondary">
                      Moved from{' '}
                      <span className="line-through text-muted">
                        {log.old_day} P{log.old_period} ({log.old_classroom})
                      </span>{' '}
                      to{' '}
                      <strong className="font-medium text-brand-600">
                        {log.new_day} P{log.new_period} ({log.new_classroom})
                      </strong>
                    </p>
                    <p className="text-[11px] text-muted italic">
                      &ldquo;{log.reason}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pending Correction Disputes</CardTitle>
              <CardDescription>
                {pendingCorrections.length} student request(s) awaiting verification
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate(ROUTES.TEACHER_CORRECTIONS)}
            >
              Review All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingCorrections.length === 0 ? (
              <EmptyState
                icon={<FileCheck2 className="w-5 h-5" />}
                title="Inbox clear"
                description="No pending attendance dispute requests require review."
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-border">
                {pendingCorrections.slice(0, 3).map((cr) => (
                  <div key={cr.id} className="px-5 py-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-primary">
                        {cr.student.user.name}
                      </span>
                      <Badge variant="neutral" className="font-mono">
                        {cr.student.roll_number}
                      </Badge>
                    </div>
                    <p className="text-secondary">
                      {cr.subject?.name} •{' '}
                      <span className="font-mono">{cr.date}</span>
                    </p>
                    <p className="text-secondary italic bg-subtle/60 px-2.5 py-1.5 rounded-lg border border-border">
                      &ldquo;{cr.reason}&rdquo;
                    </p>
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted">Request:</span>
                        <Badge variant="success">
                          {cr.requested_status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleQuickReview(cr.id, 'rejected')}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="success"
                          size="xs"
                          onClick={() => handleQuickReview(cr.id, 'approved')}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {attendanceModalSlot && (
        <QuickAttendanceModal
          key={`${attendanceModalSlot.classId}-${attendanceModalSlot.subjectId}-${attendanceModalSlot.startTime}`}
          isOpen={true}
          onClose={() => setAttendanceModalSlot(null)}
          classId={attendanceModalSlot.classId}
          subjectId={attendanceModalSlot.subjectId}
          startTime={attendanceModalSlot.startTime}
          endTime={attendanceModalSlot.endTime}
        />
      )}

      {rescheduleSlot && (
        <RescheduleSlotModal
          key={rescheduleSlot.id}
          isOpen={true}
          onClose={() => setRescheduleSlot(null)}
          slot={rescheduleSlot}
          onSuccess={() => setRescheduleSlot(null)}
        />
      )}
    </div>
  );
};
