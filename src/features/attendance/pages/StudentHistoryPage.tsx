import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Printer, Download } from 'lucide-react';
import type { AttendanceSession, AttendanceStatus, Subject } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { studentsService } from '../../../services/students.service';
import { academicsService } from '../../../services/academics.service';
import { attendanceService } from '../../../services/attendance.service';
import { reportsService } from '../../../services/reports.service';
import {
  Badge,
  Button,
  DataTable,
  FilterBar,
  PageHeader,
  SearchInput,
  Select,
  type DataColumn,
} from '../../../components/ui';
import { ROUTES } from '../../../app/config/navigation';
import { INSTITUTION_CONFIG } from '../../../app/config/institution';
import { getTodayIsoDate } from '../../../lib/date';

interface StudentHistoryRow {
  session: AttendanceSession;
  subject?: Subject;
  status: AttendanceStatus;
  markedBy: string;
  remarks?: string;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  leave: 'On leave',
};

export const StudentHistoryPage: React.FC = () => {
  useDatabaseVersion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentStudent } = useAuth();
  const studentId =
    currentStudent?.id || INSTITUTION_CONFIG.academicDefaults.defaultStudentId;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const student = studentsService.getEnrichedStudent(studentId);
  const subjects = academicsService.getSubjects();

  const historyRecords = useMemo<StudentHistoryRow[]>(() => {
    const classSessions = student
      ? attendanceService.getSessions({ class_id: student.class_id })
      : [];
    const q = searchQuery.trim().toLowerCase();

    return classSessions
      .map((session) => {
        const rec = attendanceService.getStudentRecord(session.id, studentId);
        const subject = subjects.find((s) => s.id === session.subject_id);
        return {
          session,
          subject,
          status: (rec ? rec.status : 'absent') as AttendanceStatus,
          markedBy: rec ? rec.marked_by : 'teacher',
          remarks: rec ? rec.remarks : undefined,
        };
      })
      .filter((item) => {
        const matchesSubject =
          selectedSubjectId === 'all' || item.subject?.id === selectedSubjectId;
        const matchesStatus =
          selectedStatus === 'all' || item.status === selectedStatus;
        const matchesQuery =
          !q ||
          (item.subject?.code || '').toLowerCase().includes(q) ||
          (item.subject?.name || '').toLowerCase().includes(q) ||
          item.session.date.includes(q);
        return matchesSubject && matchesStatus && matchesQuery;
      });
  }, [
    student,
    studentId,
    subjects,
    selectedSubjectId,
    selectedStatus,
    searchQuery,
  ]);

  const handleExportMyHistory = () => {
    const today = getTodayIsoDate();
    const headers = [
      'Date',
      'Time Slot',
      'Subject Code',
      'Subject Title',
      'Session Type',
      'Attendance Status',
      'Marked Via',
      'Remarks',
    ];
    const rows = historyRecords.map((r) => [
      r.session.date,
      `${r.session.start_time} - ${r.session.end_time}`,
      r.subject?.code || '',
      r.subject?.name || '',
      r.session.session_type,
      STATUS_LABEL[r.status],
      r.markedBy,
      r.remarks || 'None',
    ]);
    reportsService.exportCSV(`My_Attendance_Log_${today}.csv`, headers, rows);
    toast({
      variant: 'success',
      title: 'Attendance log exported',
      description: `Downloaded ${historyRecords.length} session record(s) as CSV.`,
    });
  };

  const columns: DataColumn<StudentHistoryRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (row) => row.subject?.name || '',
      render: (row) => (
        <div>
          <p className="font-medium text-primary">{row.subject?.name}</p>
          <p className="text-xs text-secondary tabular-nums">{row.subject?.code}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (row) => `${row.session.date}-${row.session.start_time}`,
      render: (row) => (
        <span className="tabular-nums text-primary whitespace-nowrap">
          {row.session.date}
        </span>
      ),
    },
    {
      key: 'slot',
      header: 'Slot',
      render: (row) => (
        <span className="text-secondary tabular-nums capitalize">
          {row.session.start_time}–{row.session.end_time} ({row.session.session_type})
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Recorded via',
      render: (row) => (
        <span className="text-secondary">
          {row.markedBy === 'code'
            ? 'Session code'
            : row.markedBy === 'correction'
            ? 'Faculty correction'
            : 'Faculty roster'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <div>
          <Badge
            variant={
              row.status === 'present'
                ? 'success'
                : row.status === 'absent'
                ? 'danger'
                : 'warning'
            }
          >
            {STATUS_LABEL[row.status]}
          </Badge>
          {row.remarks && (
            <p className="text-xs text-secondary mt-0.5 max-w-xs truncate">
              {row.remarks}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        row.status === 'absent' ? (
          <Button
            variant="ghost"
            size="xs"
            leftIcon={<FileCheck2 className="w-3.5 h-3.5" />}
            onClick={() => navigate(ROUTES.STUDENT_CORRECTIONS)}
          >
            Dispute
          </Button>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance records"
        description="Review conducted lectures and your recorded attendance status."
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              variant="primary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportMyHistory}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <FilterBar>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <SearchInput
            label="Search records"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by subject or date"
          />

          <Select
            label="Subject"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </Select>

          <Select
            label="Status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">On leave</option>
          </Select>
        </div>
      </FilterBar>

      <DataTable
        data={historyRecords}
        columns={columns}
        keyExtractor={(row) => row.session.id}
        pageSize={12}
        stickyHeader
        emptyTitle="No attendance records found"
        emptyDescription="Adjust the subject or status filter to inspect past sessions."
        renderMobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-primary">
                  {row.subject?.name}
                </p>
                <p className="text-xs text-secondary tabular-nums mt-0.5">
                  {row.subject?.code} • {row.session.date} ({row.session.start_time})
                </p>
              </div>
              <Badge
                variant={
                  row.status === 'present'
                    ? 'success'
                    : row.status === 'absent'
                    ? 'danger'
                    : 'warning'
                }
              >
                {STATUS_LABEL[row.status]}
              </Badge>
            </div>
            {row.status === 'absent' && (
              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<FileCheck2 className="w-3.5 h-3.5" />}
                  onClick={() => navigate(ROUTES.STUDENT_CORRECTIONS)}
                >
                  Request correction
                </Button>
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
};
