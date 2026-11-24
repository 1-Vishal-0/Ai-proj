import React, { useState } from 'react';
import {
  CheckCircle2,
  Save,
  Users,
  Check,
  X,
  AlertCircle,
  ArrowLeftRight,
} from 'lucide-react';
import type {
  AttendanceRosterEntry,
  AttendanceStatus,
  SessionType,
} from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { facultyService } from '../../../services/faculty.service';
import { attendanceService } from '../../../services/attendance.service';
import { studentsService } from '../../../services/students.service';
import { settingsService } from '../../../services/settings.service';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  DatePicker,
  FilterBar,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  TimeInput,
} from '../../../components/ui';
import { AttendanceRosterTable } from '../components/AttendanceRosterTable';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';
import { getTodayIsoDate } from '../../../lib/date';
import { summarizeRoster } from '../../../lib/attendance';

export const TeacherMarkAttendancePage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const { currentUser, currentTeacher } = useAuth();
  const teacherId =
    currentTeacher?.id || INSTITUTION_CONFIG.academicDefaults.defaultTeacherId;
  const settings = settingsService.getSettings();

  const { classes, subjects, assignments } =
    facultyService.getAssignedClassesAndSubjects(teacherId);

  const initialClassId = classes[0]?.id ?? '';
  const initialSubjectId = assignments.find((assignment) => assignment.class_id === initialClassId)?.subject_id ?? '';

  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedSubjectId, setSelectedSubjectId] =
    useState<string>(initialSubjectId);
  const [sessionDate, setSessionDate] = useState<string>(() => getTodayIsoDate());

  const initialSession = attendanceService.findSessionForDay(
    initialClassId,
    initialSubjectId,
    sessionDate
  );

  const [startTime, setStartTime] = useState<string>(
    () => initialSession?.start_time || '09:00'
  );
  const [endTime, setEndTime] = useState<string>(
    () => initialSession?.end_time || '10:00'
  );
  const [sessionType, setSessionType] = useState<SessionType>(
    () => initialSession?.session_type || 'lecture'
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => initialSession?.id || null
  );
  const [rosterMap, setRosterMap] = useState<
    Record<string, AttendanceRosterEntry>
  >(() =>
    attendanceService.buildInitialRoster(
      studentsService.getEnrichedStudentsByClass(initialClassId, sessionDate),
      initialSession?.id || null
    )
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'present' | 'absent' | 'leave'
  >('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const classStudents = studentsService.getEnrichedStudentsByClass(selectedClassId, sessionDate);
  const daySessions = attendanceService.getSessions({
    class_id: selectedClassId, subject_id: selectedSubjectId, teacher_id: teacherId, date: sessionDate,
  });

  const loadSessionContext = (
    nextClassId: string,
    nextSubjectId: string,
    nextDate: string,
    sessionChoice?: string
  ) => {
    const nextStudents = studentsService.getEnrichedStudentsByClass(nextClassId, nextDate);
    const sessions = attendanceService.getSessions({
      class_id: nextClassId, subject_id: nextSubjectId, teacher_id: teacherId, date: nextDate,
    });
    const existing = sessionChoice === undefined ? sessions[0] : sessions.find((entry) => entry.id === sessionChoice);

    if (existing) {
      setActiveSessionId(existing.id);
      setStartTime(existing.start_time);
      setEndTime(existing.end_time);
      setSessionType(existing.session_type);
      setRosterMap(attendanceService.buildInitialRoster(nextStudents, existing.id));
    } else {
      setStartTime('09:00');
      setEndTime('10:00');
      setSessionType('lecture');
      setActiveSessionId(null);
      setRosterMap(attendanceService.buildInitialRoster(nextStudents, null));
    }
  };

  const handleClassChange = (nextClassId: string) => {
    setSelectedClassId(nextClassId);
    const nextSubjectId = assignments.find((assignment) => assignment.class_id === nextClassId)?.subject_id ?? '';
    setSelectedSubjectId(nextSubjectId);
    loadSessionContext(nextClassId, nextSubjectId, sessionDate);
  };

  const handleSubjectChange = (nextSubjectId: string) => {
    setSelectedSubjectId(nextSubjectId);
    loadSessionContext(selectedClassId, nextSubjectId, sessionDate);
  };

  const handleDateChange = (nextDate: string) => {
    setSessionDate(nextDate);
    loadSessionContext(selectedClassId, selectedSubjectId, nextDate);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceRosterEntry> = { ...rosterMap };
    classStudents.forEach((s) => {
      updated[s.id] = { remarks: updated[s.id]?.remarks || '', status };
    });
    setRosterMap(updated);
  };

  const handleInvert = () => {
    const updated: Record<string, AttendanceRosterEntry> = { ...rosterMap };
    classStudents.forEach((s) => {
      const current = updated[s.id]?.status || 'present';
      updated[s.id] = {
        remarks: updated[s.id]?.remarks || '',
        status: current === 'present' ? 'absent' : 'present',
      };
    });
    setRosterMap(updated);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRosterMap((prev) => ({
      ...prev,
      [studentId]: { remarks: prev[studentId]?.remarks || '', status },
    }));
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    setRosterMap((prev) => ({
      ...prev,
      [studentId]: { status: prev[studentId]?.status || 'present', remarks },
    }));
  };

  const handleSaveAttendance = async () => {
    setSaveError(null);
    setSaveSuccessMsg(null);

    if (!currentUser || saving) return;
    if (classStudents.length === 0) {
      const msg = 'No students enrolled in this class to mark.';
      setSaveError(msg);
      toast({ variant: 'error', title: 'Cannot save attendance', description: msg });
      return;
    }

    setSaving(true);
    try {
      const savedId = await attendanceService.saveSessionAttendance({
        existingSessionId: activeSessionId,
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        teacherId,
        date: sessionDate,
        startTime,
        endTime,
        sessionType,
        students: classStudents,
        rosterMap,
        actorUser: currentUser,
      });

      setActiveSessionId(savedId);
      const msg = `Attendance saved for ${classStudents.length} students on ${sessionDate}.`;
      setSaveSuccessMsg(msg);
      toast({
        variant: 'success',
        title: 'Attendance sheet saved',
        description: msg,
      });
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to save attendance record.';
      setSaveError(msg);
      toast({ variant: 'error', title: 'Save failed', description: msg });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = classStudents.filter((s) => {
    const matchesSearch =
      s.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(searchTerm.toLowerCase());

    const currentStatus = rosterMap[s.id]?.status || 'present';
    const matchesStatus =
      statusFilter === 'all' || currentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const summary = summarizeRoster(rosterMap, classStudents.length);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mark Lecture Attendance"
        badge={
          activeSessionId ? (
            <Badge variant="info" dot>
              Editing Session
            </Badge>
          ) : (
            <Badge variant="neutral">New Session</Badge>
          )
        }
        description="Record individual or bulk student attendance with duplicate session detection and audit logging"
        actions={
          <Button
            variant="primary"
            leftIcon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSaveAttendance}
            isLoading={saving}
          >
            Save Sheet
          </Button>
        }
      />

      {saveSuccessMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session Configuration</CardTitle>
          {activeSessionId && (
            <span className="text-[11px] font-mono text-muted">
              ID: {activeSessionId}
            </span>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              label="Target Section"
              required
              value={selectedClassId}
              disabled={saving}
              onChange={(e) => handleClassChange(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              label="Course Subject"
              required
              value={selectedSubjectId}
              disabled={saving}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              {subjects.filter((subject) => assignments.some((assignment) => assignment.class_id === selectedClassId && assignment.subject_id === subject.id)).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </Select>

            <DatePicker
              label="Session Date"
              required
              value={sessionDate}
              disabled={saving}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <Select label="Attendance session" value={activeSessionId ?? ''} disabled={saving}
              onChange={(event) => loadSessionContext(selectedClassId, selectedSubjectId, sessionDate, event.target.value)}>
              <option value="">New session</option>
              {daySessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.start_time.slice(0, 5)} to {session.end_time.slice(0, 5)}
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <TimeInput
                label="Start"
                value={startTime}
                disabled={!!activeSessionId || saving}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <TimeInput
                label="End"
                value={endTime}
                disabled={!!activeSessionId || saving}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <Select
              label="Session Type"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as SessionType)}
            >
              <option value="lecture">Lecture (Theory)</option>
              <option value="lab">Practical Lab</option>
              <option value="tutorial">Tutorial</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-secondary">
              <Users className="w-3.5 h-3.5 text-muted" />
              Roster:{' '}
              <strong className="text-primary font-mono tabular-nums">
                {classStudents.length}
              </strong>
            </span>
            <Badge variant="success" dot>
              Present: {summary.present}
            </Badge>
            <Badge variant="danger" dot>
              Absent: {summary.absent}
            </Badge>
            <Badge variant="warning" dot>
              Leave: {summary.leave}
            </Badge>
          </div>

          <div className="flex items-center gap-3 min-w-[180px]">
            <span className="text-xs text-secondary whitespace-nowrap">
              Turnout:{' '}
              <strong className="font-mono text-primary tabular-nums">
                {summary.percentage}%
              </strong>
            </span>
            <ProgressBar
              value={summary.percentage}
              threshold={settings.threshold_percentage}
              warningThreshold={settings.warning_threshold}
              size="sm"
            />
          </div>
        </div>
      </Card>

      <FilterBar>
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Filter by student name or USN..."
            className="sm:max-w-xs"
          />
          <div className="w-full sm:w-44">
            <Select
              aria-label="Filter roster by status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'all' | 'present' | 'absent' | 'leave'
                )
              }
            >
              <option value="all">All Students ({classStudents.length})</option>
              <option value="present">Present ({summary.present})</option>
              <option value="absent">Absent ({summary.absent})</option>
              <option value="leave">On Leave ({summary.leave})</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
            onClick={() => handleMarkAll('present')}
          >
            All Present
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<X className="w-3.5 h-3.5 text-rose-600" />}
            onClick={() => handleMarkAll('absent')}
          >
            All Absent
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
            onClick={handleInvert}
          >
            Invert
          </Button>
        </div>
      </FilterBar>

      <Card className="overflow-hidden">
        <AttendanceRosterTable
          students={filteredStudents}
          rosterMap={rosterMap}
          onStatusChange={handleStatusChange}
          onRemarkChange={handleRemarkChange}
          getStudentHistoricalStats={(studentId) =>
            attendanceService.calculateStudentAttendance(studentId)
          }
          emptyMessage="No students found in this section matching the current filter."
        />

        <CardFooter className="flex-col sm:flex-row gap-3">
          <p className="text-xs text-secondary">
            Recorded by <strong className="font-medium text-primary">{currentUser?.name}</strong> with automated duplicate session validation.
          </p>
          <Button
            type="button"
            variant="primary"
            leftIcon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSaveAttendance}
            isLoading={saving}
          >
            Save Attendance Sheet
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
