import React, { useState, useMemo } from 'react';
import { Save, AlertCircle, FileCheck2 } from 'lucide-react';
import type { AttendanceRosterEntry, AttendanceStatus } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { academicsService } from '../../../services/academics.service';
import { attendanceService } from '../../../services/attendance.service';
import { studentsService } from '../../../services/students.service';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/ui/Button';
import { AttendanceRosterTable } from './AttendanceRosterTable';
import { getTodayIsoDate } from '../../../lib/date';
import { summarizeRoster } from '../../../lib/attendance';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';

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
  const { toast } = useToast();
  const teacherId =
    currentTeacher?.id || INSTITUTION_CONFIG.academicDefaults.defaultTeacherId;

  const targetDate = useMemo(() => initialDate || getTodayIsoDate(), [initialDate]);

  const academicClass = academicsService.getClasses().find((c) => c.id === classId);
  const subject = academicsService.getSubjects().find((s) => s.id === subjectId);
  const classStudents = studentsService.getEnrichedStudentsByClass(classId, targetDate);

  const existingSession = attendanceService.findSessionForDay(
    classId,
    subjectId,
    targetDate,
    initialStartTime
  );

  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => existingSession?.id || null
  );
  const [startTime] = useState<string>(
    () => existingSession?.start_time || initialStartTime || '09:00'
  );
  const [endTime] = useState<string>(
    () => existingSession?.end_time || initialEndTime || '10:00'
  );
  const [rosterMap, setRosterMap] = useState<Record<string, AttendanceRosterEntry>>(() =>
    attendanceService.buildInitialRoster(classStudents, existingSession?.id || null)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceRosterEntry> = { ...rosterMap };
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

  const summary = summarizeRoster(rosterMap);

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);
    setSaveError(null);

    try {
      const savedSessionId = await attendanceService.saveSessionAttendance({
        existingSessionId: activeSessionId,
        classId,
        subjectId,
        teacherId,
        date: targetDate,
        startTime,
        endTime,
        sessionType: 'lecture',
        students: classStudents,
        rosterMap,
        actorUser: currentUser,
      });

      setActiveSessionId(savedSessionId);
      toast({
        variant: 'success',
        title: 'Attendance saved',
        description: `${summary.present}/${classStudents.length} students marked present (${summary.percentage}%) for ${subject?.code}.`,
      });
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save attendance records.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mark Attendance • ${subject?.code}`}
      description={`${subject?.name} — ${academicClass?.name}`}
      size="xl"
    >
      <form onSubmit={handleSubmitAttendance} className="space-y-4">
        <div className="px-3.5 py-2.5 rounded-lg border border-border bg-subtle/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-secondary">
            Batch: <strong className="text-primary">{academicClass?.admission_batch}</strong>
          </span>
          <span className="font-mono text-secondary tabular-nums">
            {targetDate} • {startTime}–{endTime}
          </span>
        </div>

        {activeSessionId && (
          <div className="px-3 py-2.5 rounded-lg border border-brand-200 bg-brand-50/60 text-brand-800 text-xs flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              Existing session loaded. Submitting will update records and log an audit entry.
            </span>
          </div>
        )}

        {saveError && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border rounded-xl">
          <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
            <span className="text-secondary">
              Total: <strong className="text-primary font-mono">{classStudents.length}</strong>
            </span>
            <Badge variant="success">Present: {summary.present}</Badge>
            <Badge variant="danger">Absent: {summary.absent}</Badge>
            {summary.leave > 0 && <Badge variant="warning">Leave: {summary.leave}</Badge>}
            <Badge variant="primary">{summary.percentage}%</Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => handleMarkAll('present')}
            >
              All Present
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => handleMarkAll('absent')}
            >
              All Absent
            </Button>
          </div>
        </div>

        <AttendanceRosterTable
          compact
          students={classStudents}
          rosterMap={rosterMap}
          onStatusChange={handleToggleStatus}
        />

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={classStudents.length === 0}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Submit Attendance
          </Button>
        </div>
      </form>
    </Modal>
  );
};
