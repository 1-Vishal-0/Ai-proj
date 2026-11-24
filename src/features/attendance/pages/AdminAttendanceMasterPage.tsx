import React, { useMemo, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import type { AttendanceSession } from '../../../types';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { academicsService } from '../../../services/academics.service';
import { facultyService } from '../../../services/faculty.service';
import { attendanceService } from '../../../services/attendance.service';
import { reportsService } from '../../../services/reports.service';
import { settingsService } from '../../../services/settings.service';
import { SessionRosterModal } from '../components/SessionRosterModal';
import {
  Badge,
  Button,
  DataTable,
  DatePicker,
  FilterBar,
  PageHeader,
  SearchInput,
  Select,
  type DataColumn,
} from '../../../components/ui';
import { getTodayIsoDate } from '../../../lib/date';

interface SessionRow {
  session: AttendanceSession;
  className: string;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  presentCount: number;
  totalCount: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'low';
}

export const AdminAttendanceMasterPage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const settings = settingsService.getSettings();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [inspectSession, setInspectSession] =
    useState<AttendanceSession | null>(null);

  const classes = academicsService.getClasses();
  const subjects = academicsService.getSubjects();
  const teachers = facultyService.getEnrichedTeachers();

  const rawSessions = attendanceService.getSessions({
    class_id: selectedClass !== 'all' ? selectedClass : undefined,
    subject_id: selectedSubject !== 'all' ? selectedSubject : undefined,
    date: selectedDate || undefined,
  });

  const rows: SessionRow[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rawSessions
      .map((sess) => {
        const cls = classes.find((c) => c.id === sess.class_id);
        const sub = subjects.find((s) => s.id === sess.subject_id);
        const teacher = teachers.find((t) => t.id === sess.teacher_id);
        const records = attendanceService.getRecords(sess.id);
        const presentCount = records.filter((r) => r.status === 'present').length;
        const percentage =
          records.length > 0
            ? Math.round((presentCount / records.length) * 100)
            : 0;
        const status: SessionRow['status'] =
          percentage < settings.threshold_percentage
            ? 'low'
            : percentage < settings.warning_threshold
            ? 'warning'
            : 'healthy';

        return {
          session: sess,
          className: cls?.name || sess.class_id,
          subjectCode: sub?.code || '',
          subjectName: sub?.name || sess.subject_id,
          teacherName: teacher?.user.name || 'Assigned faculty',
          presentCount,
          totalCount: records.length,
          percentage,
          status,
        };
      })
      .filter((r) => {
        if (!q) return true;
        return (
          r.className.toLowerCase().includes(q) ||
          r.subjectCode.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q) ||
          r.teacherName.toLowerCase().includes(q) ||
          r.session.date.includes(q)
        );
      });
  }, [
    rawSessions,
    classes,
    subjects,
    teachers,
    searchQuery,
    settings.threshold_percentage,
    settings.warning_threshold,
  ]);

  const inspectRecords = inspectSession
    ? attendanceService.getEnrichedSessionRecords(inspectSession.id)
    : [];

  const handleExportSessions = () => {
    const today = getTodayIsoDate();
    reportsService.exportCSV(
      `Attendance_Records_${today}.csv`,
      ['Date', 'Slot', 'Class', 'Subject Code', 'Subject', 'Faculty', 'Present', 'Total', 'Turnout %'],
      rows.map((r) => [
        r.session.date,
        `${r.session.start_time}-${r.session.end_time}`,
        r.className,
        r.subjectCode,
        r.subjectName,
        r.teacherName,
        r.presentCount,
        r.totalCount,
        `${r.percentage}%`,
      ])
    );
    toast({
      variant: 'success',
      title: 'Attendance records exported',
      description: `Exported ${rows.length} session record(s) to CSV.`,
    });
  };

  const columns: DataColumn<SessionRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (r) => r.subjectName,
      render: (r) => (
        <div>
          <p className="font-medium text-primary">{r.subjectName}</p>
          <p className="text-xs text-secondary tabular-nums">{r.subjectCode}</p>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      sortValue: (r) => r.className,
      render: (r) => <span className="text-primary">{r.className}</span>,
    },
    {
      key: 'teacher',
      header: 'Faculty',
      sortValue: (r) => r.teacherName,
      render: (r) => <span className="text-secondary">{r.teacherName}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (r) => `${r.session.date}-${r.session.start_time}`,
      render: (r) => (
        <div className="tabular-nums">
          <p className="text-primary">{r.session.date}</p>
          <p className="text-xs text-secondary">
            {r.session.start_time}–{r.session.end_time}
          </p>
        </div>
      ),
    },
    {
      key: 'turnout',
      header: 'Turnout',
      sortValue: (r) => r.percentage,
      render: (r) => (
        <span className="tabular-nums text-primary font-medium">
          {r.presentCount}/{r.totalCount}{' '}
          <span className="text-secondary font-normal">({r.percentage}%)</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.percentage,
      render: (r) => (
        <Badge
          variant={
            r.status === 'low'
              ? 'danger'
              : r.status === 'warning'
              ? 'warning'
              : 'success'
          }
        >
          {r.status === 'low'
            ? 'Low'
            : r.status === 'warning'
            ? 'Warning'
            : 'Satisfactory'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <Button
          size="xs"
          variant="outline"
          onClick={() => setInspectSession(r.session)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
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
        description="Manage and review academic attendance records across all sections."
        actions={
          <Button
            variant="primary"
            onClick={handleExportSessions}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
        }
      />

      <FilterBar>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          <SearchInput
            label="Search records"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search subject, class, or faculty"
          />

          <Select
            label="Class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </Select>

          <DatePicker
            label="Session date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onClear={() => setSelectedDate('')}
          />
        </div>
      </FilterBar>

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(r) => r.session.id}
        pageSize={10}
        stickyHeader
        selectable
        renderMobileCard={(r) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-primary">
                  {r.subjectName}
                </p>
                <p className="text-xs text-secondary tabular-nums">
                  {r.subjectCode} • {r.className}
                </p>
              </div>
              <Badge
                variant={
                  r.status === 'low'
                    ? 'danger'
                    : r.status === 'warning'
                    ? 'warning'
                    : 'success'
                }
              >
                {r.percentage}%
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-secondary pt-1">
              <span className="tabular-nums">
                {r.session.date} • {r.presentCount}/{r.totalCount} present
              </span>
              <Button
                size="xs"
                variant="outline"
                onClick={() => setInspectSession(r.session)}
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
        showSummaryBadges
      />
    </div>
  );
};
