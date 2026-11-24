import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Plus } from 'lucide-react';
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
} from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { attendanceService } from '../../../services/attendance.service';
import { academicsService } from '../../../services/academics.service';
import { settingsService } from '../../../services/settings.service';
import {
  Badge,
  Button,
  DataTable,
  FilterBar,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Textarea,
  type DataColumn,
} from '../../../components/ui';
import { SessionRosterModal } from '../components/SessionRosterModal';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';
import { ROUTES } from '../../../app/config/navigation';
import { cn } from '../../../lib/cn';

interface EnrichedSessionRow {
  session: AttendanceSession;
  subjectName: string;
  subjectCode: string;
  className: string;
  presentCount: number;
  totalCount: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'low';
}

export const TeacherHistoryPage: React.FC = () => {
  useDatabaseVersion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, currentTeacher } = useAuth();
  const teacherId =
    currentTeacher?.id || INSTITUTION_CONFIG.academicDefaults.defaultTeacherId;
  const settings = settingsService.getSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'low'>('all');
  const [inspectSession, setInspectSession] = useState<AttendanceSession | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('present');
  const [editReason, setEditReason] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  const sessions = attendanceService.getSessions({ teacher_id: teacherId });
  const classes = academicsService.getClasses();
  const subjects = academicsService.getSubjects();

  const inspectRecords = inspectSession
    ? attendanceService.getEnrichedSessionRecords(inspectSession.id)
    : [];

  const rows = useMemo<EnrichedSessionRow[]>(() => {
    return sessions
      .map((sess) => {
        const sub = subjects.find((s) => s.id === sess.subject_id);
        const cls = classes.find((c) => c.id === sess.class_id);
        const records = attendanceService.getRecords(sess.id);
        const presentCount = records.filter((r) => r.status === 'present').length;
        const percentage =
          records.length > 0
            ? Math.round((presentCount / records.length) * 100)
            : 0;
        const status: EnrichedSessionRow['status'] =
          percentage < settings.threshold_percentage
            ? 'low'
            : percentage < settings.warning_threshold
            ? 'warning'
            : 'healthy';

        return {
          session: sess,
          subjectName: sub?.name || sess.subject_id,
          subjectCode: sub?.code || '',
          className: cls?.name || sess.class_id,
          presentCount,
          totalCount: records.length,
          percentage,
          status,
        };
      })
      .filter((row) => {
        const matchesSubject =
          subjectFilter === 'all' || row.session.subject_id === subjectFilter;
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'low' && row.status === 'low') ||
          (statusFilter === 'healthy' && row.status !== 'low');
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          row.subjectName.toLowerCase().includes(q) ||
          row.subjectCode.toLowerCase().includes(q) ||
          row.className.toLowerCase().includes(q) ||
          row.session.date.includes(q);
        return matchesSubject && matchesStatus && matchesQuery;
      });
  }, [
    sessions,
    subjects,
    classes,
    subjectFilter,
    statusFilter,
    searchQuery,
    settings.threshold_percentage,
    settings.warning_threshold,
  ]);

  const distinctSubjectIds = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.subject_id))),
    [sessions]
  );

  const handleStartEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditStatus(rec.status);
    setEditReason(rec.remarks || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !currentUser) return;

    if (!editReason.trim()) {
      setEditError('Please enter a justification for modifying this record.');
      return;
    }

    try {
      await attendanceService.correctSingleRecord(
        editingRecord.session_id,
        editingRecord.student_id,
        editStatus,
        editReason,
        currentUser
      );
      setEditingRecord(null);
      toast({
        variant: 'success',
        title: 'Attendance record updated',
        description: 'Adjustment saved to the audit trail.',
      });
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : 'Failed to update record'
      );
    }
  };

  const columns: DataColumn<EnrichedSessionRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (row) => row.subjectName,
      render: (row) => (
        <div>
          <p className="font-medium text-primary">{row.subjectName}</p>
          <p className="text-xs text-secondary tabular-nums">{row.subjectCode}</p>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      sortValue: (row) => row.className,
      render: (row) => <span className="text-primary">{row.className}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (row) => `${row.session.date}-${row.session.start_time}`,
      render: (row) => (
        <div className="tabular-nums">
          <p className="text-primary">{row.session.date}</p>
          <p className="text-xs text-secondary">
            {row.session.start_time}–{row.session.end_time}
          </p>
        </div>
      ),
    },
    {
      key: 'turnout',
      header: 'Turnout',
      sortValue: (row) => row.percentage,
      render: (row) => (
        <span className="tabular-nums font-medium text-primary">
          {row.presentCount}/{row.totalCount}{' '}
          <span className="text-secondary font-normal">({row.percentage}%)</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.percentage,
      render: (row) => (
        <Badge
          variant={
            row.status === 'low'
              ? 'danger'
              : row.status === 'warning'
              ? 'warning'
              : 'success'
          }
        >
          {row.status === 'low'
            ? 'Low'
            : row.status === 'warning'
            ? 'Warning'
            : 'Satisfactory'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button
          variant="outline"
          size="xs"
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          onClick={() => setInspectSession(row.session)}
        >
          Roster
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance records"
        description="Review conducted lecture sessions and log authorized attendance adjustments."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate(ROUTES.TEACHER_MARK)}
          >
            Take attendance
          </Button>
        }
      />

      <FilterBar>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <SearchInput
            label="Search records"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by subject, class, or date"
          />

          <Select
            label="Subject"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">All subjects</option>
            {distinctSubjectIds.map((subId) => {
              const sub = subjects.find((s) => s.id === subId);
              return (
                <option key={subId} value={subId}>
                  {sub ? `${sub.code} — ${sub.name}` : subId}
                </option>
              );
            })}
          </Select>

          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'healthy' | 'low')
            }
          >
            <option value="all">All statuses</option>
            <option value="healthy">Satisfactory</option>
            <option value="low">Below threshold</option>
          </Select>
        </div>
      </FilterBar>

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(row) => row.session.id}
        pageSize={10}
        stickyHeader
        selectable
        emptyTitle="No attendance records found"
        emptyDescription="Conducted lecture rosters matching your filters will appear here."
        renderMobileCard={(row) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-primary">
                  {row.subjectName}
                </p>
                <p className="text-xs text-secondary tabular-nums">
                  {row.subjectCode} • {row.className}
                </p>
              </div>
              <Badge
                variant={
                  row.status === 'low'
                    ? 'danger'
                    : row.status === 'warning'
                    ? 'warning'
                    : 'success'
                }
              >
                {row.percentage}%
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-secondary pt-1">
              <span className="tabular-nums">
                {row.session.date} • {row.presentCount}/{row.totalCount} present
              </span>
              <Button
                variant="outline"
                size="xs"
                leftIcon={<Eye className="w-3.5 h-3.5" />}
                onClick={() => setInspectSession(row.session)}
              >
                Roster
              </Button>
            </div>
          </div>
        )}
      />

      <SessionRosterModal
        session={inspectSession}
        classNameLabel={
          classes.find((c) => c.id === inspectSession?.class_id)?.name
        }
        subjectNameLabel={
          subjects.find((s) => s.id === inspectSession?.subject_id)?.name
        }
        records={inspectRecords}
        onClose={() => setInspectSession(null)}
        onEditRecord={handleStartEdit}
        showSummaryBadges={false}
      />

      {editingRecord && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRecord(null)}
          title="Attendance record correction"
          description="Update attendance status with a mandatory justification for the audit log."
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-md bg-white border border-red-300 text-xs text-red-700">
                {editError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-primary">
                Updated status <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['present', 'absent', 'leave'] as AttendanceStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEditStatus(st)}
                    className={cn(
                      'py-2 px-3 rounded-md border text-xs font-medium capitalize transition-colors',
                      editStatus === st
                        ? st === 'present'
                          ? 'bg-green-600 text-white border-green-600'
                          : st === 'absent'
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-primary border-border hover:bg-subtle'
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Justification"
              required
              rows={3}
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="e.g. Verified student medical certificate at department office."
            />

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingRecord(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save correction
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
