import React, { useState } from 'react';
import { Plus, Trash2, Building, AlertCircle } from 'lucide-react';
import type { DayOfWeek, TimetableChangeLog } from '../../../types';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { academicsService } from '../../../services/academics.service';
import { facultyService } from '../../../services/faculty.service';
import { timetableService } from '../../../services/timetable.service';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  Input,
  Modal,
  PageHeader,
  Select,
  Tabs,
  type DataColumn,
} from '../../../components/ui';
import { DAY_NAMES, PERIOD_SLOTS, getCurrentDayOfWeek } from '../../../lib/date';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';

export const AdminTimetablePage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const classes = academicsService.getClasses();
  const subjects = academicsService.getSubjects();
  const teachers = facultyService.getEnrichedTeachers();
  const changeLogs = timetableService.getChangeLogs();

  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultClassId
  );
  const [mobileDay, setMobileDay] = useState<DayOfWeek>(() =>
    getCurrentDayOfWeek()
  );
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('Monday');
  const [periodNumber, setPeriodNumber] = useState(1);
  const [subjectId, setSubjectId] = useState(
    subjects[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultSubjectId
  );
  const [teacherId, setTeacherId] = useState(
    teachers[0]?.id || INSTITUTION_CONFIG.academicDefaults.defaultTeacherId
  );
  const [classroom, setClassroom] = useState('LH-304, Mechanical Block');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const timetableEntries =
    timetableService.getEnrichedTimetableForClass(selectedClassId);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedClass) return;

    try {
      await timetableService.createEntry({
        academic_year: selectedClass.academic_year,
        department_id: selectedClass.department_id,
        semester: selectedClass.semester,
        section: selectedClass.section,
        class_id: selectedClass.id,
        subject_id: subjectId,
        teacher_id: teacherId,
        classroom: classroom.trim(),
        day_of_week: dayOfWeek,
        period_number: Number(periodNumber),
        start_time: startTime,
        end_time: endTime,
      });

      setIsAddSlotOpen(false);
      toast({
        variant: 'success',
        title: 'Timetable slot scheduled',
        description: `Added ${dayOfWeek} Period ${periodNumber} for ${selectedClass.name}.`,
      });
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to schedule period.'
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this timetable period?')) {
      try {
        await timetableService.deleteEntry(id);
        toast({
          variant: 'info',
          title: 'Slot removed',
          description: 'Timetable period has been removed from the schedule.',
        });
      } catch (err) {
        toast({ variant: 'error', title: 'Unable to delete timetable slot', description: err instanceof Error ? err.message : undefined });
      }
    }
  };

  const logColumns: DataColumn<TimetableChangeLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortValue: (l) => l.timestamp,
      render: (l) => (
        <span className="font-mono text-[11px] text-secondary tabular-nums">
          {new Date(l.timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'teacher',
      header: 'Faculty',
      render: (l) => (
        <span className="font-medium text-primary">{l.teacher_name}</span>
      ),
    },
    {
      key: 'course',
      header: 'Course & Class',
      render: (l) => (
        <div>
          <span className="font-mono font-semibold text-brand-600">
            {l.subject_code}
          </span>
          <span className="text-secondary ml-1.5">({l.class_name})</span>
        </div>
      ),
    },
    {
      key: 'change',
      header: 'Adjustment',
      render: (l) => (
        <span className="font-mono text-[11px]">
          <span className="line-through text-muted">
            {l.old_day} P{l.old_period}
          </span>{' '}
          →{' '}
          <strong className="text-emerald-600">
            {l.new_day} P{l.new_period}
          </strong>
        </span>
      ),
    },
    {
      key: 'room',
      header: 'Classroom',
      render: (l) => <span className="text-secondary">{l.new_classroom}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (l) => (
        <span className="text-secondary italic max-w-xs truncate block">
          "{l.reason}"
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      render: () => <Badge variant="success">Applied</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Timetable"
        description="Weekly period matrix, room assignments and collision-checked faculty schedules"
        actions={
          <>
            <div className="w-56">
              <Select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                aria-label="Select academic class"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={() => {
                setErrorMsg(null);
                setIsAddSlotOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Schedule Slot
            </Button>
          </>
        }
      />

      {/* Mobile Day-by-Day View (< lg) */}
      <div className="space-y-3 lg:hidden">
        <Tabs<DayOfWeek>
          value={mobileDay}
          onChange={setMobileDay}
          options={DAY_NAMES.map((d) => ({
            value: d,
            label: d.slice(0, 3),
            count: timetableEntries.filter((t) => t.day_of_week === d).length,
          }))}
        />

        <div className="space-y-2">
          {PERIOD_SLOTS.map((p) => {
            const slot = timetableEntries.find(
              (t) => t.day_of_week === mobileDay && t.period_number === p.number
            );
            return (
              <Card key={p.number} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-12 rounded-lg bg-subtle border border-border flex flex-col items-center justify-center shrink-0 font-mono">
                    <span className="text-[11px] text-muted">P{p.number}</span>
                    <span className="text-[11px] font-semibold text-primary">
                      {p.start}
                    </span>
                  </div>
                  {slot ? (
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">
                        {slot.subject?.code} — {slot.subject?.name}
                      </p>
                      <p className="text-[11px] text-secondary truncate">
                        {slot.teacher?.user.name ?? slot.teacher_name} • {slot.classroom}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">Unscheduled period</span>
                  )}
                </div>
                {slot && (
                  <button
                    type="button"
                    onClick={() => handleDelete(slot.id)}
                    aria-label="Delete slot"
                    className="p-1.5 rounded-md text-muted hover:text-rose-600 hover:bg-subtle shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Desktop Weekly Matrix (lg+) */}
      <Card className="hidden lg:block overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>
              {selectedClass?.name} • Semester {selectedClass?.semester}
            </CardTitle>
            <CardDescription>
              Academic Year {selectedClass?.academic_year}
            </CardDescription>
          </div>
          <Badge variant="primary">7-Period Grid</Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-subtle/70 text-secondary border-b border-border">
              <tr>
                <th className="py-2.5 px-3 w-28 border-r border-border text-[11px] font-medium">
                  Day
                </th>
                {PERIOD_SLOTS.map((p) => (
                  <th
                    key={p.number}
                    className="py-2.5 px-2.5 border-r border-border last:border-r-0 text-center min-w-[138px]"
                  >
                    <div className="text-[11px] font-semibold text-primary">
                      Period {p.number}
                    </div>
                    <div className="text-[11px] text-muted font-mono tabular-nums">
                      {p.start}–{p.end}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DAY_NAMES.map((day) => (
                <tr key={day}>
                  <td className="py-3 px-3 font-medium text-primary bg-subtle/30 border-r border-border">
                    {day}
                  </td>
                  {PERIOD_SLOTS.map((p) => {
                    const slot = timetableEntries.find(
                      (t) => t.day_of_week === day && t.period_number === p.number
                    );

                    return (
                      <td
                        key={p.number}
                        className="p-2 border-r border-border last:border-r-0 align-top"
                      >
                        {slot ? (
                          <div className="p-2.5 rounded-lg border border-brand-200 bg-brand-50/50 space-y-1 relative group">
                            <button
                              type="button"
                              onClick={() => handleDelete(slot.id)}
                              aria-label="Delete timetable slot"
                              className="absolute top-1.5 right-1.5 p-1 rounded text-muted hover:text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <p className="font-mono font-semibold text-brand-700 text-[11px] pr-5 truncate">
                              {slot.subject?.code} • {slot.subject?.abbreviation}
                            </p>
                            <p className="text-[11px] text-primary font-medium truncate">
                              {slot.teacher?.user.name ?? slot.teacher_name}
                            </p>
                            <p className="text-[11px] text-secondary font-mono flex items-center gap-1 truncate">
                              <Building className="w-3 h-3 shrink-0" />
                              <span className="truncate">{slot.classroom}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="h-16 flex items-center justify-center text-muted/50 text-xs select-none">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Faculty Rescheduling Audit Trail */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-primary">
              Rescheduling Audit Log
            </h2>
            <p className="text-xs text-secondary">
              Verified slot adjustments initiated by faculty
            </p>
          </div>
          <Badge variant="neutral">{changeLogs.length} adjustments</Badge>
        </div>

        <DataTable
          data={changeLogs}
          columns={logColumns}
          keyExtractor={(l) => l.id}
          pageSize={8}
          emptyTitle="No rescheduling events logged"
          emptyDescription="The master schedule has not had any faculty-initiated adjustments yet."
        />
      </div>

      <Modal
        isOpen={isAddSlotOpen}
        onClose={() => setIsAddSlotOpen(false)}
        title="Schedule Timetable Period"
        description={`${selectedClass?.name} • Semester ${selectedClass?.semester}`}
      >
        <form onSubmit={handleCreateSlot} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3.5">
            <Select
              label="Day of Week"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
            >
              {DAY_NAMES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>

            <Select
              label="Period"
              value={periodNumber}
              onChange={(e) => {
                const num = Number(e.target.value);
                setPeriodNumber(num);
                const p = PERIOD_SLOTS.find((x) => x.number === num);
                if (p) {
                  setStartTime(p.start);
                  setEndTime(p.end);
                }
              }}
            >
              {PERIOD_SLOTS.map((p) => (
                <option key={p.number} value={p.number}>
                  Period {p.number} ({p.start}–{p.end})
                </option>
              ))}
            </Select>
          </div>

          <Select
            label="Course Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            {subjects
              .filter((s) => s.semester === selectedClass?.semester)
              .map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} — {sub.name} ({sub.credits} Cr)
                </option>
              ))}
          </Select>

          <Select
            label="Faculty Member"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.user.name} ({t.employee_id})
              </option>
            ))}
          </Select>

          <Input
            label="Classroom / Lab"
            required
            value={classroom}
            onChange={(e) => setClassroom(e.target.value)}
            placeholder="e.g. LH-304, Mechanical Block"
          />

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddSlotOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Schedule Period</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
