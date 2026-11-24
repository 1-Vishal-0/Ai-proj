import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import type { DayOfWeek } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { studentsService } from '../../../services/students.service';
import { timetableService } from '../../../services/timetable.service';
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Tabs,
} from '../../../components/ui';
import { DAY_NAMES, getCurrentDayOfWeek } from '../../../lib/date';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';

export const StudentTimetablePage: React.FC = () => {
  useDatabaseVersion();
  const { currentStudent } = useAuth();
  const studentId =
    currentStudent?.id || INSTITUTION_CONFIG.academicDefaults.defaultStudentId;
  const student = studentsService.getEnrichedStudent(studentId);

  const [currentDayName] = useState<DayOfWeek>(() => getCurrentDayOfWeek());
  const [activeDay, setActiveDay] = useState<DayOfWeek>(currentDayName);

  const timetableEntries = student
    ? timetableService.getEnrichedTimetableForClass(student.class_id)
    : [];
  const todaysSchedule = timetableEntries.filter(
    (t) => t.day_of_week === activeDay
  );

  const dayTabs = DAY_NAMES.map((day) => ({
    value: day,
    label: day,
    count: timetableEntries.filter((t) => t.day_of_week === day).length,
    dot: day === currentDayName,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Lecture Timetable"
        badge={
          <Badge variant="neutral">
            {student?.academic_class?.name || 'Section Schedule'}
          </Badge>
        }
        description={`${
          student?.vtu_scheme?.name || '2022 CBCS Regulation'
        } • ${
          student?.department?.name ||
          'Department of Computer Science & Engineering'
        }`}
      />

      <div className="overflow-x-auto pb-1">
        <Tabs options={dayTabs} value={activeDay} onChange={setActiveDay} />
      </div>

      {todaysSchedule.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Clock className="w-5 h-5" />}
            title={`No classes scheduled for ${activeDay}`}
            description="Use this open day for library study, lab preparation, or project work."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {todaysSchedule.map((slot) => (
            <Card
              key={slot.id}
              className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
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
                    Faculty:{' '}
                    <strong className="font-medium text-primary">
                      {slot.teacher?.user.name ?? slot.teacher_name}
                    </strong>{' '}
                    • Room:{' '}
                    <strong className="font-medium text-primary">
                      {slot.classroom}
                    </strong>
                  </p>

                  <p className="text-[11px] text-muted font-mono tabular-nums">
                    {slot.start_time} – {slot.end_time} • {slot.subject?.credits}{' '}
                    Credits ({slot.subject?.category})
                  </p>
                </div>
              </div>

              <div className="hidden sm:block shrink-0">
                <Badge variant="neutral" className="font-mono">
                  {slot.start_time} – {slot.end_time}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
