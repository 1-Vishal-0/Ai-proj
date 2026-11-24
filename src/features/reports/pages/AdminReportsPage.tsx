import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useDatabaseVersion } from '../../../hooks/useDatabase';
import { useToast } from '../../../hooks/useToast';
import { academicsService } from '../../../services/academics.service';
import { reportsService } from '../../../services/reports.service';
import {
  Badge,
  Button,
  DataTable,
  FilterBar,
  Input,
  PageHeader,
  ProgressBar,
  Select,
  Tabs,
  type DataColumn,
} from '../../../components/ui';

type AdminReportType = 'student' | 'low-attendance' | 'class' | 'subject';

export const AdminReportsPage: React.FC = () => {
  useDatabaseVersion();
  const { toast } = useToast();
  const [reportType, setReportType] = useState<AdminReportType>('student');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [thresholdInput, setThresholdInput] = useState<number>(75);

  const classes = academicsService.getClasses();
  const departments = academicsService.getDepartments();

  const studentRows = reportsService.getStudentReportRows({
    classId: selectedClassId,
    deptId: selectedDeptId,
    threshold: thresholdInput,
  });
  const lowAttendanceRows =
    reportsService.getLowAttendanceReportRows(thresholdInput);
  const classRows = reportsService.getClassReportRows();
  const subjectRows = reportsService.getSubjectReportRows();

  const handleExportCSV = () => {
    reportsService.exportAdminReportCSV(reportType, {
      classId: selectedClassId,
      deptId: selectedDeptId,
      threshold: thresholdInput,
    });
    toast({
      variant: 'success',
      title: 'CSV report exported',
      description: 'RFC 4180 compliant report downloaded.',
    });
  };

  type StudentRow = (typeof studentRows)[number];
  type LowRow = (typeof lowAttendanceRows)[number];
  type ClassRow = (typeof classRows)[number];
  type SubjectRow = (typeof subjectRows)[number];

  const studentCols: DataColumn<StudentRow>[] = [
    {
      key: 'roll',
      header: 'USN / Roll',
      sortValue: (r) => r.rollNumber,
      render: (r) => (
        <span className="font-mono font-semibold text-brand-600">
          {r.rollNumber}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Student',
      sortValue: (r) => r.name,
      render: (r) => <span className="font-medium text-primary">{r.name}</span>,
    },
    {
      key: 'class',
      header: 'Class',
      render: (r) => <span className="text-secondary">{r.class}</span>,
    },
    {
      key: 'present',
      header: 'Attended',
      align: 'center',
      sortValue: (r) => r.present,
      render: (r) => (
        <span className="font-mono tabular-nums">
          {r.present} / {r.total}
        </span>
      ),
    },
    {
      key: 'absent',
      header: 'Absent',
      align: 'center',
      sortValue: (r) => r.absent,
      render: (r) => (
        <span className="font-mono text-rose-600 tabular-nums">
          {r.absent}
        </span>
      ),
    },
    {
      key: 'pct',
      header: 'Attendance',
      sortValue: (r) => r.percentage,
      render: (r) => (
        <div className="w-32 space-y-1 tabular-nums">
          <span className="font-mono font-semibold">{r.percentage}%</span>
          <ProgressBar value={r.percentage} threshold={thresholdInput} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Standing',
      align: 'right',
      render: (r) =>
        r.percentage < thresholdInput ? (
          <Badge variant="danger" dot>
            Shortage
          </Badge>
        ) : (
          <Badge variant="success" dot>
            Eligible
          </Badge>
        ),
    },
  ];

  const lowCols: DataColumn<LowRow>[] = [
    {
      key: 'roll',
      header: 'USN / Roll',
      sortValue: (r) => r.rollNumber,
      render: (r) => (
        <span className="font-mono font-semibold text-rose-600">
          {r.rollNumber}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Student',
      sortValue: (r) => r.name,
      render: (r) => <span className="font-medium text-primary">{r.name}</span>,
    },
    {
      key: 'class',
      header: 'Class',
      render: (r) => <span className="text-secondary">{r.class}</span>,
    },
    {
      key: 'guardian',
      header: 'Guardian Phone',
      render: (r) => (
        <span className="font-mono text-secondary">{r.guardianPhone}</span>
      ),
    },
    {
      key: 'attended',
      header: 'Attended',
      align: 'center',
      render: (r) => (
        <span className="font-mono tabular-nums">
          {r.attended} / {r.totalClasses}
        </span>
      ),
    },
    {
      key: 'pct',
      header: 'Current %',
      align: 'right',
      sortValue: (r) => r.percentage,
      render: (r) => <Badge variant="danger">{r.percentage}%</Badge>,
    },
    {
      key: 'deficit',
      header: 'Required Classes',
      align: 'right',
      render: (r) => (
        <Badge variant="warning">
          +{Number.isFinite(r.deficit) ? r.deficit : 'N/A'} lectures
        </Badge>
      ),
    },
  ];

  const classCols: DataColumn<ClassRow>[] = [
    {
      key: 'name',
      header: 'Class Batch',
      sortValue: (r) => r.className,
      render: (r) => <span className="font-medium text-primary">{r.className}</span>,
    },
    {
      key: 'dept',
      header: 'Department',
      render: (r) => <span className="text-secondary">{r.department}</span>,
    },
    {
      key: 'sem',
      header: 'Semester',
      sortValue: (r) => r.semester,
      render: (r) => <Badge variant="neutral">Sem {r.semester}</Badge>,
    },
    {
      key: 'students',
      header: 'Students',
      align: 'center',
      sortValue: (r) => r.studentCount,
      render: (r) => (
        <span className="font-mono tabular-nums">{r.studentCount}</span>
      ),
    },
    {
      key: 'sessions',
      header: 'Avg Sessions',
      align: 'center',
      render: (r) => (
        <span className="font-mono tabular-nums">{r.sessionsConducted}</span>
      ),
    },
    {
      key: 'avg',
      header: 'Average Turnout',
      align: 'right',
      sortValue: (r) => r.averageAttendance,
      render: (r) => (
        <span className="font-mono font-semibold text-brand-600 tabular-nums">
          {r.averageAttendance}%
        </span>
      ),
    },
  ];

  const subjectCols: DataColumn<SubjectRow>[] = [
    {
      key: 'code',
      header: 'Code',
      sortValue: (r) => r.code,
      render: (r) => (
        <span className="font-mono font-semibold text-brand-600">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Course Title',
      sortValue: (r) => r.name,
      render: (r) => <span className="font-medium text-primary">{r.name}</span>,
    },
    {
      key: 'dept',
      header: 'Department',
      render: (r) => <Badge variant="neutral">{r.department}</Badge>,
    },
    {
      key: 'credits',
      header: 'Credits',
      align: 'center',
      render: (r) => <span className="font-mono">{r.credits}</span>,
    },
    {
      key: 'sessions',
      header: 'Sessions Held',
      align: 'center',
      sortValue: (r) => r.sessionsCount,
      render: (r) => <span className="font-mono tabular-nums">{r.sessionsCount}</span>,
    },
    {
      key: 'turnout',
      header: 'Turnout %',
      align: 'right',
      sortValue: (r) => r.turnoutPercentage,
      render: (r) => (
        <span className="font-mono font-semibold tabular-nums">
          {r.turnoutPercentage}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports & Export"
        description="Audit-ready institutional attendance summaries, shortage lists and RFC 4180 CSV downloads"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => window.print()}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              Print
            </Button>
            <Button
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <FilterBar>
        <Tabs<AdminReportType>
          value={reportType}
          onChange={setReportType}
          options={[
            { value: 'student', label: 'Student-Wise', count: studentRows.length },
            {
              value: 'low-attendance',
              label: 'Shortage List',
              count: lowAttendanceRows.length,
            },
            { value: 'class', label: 'By Class', count: classRows.length },
            { value: 'subject', label: 'By Subject', count: subjectRows.length },
          ]}
        />

        {reportType === 'student' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full md:w-auto">
            <Select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              aria-label="Filter by class"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {reportType === 'low-attendance' && (
          <div className="w-36">
            <Input
              type="number"
              min={1}
              max={100}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(Number(e.target.value))}
              rightElement={<span className="text-xs font-mono">%</span>}
              aria-label="Threshold percentage cutoff"
            />
          </div>
        )}
      </FilterBar>

      {reportType === 'student' && (
        <DataTable
          data={studentRows}
          columns={studentCols}
          keyExtractor={(r) => r.rollNumber}
          pageSize={12}
        />
      )}

      {reportType === 'low-attendance' && (
        <DataTable
          data={lowAttendanceRows}
          columns={lowCols}
          keyExtractor={(r) => r.rollNumber}
          pageSize={12}
          emptyTitle="No students below threshold"
        />
      )}

      {reportType === 'class' && (
        <DataTable
          data={classRows}
          columns={classCols}
          keyExtractor={(r) => r.className}
          pageSize={12}
        />
      )}

      {reportType === 'subject' && (
        <DataTable
          data={subjectRows}
          columns={subjectCols}
          keyExtractor={(r) => r.code}
          pageSize={12}
        />
      )}
    </div>
  );
};
