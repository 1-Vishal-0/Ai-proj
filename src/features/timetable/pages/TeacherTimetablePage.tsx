<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
import { demoMode } from '../../../services/supabaseClient';
=======
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
import React, { useMemo, useState } from 'react';
import { Clock, RotateCcw, CalendarCheck, History } from 'lucide-react';
import type {
  DayOfWeek,
  EnrichedTimetableEntry,
  TimetableChangeLog,
} from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { timetableService } from '../../../services/timetable.service';
import { attendanceService } from '../../../services/attendance.service';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Tabs,
  type DataColumn,
} from '../../../components/ui';
import { QuickAttendanceModal } from '../../attendance/components/QuickAttendanceModal';
import { RescheduleSlotModal } from '../components/RescheduleSlotModal';
import {
  DAY_NAMES,
  getCurrentDayOfWeek,
  getTodayIsoDate,
} from '../../../lib/date';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';

export const TeacherTimetablePage: React.FC = () => {
<<<<<<< HEAD
  const navigate=useNavigate();
=======
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
  useDatabaseVersion();
  const { currentTeacher } = useAuth();
  const teacherId =
    currentTeacher?.id || INSTITUTION_CONFIG.academicDefaults.defaultTeacherId;

  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [currentDayName] = useState<DayOfWeek>(() => getCurrentDayOfWeek());
  const [todayDateStr] = useState<string>(() => getTodayIsoDate());
  const [activeDay, setActiveDay] = useState<DayOfWeek>(currentDayName);

  const [attendanceModalSlot, setAttendanceModalSlot] = useState<{
    classId: string;
    subjectId: string;
    startTime?: string;
    endTime?: string;
  } | null>(null);
  const [rescheduleSlot, setRescheduleSlot] =
    useState<EnrichedTimetableEntry | null>(null);

  const timetableEntries = timetableService.getEnrichedTimetable(teacherId);
  const todaysSchedule = timetableEntries.filter(
    (t) => t.day_of_week === activeDay
  );
  const changeLogs = timetableService.getChangeLogs(teacherId);
  const teacherSessions = attendanceService.getSessions({ teacher_id: teacherId });

  const dayTabs = DAY_NAMES.map((day) => ({
    value: day,
    label: day,
    count: timetableEntries.filter((t) => t.day_of_week === day).length,
    dot: day === currentDayName,
  }));

  const historyColumns = useMemo<DataColumn<TimetableChangeLog>[]>(
    () => [
      {
        key: 'timestamp',
        header: 'Date & Time',
        sortValue: (row) => row.timestamp,
        render: (log) => (
          <span className="font-mono text-[11px] text-secondary tabular-nums whitespace-nowrap">
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
        key: 'subject',
        header: 'Course & Section',
        sortValue: (row) => row.subject_code,
        render: (log) => (
          <div className="whitespace-nowrap">
            <span className="font-semibold text-primary font-mono">
              {log.subject_code}
            </span>
            <span className="text-secondary ml-1.5">({log.class_name})</span>
          </div>
        ),
      },
      {
        key: 'old_schedule',
        header: 'Original Slot',
        render: (log) => (
          <span className="text-secondary">
            {log.old_day} • P{log.old_period} ({log.old_classroom})
          </span>
        ),
      },
      {
        key: 'new_schedule',
        header: 'Updated Slot',
        render: (log) => (
          <span className="font-medium text-brand-600">
            {log.new_day} • P{log.new_period} ({log.new_classroom})
          </span>
        ),
      },
      {
        key: 'reason',
        header: 'Reason',
        render: (log) => (
          <span className="text-secondary max-w-xs truncate block">
            &ldquo;{log.reason}&rdquo;
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'right',
        render: () => (
          <Badge variant="success" dot>
            Notified
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Timetable"
        description="Inspect weekly teaching periods, record attendance rosters, and reschedule slots"
        actions={
          <Tabs
            options={[
              { value: 'schedule', label: 'Weekly Schedule' },
              {
                value: 'history',
                label: 'Change History',
                count: changeLogs.length,
                icon: <History className="w-3.5 h-3.5" />,
              },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        }
      />

      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <Tabs
              options={dayTabs}
              value={activeDay}
              onChange={setActiveDay}
            />
          </div>

          {todaysSchedule.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Clock className="w-5 h-5" />}
                title={`No lecture periods on ${activeDay}`}
                description="You have an open preparation, research, or evaluation day."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {todaysSchedule.map((slot) => {
                const isSubmitted =
                  activeDay === currentDayName &&
                  teacherSessions.some(
                    (s) =>
                      s.class_id === slot.class_id &&
                      s.subject_id === slot.subject_id &&
                      s.date === todayDateStr
                  );

                return (
                  <Card
                    key={slot.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="rounded-lg bg-subtle border border-border px-3 py-2.5 text-center shrink-0 w-18">
                        <span className="text-[11px] font-medium text-muted block">
                          Period
                        </span>
                        <span className="text-lg font-semibold font-mono text-primary tabular-nums">
                          {slot.period_number}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="primary" className="font-mono">
                            {slot.subject?.code}
                          </Badge>
                          <h3 className="text-sm font-semibold text-primary truncate">
                            {slot.subject?.name}
                          </h3>
                        </div>

                        <p className="text-xs text-secondary">
                          Section:{' '}
                          <strong className="font-medium text-primary">
                            {slot.academic_class?.name}
                          </strong>{' '}
                          • Classroom:{' '}
                          <strong className="font-medium text-primary">
                            {slot.classroom}
                          </strong>
                        </p>

                        <p className="text-[11px] text-muted font-mono tabular-nums">
                          {slot.start_time} – {slot.end_time} •{' '}
                          {slot.subject?.category} ({slot.subject?.course_type})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                      {isSubmitted && (
                        <Badge variant="success" dot>
                          Marked Today
                        </Badge>
                      )}

                      <Button
                        variant="primary"
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
                        Take Attendance
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        onClick={() => setRescheduleSlot(slot)}
                      >
                        Reschedule
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <DataTable
          data={changeLogs}
          columns={historyColumns}
          keyExtractor={(log) => log.id}
          emptyTitle="No timetable changes recorded"
          emptyDescription="Rescheduled periods and classroom swaps will be logged here automatically."
          renderMobileCard={(log) => (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-primary font-mono">
                  {log.subject_code} ({log.class_name})
                </span>
                <Badge variant="success" dot>
                  Notified
                </Badge>
              </div>
              <p className="text-secondary">
                <span className="line-through text-muted">
                  {log.old_day} P{log.old_period} ({log.old_classroom})
                </span>{' '}
                →{' '}
                <strong className="text-brand-600">
                  {log.new_day} P{log.new_period} ({log.new_classroom})
                </strong>
              </p>
              <p className="text-[11px] text-muted italic">
                &ldquo;{log.reason}&rdquo; •{' '}
                {new Date(log.timestamp).toLocaleDateString()}
              </p>
            </div>
          )}
        />
      )}

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
